// Deterministic stub LLM server for trying agent frameworks without an API key or network.
// Speaks the OpenAI Chat Completions API (streaming and not), the OpenAI Responses API (not streaming),
// and the Anthropic Messages API (streaming and not). Behaviour is scripted and identical everywhere:
//   1. If the request offers tools and no tool result is present yet, reply with ONE tool call:
//      get_weather {"city":"Pune"}   (or the first offered tool, with {} if it is not get_weather)
//   2. Once a tool result is present in the conversation, reply with the text:
//      "It is 31 C and clear in Pune."
//   3. With no tools offered, reply with the same text.
// Run:  node server.mjs [port]        (default 8089)    Log of every request: GET /_log
import http from "node:http";

const port = Number(process.argv[2] || process.env.PORT || 8089);
const FINAL = "It is 31 C and clear in Pune.";
const log = [];

const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const sse = (res, events) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  for (const [event, data] of events) res.write(`${event ? `event: ${event}\n` : ""}data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
  res.end();
};

function pickTool(tools, nameOf) {
  const names = (tools ?? []).map(nameOf);
  const name = names.includes("get_weather") ? "get_weather" : names[0];
  return { name, args: name === "get_weather" ? { city: "Pune" } : {} };
}

function openaiChat(req, res, body) {
  const hasResult = (body.messages ?? []).some(m => m.role === "tool" || m.role === "function");
  const tools = body.tools ?? [];
  const id = "chatcmpl-stub", created = 1_700_000_000, model = body.model ?? "stub";
  const usage = { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 };
  if (tools.length && !hasResult) {
    const t = pickTool(tools, x => x.function?.name ?? x.name);
    const call = { id: "call_stub_1", type: "function", function: { name: t.name, arguments: JSON.stringify(t.args) } };
    if (body.stream) return sse(res, [
      [null, { id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", tool_calls: [{ index: 0, ...call }] }, finish_reason: null }] }],
      [null, { id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }], usage }],
      [null, "[DONE]"]]);
    return json(res, 200, { id, object: "chat.completion", created, model, choices: [{ index: 0, message: { role: "assistant", content: null, tool_calls: [call] }, finish_reason: "tool_calls" }], usage });
  }
  if (body.stream) return sse(res, [
    [null, { id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", content: FINAL }, finish_reason: null }] }],
    [null, { id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage }],
    [null, "[DONE]"]]);
  return json(res, 200, { id, object: "chat.completion", created, model, choices: [{ index: 0, message: { role: "assistant", content: FINAL }, finish_reason: "stop" }], usage });
}

function openaiResponses(req, res, body) {
  const items = Array.isArray(body.input) ? body.input : [];
  const hasResult = items.some(i => i.type === "function_call_output");
  const tools = body.tools ?? [];
  const base = { id: "resp_stub", object: "response", created_at: 1_700_000_000, status: "completed", model: body.model ?? "stub", usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 } };
  if (tools.length && !hasResult) {
    const t = pickTool(tools, x => x.name ?? x.function?.name);
    return json(res, 200, { ...base, output: [{ type: "function_call", id: "fc_stub_1", call_id: "call_stub_1", name: t.name, arguments: JSON.stringify(t.args), status: "completed" }] });
  }
  return json(res, 200, { ...base, output: [{ type: "message", id: "msg_stub", role: "assistant", status: "completed", content: [{ type: "output_text", text: FINAL, annotations: [] }] }], output_text: FINAL });
}

function anthropicMessages(req, res, body) {
  const blocks = (body.messages ?? []).flatMap(m => Array.isArray(m.content) ? m.content : []);
  const hasResult = blocks.some(b => b.type === "tool_result");
  const tools = body.tools ?? [];
  const usage = { input_tokens: 20, output_tokens: 10 };
  const model = body.model ?? "stub";
  if (tools.length && !hasResult) {
    const t = pickTool(tools, x => x.name);
    const block = { type: "tool_use", id: "toolu_stub_1", name: t.name, input: t.args };
    const msg = { id: "msg_stub", type: "message", role: "assistant", model, content: [block], stop_reason: "tool_use", stop_sequence: null, usage };
    if (body.stream) return sse(res, [
      ["message_start", { type: "message_start", message: { ...msg, content: [], stop_reason: null } }],
      ["content_block_start", { type: "content_block_start", index: 0, content_block: { ...block, input: {} } }],
      ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(t.args) } }],
      ["content_block_stop", { type: "content_block_stop", index: 0 }],
      ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 10 } }],
      ["message_stop", { type: "message_stop" }]]);
    return json(res, 200, msg);
  }
  const msg = { id: "msg_stub", type: "message", role: "assistant", model, content: [{ type: "text", text: FINAL }], stop_reason: "end_turn", stop_sequence: null, usage };
  if (body.stream) return sse(res, [
    ["message_start", { type: "message_start", message: { ...msg, content: [], stop_reason: null } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: FINAL } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 10 } }],
    ["message_stop", { type: "message_stop" }]]);
  return json(res, 200, msg);
}

http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/_log") return json(res, 200, log);
  if (req.method === "GET" && /\/models$/.test(req.url)) return json(res, 200, { object: "list", data: [{ id: "stub", object: "model" }] });
  let data = "";
  req.on("data", c => (data += c));
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(data || "{}"); } catch { return json(res, 400, { error: { message: "invalid json" } }); }
    log.push({ path: req.url, model: body.model, tools: (body.tools ?? []).map(t => t.function?.name ?? t.name), messages: (body.messages ?? body.input ?? []).length });
    const path = req.url.split("?")[0];
    if (path.endsWith("/chat/completions")) return openaiChat(req, res, body);
    if (path.endsWith("/responses")) return openaiResponses(req, res, body);
    if (path.endsWith("/messages")) return anthropicMessages(req, res, body);
    json(res, 404, { error: { message: `stub: unknown path ${path}` } });
  });
}).listen(port, "127.0.0.1", () => console.log(`stub LLM on http://127.0.0.1:${port}  (OpenAI chat+responses at /v1, Anthropic at /v1/messages)`));
