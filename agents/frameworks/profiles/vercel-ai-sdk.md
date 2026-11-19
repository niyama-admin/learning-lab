# Vercel AI SDK

A TypeScript toolkit that gives one calling convention for many model providers, tool calling, streaming, structured output and chat-UI plumbing, plus a small agent class (`ToolLoopAgent`) that runs the model-and-tool loop for you. Covered here as of 2026-11-19, major version 7.

| Field | Value |
|---|---|
| Package | `ai` (core), plus provider packages `@ai-sdk/*` |
| Version covered | `ai@7.0.177`, `@ai-sdk/openai@4.0.121`, `@ai-sdk/openai-compatible@3.0.93`, `@ai-sdk/mcp@2.0.101` |
| Language | TypeScript / JavaScript (ESM only, Node 22 or later) |
| Fit for an agent runtime | A model-and-tool-loop layer, not a runtime. You still build sessions, permissions policy, sandboxing, compaction. |

## Snapshot

| Row | Value | Evidence |
|---|---|---|
| Current version and date | `ai@7.0.177`, published 2026-11-18. Major 7.0.0 published 2026-06-25. | [ran] `npm view ai`; npm registry `time` field |
| Previous majors | 6.0.0 on 2025-12-22; 5.0.0 on 2025-07-31; 4.0.0 on 2024-11-18 | [ran] `npm view ai time` |
| dist-tags | `latest` = 7.0.177; `ai-v6` = 6.0.333; `ai-v5` = 5.0.291; `beta` and `canary` point at a 7.x line (`7.0.0-beta.187`, `7.0.0-canary.176`) | [ran] `npm view ai dist-tags` |
| License | Apache-2.0 (LICENSE file begins "Copyright 2023 Vercel, Inc. Licensed under the Apache License, Version 2.0") | [source] `node_modules/ai/LICENSE`, package metadata |
| Maintainer | Vercel, Inc. Repository `github.com/vercel/ai`; about 28,000 GitHub stars at the time of the check | [source] package.json `repository`; [ran] `gh api repos/vercel/ai` (stars 28079, last push 2026-11-19) |
| Languages | TypeScript/JavaScript only. No Python or Go port by the maintainer. | [docs] shipped docs cover only TS frameworks; absence of a port is [unverified] beyond that |
| Docs | https://ai-sdk.dev/docs (the same MDX files ship inside the npm package under `node_modules/ai/docs/`) | [source] package contents |
| Release cadence | Patch releases roughly daily. `ai` went through 7.0.177 in about five months. Companion packages (`@ai-sdk/gateway`, `@ai-sdk/workflow`) release on the same day. | [ran] npm times; [source] `CHANGELOG.md` |
| Breaking-change history, 7.0 | Node 18 and 20 dropped (Node 22+ required, tested on 22, 24, 26); CommonJS dropped (ESM only); `stepCountIs` renamed `isStepCount`; `experimental_context` became `context`; `experimental_onToolCallFinish` became `onToolExecutionEnd`; telemetry moved out of `ai` into `@ai-sdk/otel` plus `registerTelemetry`; the MCP HTTP transport `redirect` default changed from `'follow'` to `'error'`; many `experimental_*` names promoted or removed. The guide ships codemods. | [source] `node_modules/ai/docs/08-migration-guides/23-migration-guide-7-0.mdx` |
| Breaking-change history, 6.0 | `Experimental_Agent` became `ToolLoopAgent`; `CoreMessage` removed; `generateObject` / `streamObject` deprecated in favour of `output` on `generateText` / `streamText`; `ToolCallOptions` became `ToolExecutionOptions`; tool-part approval states and helper renames; per-tool strict mode added. Provider packages moved to `^3.0.0`. | [source] `docs/08-migration-guides/24-migration-guide-6-0.mdx` |
| Versioning policy | Major means breaking; APIs prefixed `experimental_` can change in any release; "Minor" is used for marketing-style feature announcements, not semver minor. | [source] `docs/08-migration-guides/00-versioning.mdx` |
| Status | Active, the default choice of the TypeScript ecosystem for model plumbing. No successor. Harness and workflow packages are marked experimental (see below). | [source] docs; [ran] release dates |

