// Offline regression test for the weekly job's failure handling. It uses a local stub for the inference API and an
// injected author function, so it needs no network, no API key, and no PDF tooling. Run: node test-weekly-resilience.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "weekly-resilience-"));
process.env.LEARNING_REPO_ROOT = tmp;
// Isolate from the workflow environment: the weekly workflow sets these, and the tests must not read or write the real
// part cache or append to the real job summary.
for (const name of ["TUTORIAL_CACHE_DIR", "WEEKLY_PR_BODY_PATH", "GITHUB_STEP_SUMMARY", "DIGITALOCEAN_MODEL_ID"]) delete process.env[name];
process.env.MODEL_ACCESS_KEY = "test-key";
process.env.REQUIRE_THOROUGH_TUTORIALS = "true"; // as in CI
process.env.TUTORIAL_REQUEST_INTERVAL_MS = "0";
process.env.TUTORIAL_RETRY_BASE_MS = "10";
process.env.TUTORIAL_REQUEST_TIMEOUT_MS = "150";

// ---- stub inference server -------------------------------------------------------------------------------------
let behaviour = () => ({ status: 200, body: { choices: [{ message: { content: "ok" } }] } });
// GET /v1/models: by default the API does not support listing, so the client falls back to its built-in candidates.
let modelsResponse = () => ({ status: 404, body: { error: "no models endpoint" } });
const calls = [];
const server = http.createServer((req, res) => {
  let data = "";
  req.on("data", chunk => (data += chunk));
  req.on("end", () => {
    if (req.method === "GET" && req.url.endsWith("/models")) {
      const listed = modelsResponse();
      res.writeHead(listed.status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(listed.body));
    }
    const body = JSON.parse(data || "{}");
    calls.push({ url: req.url, model: body.model });
    const result = behaviour({ url: req.url, model: body.model, n: calls.length });
    if (result.hang) return; // never answers: exercises the client timeout
    res.writeHead(result.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.body));
  });
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
process.env.DIGITALOCEAN_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;

const { createModelResponse, resetModelDiscovery, rankDiscoveredModels } = await import("./tutorial-authoring.mjs");
const { generate } = await import("./weekly-update.mjs");
const okBody = text => ({ status: 200, body: { choices: [{ message: { content: text } }] } });
const reset = () => { calls.length = 0; resetModelDiscovery(); modelsResponse = () => ({ status: 404, body: { error: "no models endpoint" } }); };

// 1. A model that hangs twice and then answers is retried on the same model, not abandoned.
reset();
behaviour = ({ n }) => (n <= 2 ? { hang: true } : okBody("recovered"));
let json = await createModelResponse("prompt");
assert.equal(json.choices[0].message.content, "recovered");
assert.equal(new Set(calls.map(c => c.model)).size, 1, "retried on the same model");
console.log("ok  timeouts are retried on the same model");

// 2. 5xx from the first model falls through to the next model.
reset();
behaviour = ({ model }) => (model === "llama-4-maverick" ? { status: 503, body: { error: "busy" } } : okBody(`from ${model}`));
json = await createModelResponse("prompt");
assert.match(json.choices[0].message.content, /from kimi-k2\.5/);
console.log("ok  persistent 5xx moves on to the next model");

// 3. Chat completions is the default; a model that only supports /responses is switched to it, once, and remembered.
reset();
process.env.DIGITALOCEAN_MODEL_ID = "mystery-model";
behaviour = ({ url }) => (url.endsWith("/chat/completions") ? { status: 400, body: { error: { message: "this model only supports the Responses API" } } } : { status: 200, body: { output_text: "via responses" } });
json = await createModelResponse("prompt");
assert.equal(json.output_text, "via responses");
assert.ok(calls[0].url.endsWith("/chat/completions") && calls[1].url.endsWith("/responses"), "tried chat first, then switched");
reset(); // clears learned endpoints too, so re-learn: second call should go straight to /responses
behaviour = ({ url }) => (url.endsWith("/chat/completions") ? { status: 400, body: { error: { message: "this model only supports the Responses API" } } } : { status: 200, body: { output_text: "via responses" } });
await createModelResponse("prompt"); calls.length = 0; await createModelResponse("prompt again");
assert.equal(calls.length, 1, "learned endpoint reused without another failed attempt");
assert.ok(calls[0].url.endsWith("/responses"));
delete process.env.DIGITALOCEAN_MODEL_ID;
console.log("ok  an endpoint mismatch switches once, in either direction, and is remembered");

// 3b. Discovery: the API's own model list is used and ranked; non-chat and proprietary models are never requested.
reset();
modelsResponse = () => ({ status: 200, body: { data: [{ id: "text-embedding-3-large" }, { id: "anthropic-claude-4-sonnet" }, { id: "qwen3-8b-instruct" }, { id: "llama-3.3-70b-instruct" }, { id: "whisper-large" }, { id: "qwen3-235b-a22b" }] } });
behaviour = ({ model }) => ({ status: 200, body: { choices: [{ message: { content: `from ${model}` } }] } });
json = await createModelResponse("prompt");
assert.equal(json.choices[0].message.content, "from llama-3.3-70b-instruct", "highest-ranked usable model is used first");
assert.ok(!calls.some(c => /embedding|claude|whisper/.test(c.model)), "non-chat and proprietary models are never requested");
assert.deepEqual(rankDiscoveredModels(["qwen3-8b-instruct", "qwen3-235b-a22b", "llama-3.3-70b-instruct", "anthropic-claude-4-sonnet", "text-embedding-3-large"]), ["llama-3.3-70b-instruct", "qwen3-235b-a22b", "qwen3-8b-instruct"], "large models rank above small ones; embedding and proprietary excluded");
assert.ok(rankDiscoveredModels(["anthropic-claude-4-sonnet", "qwen3-235b-a22b"], { allowProprietary: true }).includes("anthropic-claude-4-sonnet"), "proprietary allowed on request");
console.log("ok  discovered models are ranked; non-chat and proprietary models are skipped");

// 3c. If the listed models all fail, the error names them so the operator knows what to configure.
reset();
modelsResponse = () => ({ status: 200, body: { data: [{ id: "llama-3.3-70b-instruct" }] } });
process.env.TUTORIAL_MODEL_ROUNDS = "1";
behaviour = () => ({ status: 404, body: { error: { message: "model not found" } } });
await assert.rejects(createModelResponse("prompt"), err => /Models the key can list \(1\): llama-3\.3-70b-instruct/.test(err.message) && /DIGITALOCEAN_MODEL_ID/.test(err.message));
delete process.env.TUTORIAL_MODEL_ROUNDS;
console.log("ok  when every model fails, the error lists the models the key can see");

// 4. Everything failing eventually throws a clear error (bounded, not an endless loop).
reset();
process.env.TUTORIAL_MODEL_ROUNDS = "2";
process.env.TUTORIAL_ATTEMPTS_PER_MODEL = "2";
behaviour = () => ({ status: 500, body: { error: "down" } });
await assert.rejects(createModelResponse("prompt"), /No candidate DigitalOcean serverless model/);
delete process.env.TUTORIAL_MODEL_ROUNDS;
delete process.env.TUTORIAL_ATTEMPTS_PER_MODEL;
console.log("ok  total outage fails with a bounded, descriptive error");

// ---- weekly job isolation --------------------------------------------------------------------------------------
const entry = (id, title, summary) => `<entry><id>http://arxiv.org/abs/${id}v1</id><updated>2026-11-14T00:00:00Z</updated><published>2026-11-14T00:00:00Z</published><title>${title}</title><summary>${summary}</summary><author><name>A Author</name></author><category term="cs.CL"/></entry>`;
const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${[
  entry("2611.00001", "Scaling language model pretraining with a new transformer architecture", "A transformer language model with new pretrain and scaling and attention and token embedding methods."),
  entry("2611.00002", "Retrieval and reasoning prompt methods for fine-tuning adaptation", "Retrieval rag reasoning alignment fine-tuning prompt tool use memory inference adaptation."),
  entry("2611.00003", "A software repository benchmark for code evaluation", "Evaluation benchmark software code repository github safety hallucination swe.")
].join("")}</feed>`;
const feedFile = path.join(tmp, "feed.xml");
fs.writeFileSync(feedFile, feed);
const baseArgs = ["--feed-file=" + feedFile, "--week-ending=2026-11-14", "--skip-download"];
const parseArgs = argv => new Map(argv.map(x => { const [k, ...r] = x.split("="); return [k, r.length ? r.join("=") : true]; }));
process.env.WEEKLY_PR_BODY_PATH = path.join(tmp, "pr-body.md");

// 5. One paper failing does not discard the others.
const failing = async ({ paper }) => {
  if (paper.id === "2611.00002") throw new Error("2611.00002/prerequisites: failed quality checks after 3 attempts");
  return `## Tutorial 1\n\ntext for ${paper.id}\n\n## Tutorial 2\n\n## Tutorial 3\n`;
};
await generate({ args: parseArgs(baseArgs), author: failing });
const week = path.join(tmp, "weekly", "2026-11-14");
const metadata = JSON.parse(fs.readFileSync(path.join(week, "metadata.json"), "utf8"));
assert.deepEqual(metadata.map(x => x.id).sort(), ["2611.00001", "2611.00003"]);
assert.ok(fs.existsSync(path.join(week, "SKIPPED.md")), "SKIPPED.md written");
assert.match(fs.readFileSync(path.join(week, "SKIPPED.md"), "utf8"), /2611\.00002/);
assert.match(fs.readFileSync(path.join(tmp, "pr-body.md"), "utf8"), /Skipped \(1\)/);
for (const record of metadata) assert.ok(fs.existsSync(path.join(week, record.guide)), "guide file exists");
console.log("ok  one failing paper is skipped and the rest are kept");

// 6. If every paper fails the run fails loudly and writes nothing for that week.
fs.rmSync(path.join(tmp, "weekly"), { recursive: true, force: true });
await assert.rejects(generate({ args: parseArgs(baseArgs), author: async () => { throw new Error("model down"); } }), /Every selected paper failed/);
assert.ok(!fs.existsSync(path.join(tmp, "weekly", "2026-11-14", "metadata.json")), "no partial week recorded");
console.log("ok  total failure fails the job and records nothing");

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log("weekly resilience tests passed");