A major version arrives every four to eight months, each with a migration guide and codemods. Pin the exact `ai` and `@ai-sdk/*` versions together, because the provider packages are versioned against an internal provider specification (v7 uses `LanguageModelV4`, observed through the `MockLanguageModelV4` test helper [source]) and a mismatch fails at runtime. A troubleshooting page titled "unsupported model version" ships in the docs for exactly this [source: `docs/09-troubleshooting/19-unsupported-model-version.mdx`, title only].

## What it is, in terms of the runtime loop

The AI SDK has three layers. Core (`generateText`, `streamText`, `tool`, `Output`) makes one model call, or a bounded multi-step call, with streaming and typed tools. The agent layer (`ToolLoopAgent`) wraps Core into a reusable object with instructions, tools, stop conditions, and approval rules. The UI layer (`@ai-sdk/react` `useChat` and siblings for Vue, Svelte, Angular) consumes a stream protocol the server emits. Provider packages translate to each vendor's API. A separate, newer, experimental family (`@ai-sdk/workflow` `WorkflowAgent` and "harness" packages) targets durability and wrapping complete external agents.

The loop in `ToolLoopAgent` is the plain one: call model, run any tool that has an `execute` function, append results, repeat until the model stops asking for tools, a tool has no `execute`, a call needs approval, or a stop condition fires. The default stop is 20 steps [docs: `docs/03-agents/04-loop-control.mdx`].

| # | Duty | Provided? | API name |
|---|---|---|---|
| 1 | Stream from the model, assemble partial tool calls | **Provided** | `streamText`, `agent.stream()`; `fullStream` parts `tool-input-start`, `tool-input-delta`, `tool-call`, `tool-result` [ran] |
| 2 | Loop as a state machine | **Partly provided.** A fixed loop with hooks; not an explicit state machine you can inspect or resume mid-flight | `ToolLoopAgent`, `stopWhen`, `prepareStep`, lifecycle callbacks [docs] |
| 3 | Validate tool arguments, generate schemas | **Provided** | `tool({ inputSchema: z.object(...) })`; also JSON Schema or other Standard Schema libraries (not tried) [docs]; `strict` per tool |
| 4 | Concurrent tools with cancellation | **Partly provided.** Calls from one step run concurrently; cancellation by `abortSignal`. No read-only vs writer scheduling | `abortSignal` option [docs]; parallel execution within a step is the documented behaviour, but the stub emits one call so I did not run two at once [unverified] |
| 5 | Sandboxed execution | **You build it.** Docs mention code-mode and harness adapters that can run in a sandbox, all experimental | `docs/03-ai-sdk-core/18-code-mode.mdx` [docs, not run] |
| 6 | Context assembly and compaction | **Partly provided.** Hooks for it; no built-in summariser | `prepareStep` returns new `messages`, `instructions`, model, tools per step [docs] |
| 7 | Session persistence | **You build it.** Agent is stateless between calls; you pass `messages` back | `result.response.messages` [ran] |
| 8 | Permissions | **Partly provided.** Per-tool and function-level approval statuses | `toolApproval`, `needsApproval` [docs]; approval request and response round trip [ran] |
| 9 | Extension: MCP, plugins, hooks | **Provided for MCP; partly for hooks** | `@ai-sdk/mcp` `createMCPClient`; lifecycle callbacks; `registerTelemetry` integrations; middleware [docs] |
| 10 | Observability | **Provided as hooks to OpenTelemetry** | `@ai-sdk/otel` `OpenTelemetry`, `registerTelemetry`; usage on every result [docs]; not run |
| 11 | Packaging and distribution | **Not applicable.** It is a library; you package your own app | ESM-only npm packages [source] |
| 12 | Local-model integration | **Provided through OpenAI-compatible endpoints; community provider for Ollama** | `createOpenAICompatible` [ran]; `ollama-ai-provider-v2` (not Vercel-maintained) [docs list, secondary for quality] |

## Implement it

### Install and minimal agent

```bash
# executed
mkdir my-agent && cd my-agent && npm init -y
npm i ai @ai-sdk/openai-compatible zod
# package.json must contain "type": "module" or use a .mjs file (ESM only)
```

Complete program, TypeScript-compatible JavaScript, **executed** against the stub (file `agent.mjs`, 28 lines):

```js
import { ToolLoopAgent, tool, isStepCount } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

const provider = createOpenAICompatible({
  name: 'stub',
  baseURL: 'http://127.0.0.1:8106/v1',   // any OpenAI-compatible server
  apiKey: 'not-a-real-key',
});

const agent = new ToolLoopAgent({
  model: provider.chatModel('stub-model'), // chat completions wire format
  instructions: 'You are a weather assistant. Use the tool.',
  stopWhen: isStepCount(10),
  tools: {
    get_weather: tool({
      description: 'Get the current weather for a city',
      inputSchema: z.object({ city: z.string().describe('City name') }),
      execute: async ({ city }) => '31 C and clear',
    }),
  },
});

const result = await agent.generate({ prompt: 'What is the weather in Pune?' });
console.log('FINAL:', result.text);
console.log('STEPS:', result.steps.length, 'finish:', result.finishReason);
```

Notes: the tool name the model sees is the key in the `tools` object (`get_weather`). In AI SDK 6 and later the tool carries no separate `name` field [source: 6.0 migration guide]. Passing a plain string such as `'anthropic/claude-sonnet-5.5'` as `model` routes through the Vercel AI Gateway, a hosted proxy that requires a Gateway key or Vercel OIDC token; that is the default global provider [source: `docs/02-getting-started/00-choosing-a-provider.mdx`]. If you want no Vercel service in the path, always pass a provider object as above.

### Run it against the stub [ran]

Stub on port 8106, started by me and killed at the end. Output of `node agent.mjs`:

```text
FINAL: It is 31 C and clear in Pune.
STEPS: 2 finish: stop
```

`GET /_log` after that run showed two requests to `/v1/chat/completions`, both offering the tool `get_weather`; the first had 2 messages (system and user), the second 4 (adding the assistant tool call and the tool result). That proves the round trip: model asked for the tool, the SDK ran `execute`, sent the result back, and the model produced the final answer. The same agent against the OpenAI Responses endpoint (`createOpenAI({ baseURL })`, which uses `/v1/responses` by default in v7) also returned the final text [ran]; the log recorded two `/v1/responses` requests across all my runs.

### Feature checks

All of (a) to (i) were tried in `features.mjs` and `f2.mjs` against the stub unless stated.

**(a) Streaming output [ran].** `streamText({ model, tools, stopWhen, prompt })` returns an object with `textStream` (text only) and `fullStream` (every part). Observed part types for a tool turn, in order: `start, start-step, tool-input-start, tool-input-delta, tool-input-end, tool-call, tool-result, finish-step, start-step, text-start, text-delta, text-end, finish-step, finish`. `ToolLoopAgent` has `agent.stream()` with the same result shape [docs]. To feed a browser, `createAgentUIStreamResponse({ agent, uiMessages })` returns a `Response` in the AI SDK UI message stream protocol, and `useChat` from `@ai-sdk/react` consumes it [docs: `docs/03-agents/02-building-agents.mdx`, not run].

```js
// executed
const r = streamText({ model, tools: { get_weather }, stopWhen: isStepCount(5), prompt: 'weather?' });
for await (const chunk of r.textStream) process.stdout.write(chunk);
```

**(b) Conversation memory across turns [ran, but it is your job].** The agent object is stateless. I fed `[user, ...result1.response.messages, user]` back into `agent.generate({ messages })` and it worked. The docs list three memory approaches: provider-defined tools such as Anthropic's memory tool, third-party "memory providers", or your own tool [docs: `docs/03-agents/06-memory.mdx`]. There is no first-party session store.

**(c) Durable state: pause, resume, restart [partly].** `ToolLoopAgent` is in-memory; the docs state plainly that a crash loses all progress [docs: `docs/03-agents/07-workflow-agent.mdx`]. For durability the docs point to `WorkflowAgent` in `@ai-sdk/workflow` (2.0.109, Apache-2.0 [ran npm view]), which runs the same loop inside Vercel's Workflow DevKit (`workflow@5`, package `vercel/workflow`, Apache-2.0 [ran npm view]) so each model call and tool call becomes a durable, retried step. Not installed or run by me. Whether that runtime can run outside Vercel's hosting, and with what storage, I did not verify [unverified]. Mark this as the main place the SDK stops.

**(d) Human approval before a tool runs [ran].** `toolApproval: { get_weather: 'user-approval' }` on the agent (or `needsApproval` on the tool). First `generate()` returned `finishReason: "tool-calls"` with content parts `tool-call` and `tool-approval-request` (carrying an `approvalId`). I then called `generate({ messages })` with the prior messages plus `{ role: 'tool', content: [{ type: 'tool-approval-response', approvalId, approved: true }] }`, and the run completed with the final text, finish reason `stop`. Approval statuses are `not-applicable`, `approved`, `denied`, `user-approval`; functions can decide per call [docs: `docs/03-agents/06-tool-approvals.mdx`, `06-policy-tool-approvals.mdx`]. Note that approval state lives in the message list you hold, so you persist it yourself.

```js
// executed
const a = new ToolLoopAgent({ model, tools: { get_weather }, toolApproval: { get_weather: 'user-approval' } });
const r1 = await a.generate({ prompt: 'weather?' });
const req = r1.content.find(c => c.type === 'tool-approval-request');
const r2 = await a.generate({ messages: [
  { role: 'user', content: 'weather?' }, ...r1.response.messages,
  { role: 'tool', content: [{ type: 'tool-approval-response', approvalId: req.approvalId, approved: true }] } ] });
```

**(e) Second tool and parallel calls [partly].** Add more keys to `tools`. The docs' own example uses two tools in a loop [docs]. The stub only ever emits one call per turn, so I did **not** observe parallel execution [unverified beyond docs].

**(f) MCP server [ran].** `@ai-sdk/mcp` (2.0.101). I wrote a tiny stdio MCP server with `@modelcontextprotocol/sdk` and used:

```js
// executed
import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
const c = await createMCPClient({ transport: new Experimental_StdioMCPTransport({ command: 'node', args: ['mcp-server.mjs'] }) });
const tools = await c.tools();          // {get_weather: ...} usable directly in generateText / agent
// tool result observed: {"content":[{"type":"text","text":"MCP: 31 C and clear in Pune"}],"isError":false}
await c.close();
```

The stdio transport is flagged experimental by its name. For production the docs recommend Streamable HTTP (`transport: { type: 'http', url, headers, authProvider, redirect: 'error' }`), support OAuth via an `authProvider`, and describe the stateless MCP `2026-07-28` protocol and a guarded-fetch recommendation against server-side request forgery when URLs come from users [docs: `docs/03-ai-sdk-core/16-mcp-tools.mdx`, not run beyond stdio]. 

**(g) Structured output [ran].** `generateText({ model, output: Output.object({ schema }), prompt })` (the older `generateObject` is deprecated since 6.0 [source]). With a mock model returning `{"a":"hello"}` the result had `output: { a: 'hello' }` [ran]. Against the stub, whose reply is plain prose, it threw `AI_NoObjectGeneratedError: No object generated: could not parse the response`, which is the correct failure and shows you must catch it. Also seen: `createOpenAICompatible` warned that the `responseFormat` JSON schema is only used when `supportsStructuredOutputs: true` is set on the provider, so for OpenAI-compatible servers you must opt in and the server must support it [ran: warning text; `supportsStructuredOutputs` option present in `@ai-sdk/openai-compatible` types [source]].

**(h) Tracing and observability [docs, not run].** Install `@ai-sdk/otel`, call `registerTelemetry(new OpenTelemetry())` once at startup, and supported calls emit OpenTelemetry spans by default (opt out per call via `telemetry`); custom integrations receive lifecycle events; agent span names are documented [docs: `docs/03-ai-sdk-core/60-telemetry.mdx`]. This is a change from 6.x, where `experimental_telemetry` lived on each call [source: migration guide]. Every result also carries token usage.

**(i) Testing without a real model [ran].** `import { MockLanguageModelV4 } from 'ai/test'` gives a model whose `doGenerate` / `doStream` you script; I used it for `generateText` and structured output. Its return shape is the provider-spec shape (`finishReason: { unified, raw }`, `usage` with nested token counts, `content: [{ type: 'text', text }]`), which is verbose and tied to the spec version. `simulateReadableStream` and `mockValues` are exported alongside [docs: `docs/03-ai-sdk-core/55-testing.mdx`]. Alternatively point at a stub HTTP server as I did.

## Models and local models

Switching provider is a one-line change of the `model` value: `openai('...')`, `anthropic('...')`, `google('...')`, a gateway string, or a custom provider built with `customProvider` or `createProviderRegistry`-style helpers [docs: `docs/03-ai-sdk-core/45-provider-management.mdx`]. First-class means maintained in the Vercel repository: `@ai-sdk/openai` 4.0.121, `@ai-sdk/anthropic` 4.0.106, `@ai-sdk/gateway` 4.0.150 verified to exist [ran npm view], with Google, Azure, xAI, Mistral, Groq, Amazon Bedrock and others named in the docs. Community providers (Ollama is one) sit in a second tier maintained outside Vercel.

**OpenAI-compatible endpoints (vLLM, llama.cpp server, Ollama's `/v1`, LM Studio).** Use `createOpenAICompatible({ name, baseURL, apiKey, headers?, includeUsage?, supportsStructuredOutputs? })` and call `provider.chatModel(id)` [ran against the stub]. This is the route I would use for local models, because it targets the plain Chat Completions wire format that every local server speaks. `@ai-sdk/openai` in v7 defaults to the Responses API (`/v1/responses`) when you call `openai('model')`, which most local servers do not implement; use `openai.chat(...)` or the compatible package for them [ran: Responses against the stub worked; local-server support for it is [unverified]].

**Ollama.** Two ways: Ollama's built-in OpenAI-compatible `/v1` through `createOpenAICompatible`, or the community package `ollama-ai-provider-v2` (4.1.0, Apache-2.0, repository `nordwestt/ollama-ai-provider-v2` [ran npm view]) which speaks Ollama's native API. I did not run either against a real Ollama [unverified]. Which of the two handles tool calls better for a given model is a question to test per model.

**Known problems with small or open models.** I could not test real models, so these are structural, not measured: (1) tool-call formats vary and the compatible provider relies on the server translating them into OpenAI `tool_calls`; a server that returns tool calls as text in `content` will make the loop end silently after one step; (2) JSON-schema structured output depends on `supportsStructuredOutputs` and server support (warning observed above); (3) invalid tool arguments from a weak model: the SDK has `experimental_repairToolCall`-style repair hooks in the lineage (renamed `ToolCallRepairFunction` in 6.0 [source]) and returns validation errors to the model; I did not test the repair path [unverified]; (4) retries: Core retries failed model requests by default (`maxRetries`, documented default 2 [unverified, recalled from docs of earlier majors; confirm in `docs/03-ai-sdk-core/25-settings.mdx`]) and this can double latency against a local server that is simply slow.

## State, durability and concurrency

- **Representation.** A conversation is an array of `ModelMessage` objects (roles system, user, assistant, tool; content parts for text, tool-call, tool-result, files, reasoning, approval request and response). A separate `UIMessage` type exists for chat UIs, with conversion helpers (`convertToModelMessages` is async since 6.0 [source]). You own the array.
- **Agent-level state.** `runtimeContext` is shared agent state across steps (tenant, request id, progress), and `toolsContext` holds per-tool values like API keys, each tool seeing only its own typed `context` [docs: `docs/03-agents/01-overview.mdx`, `17-runtime-and-tool-context.mdx`]. It is in memory.
- **What survives a crash.** With `ToolLoopAgent`: nothing. With `WorkflowAgent`: workflow-level checkpoints [docs, not run]. Anything else (messages, approvals) survives only if you store it.
- **Concurrency.** Node's event loop; the agent object is reusable across concurrent calls as far as I can tell from its stateless design, but I did not test shared-instance concurrency [unverified]. Tool calls within one model step are issued together (docs behaviour). Cancel with `abortSignal`. The loop has "steering" and "queued message" features to inject user input mid-run, newly changed in 7.0.177 ("interrupt option to steering" [source: CHANGELOG]).

## What you still build yourself

| Need | What the SDK gives toward it |
|---|---|
| Sessions, history storage, resume | Message types and `response.messages`; nothing to store them |
| Permission policy engine | `toolApproval` statuses and functions; approvals are carried in messages |
| Sandboxing of shell and file tools | Nothing first-party for your own tools; experimental harness adapters wrap external agents (Claude Code, Codex, Pi) that bring their own [docs] |
| Context compaction | `prepareStep` hook to rewrite messages each step; you write the summariser |
| Cost and budget control | Token usage per step and a step cap (default 20 for `ToolLoopAgent`); no money budget |
| Evaluation | Mock models for deterministic tests; no eval framework |
| Durable workflows | `WorkflowAgent` on Workflow DevKit (separate, newer) |
| Retries with backoff on tools | Not in `ToolLoopAgent`; automatic only in the workflow variant [docs table] |

## Lock-in and escape hatches

- **Types you will carry:** `ModelMessage`, `tool()` definitions with zod or JSON schema, `ToolLoopAgent` options, stream part types, and the UI message protocol if you use `useChat`. Tool definitions are the stickiest part; they are plain `description` + `inputSchema` + `execute`, so porting them to another loop is mechanical.
- **Removal cost:** for a backend that uses only `streamText`, tools and a provider, a replacement is the reference loop from the treatise (about 100 lines) plus per-provider HTTP clients and an SSE parser, plus JSON-schema generation from your validation library. The provider layer (streaming, partial tool-call assembly, vendor differences for reasoning and caching) is the bulk of what the SDK buys; the agent class itself is thin.
- **Churn is the lock-in:** every major renamed core symbols (`Experimental_Agent` to `ToolLoopAgent`, `stepCountIs` to `isStepCount`, `generateObject` to `output`). Codemods exist [source]. 
- **Migration stories:** none first-hand. Mastra moved from depending on `ai` (`^4.3.19` at 0.24.0) to only its provider spec packages (1.85.0) [ran `npm view`].
- **Vercel coupling:** string model ids go to Vercel's AI Gateway and the durable story assumes the Workflow DevKit [source, docs]; both are opt-in.

## Pitfalls

1. **Default model routing to a hosted gateway.** Passing a string as `model` does not call the vendor directly [source]. For a local-first product always construct a provider object.
2. **Default 20-step cap with a warning** when it truncates a loop [docs]; set `stopWhen` explicitly, and note `WorkflowAgent.stream()` has no default cap while `generate()` has [docs]. A runaway cost risk in one variant.
3. **Provider specification version coupling.** `ai@7` expects providers on the v4 spec; mixing old `@ai-sdk/*` majors fails [docs troubleshooting title; source package versions: openai 4.x, compatible 3.x, mcp 2.x all moved together].
4. **ESM only, Node 22+** [source]. CommonJS apps break on upgrade.
5. **Structured output silently depends on server support** (warning seen) [ran].
6. **Approval is a message-list protocol**, not a callback you can `await`; a server that must hold a request open for a human cannot, so you persist and re-enter [ran].
8. **Documentation volume and speed of change.** Very large docs tree and daily patch releases; features such as `toolSearch`, code mode, harness adapters and `WorkflowAgent` appeared within the 7.x line and some are marked experimental [docs]. Re-read the changelog when you upgrade.

## Choose it when / avoid it when

**Choose it when:**
- Your backend is TypeScript and you need several providers (cloud and OpenAI-compatible local) behind one interface without writing SSE parsers and tool-call assemblers per vendor.
- You are building a web chat UI (Next.js, Svelte, Vue and so on), where `useChat` plus `createAgentUIStreamResponse` removes a lot of client plumbing.
- Your agent is request-scoped (a turn lasts seconds to a few minutes), and you will hold session state yourself.
- You want MCP client support with OAuth and stateless-protocol handling that is kept current.

**Avoid it (or use only Core) when:**
- You need durable, resumable, long-running agents outside Vercel infrastructure: the SDK's durable story is `WorkflowAgent` on a separate runtime I did not verify end to end.
- You need a coding-agent-grade runtime: concurrency scheduling, sandboxing, compaction, session logs, permission rules. None are provided; the loop is the easy part.
- You are not on TypeScript, or you want a long-stable API: majors every few months.

**Against writing the loop yourself.** The treatise's reference loop is about 100 lines and the evidence it cites says loop sophistication did not predict benchmark claims. The SDK's loop adds little over that. What it buys is below the loop: normalised streaming and tool-call assembly across providers, schema generation and validation, retry on requests, UI stream protocol, MCP client, telemetry hooks and mocks. What it costs is a dependency whose public surface changes per major, a spec-version coupling, and a default path through a hosted gateway. A reasonable approach is to use `streamText` plus `tool()` as the provider layer and write your own outer loop and session log, which keeps the churn-prone agent class out of your core.

**TypeScript in coding-agent harnesses.** The repository's [Harness Engineering guide](../../../llm-learning-repository/tutorials/06-agent-systems/29-harness-engineering.md) says TypeScript is used by five of eleven studied coding-agent harnesses. I have not established which of those five use the Vercel AI SDK, and I am not claiming any link between the two facts [unverified]. The statement supports "TypeScript is a viable language for an agent runtime", not "this framework is what they use".

## What was verified

| Item | Result |
|---|---|
| Installed | `ai@7.0.177`, `@ai-sdk/openai@4.0.121`, `@ai-sdk/openai-compatible@3.0.93`, `@ai-sdk/mcp@2.0.101`, `zod@4.6.7`, `@modelcontextprotocol/sdk` into `envs/vercel-ai` on Node v26 |
| Ran against stub | Minimal `ToolLoopAgent` on chat completions (2 steps, final text correct); `streamText` text and full stream; multi-turn message pass-through; tool approval and approve round trip; mock model; structured output (mock succeeded, stub failed as expected); OpenAI Responses API path; MCP stdio tool call |
| Stub proof | `GET /_log`: 30 requests (28 chat completions, 2 responses); minimal agent run showed two chat requests, 2 then 4 messages, tool offered both times |
| Read only | Agent docs, loop control, workflows, memory, telemetry, migration guides 6 and 7, provider docs (from the package's bundled `docs/`); `npm view` metadata for `@ai-sdk/workflow`, `workflow`, `@ai-sdk/otel`, `@ai-sdk/anthropic`, `ollama-ai-provider-v2` |
| Not verified | `WorkflowAgent` and the Workflow DevKit end to end; real Ollama, vLLM or llama.cpp behaviour; parallel tool execution (stub emits one call); OpenTelemetry output; `useChat` in a browser; request retry defaults; tool-call repair; shared-instance concurrency; which studied harnesses use this SDK |
