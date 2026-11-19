# Mastra

A TypeScript framework that bundles agents, tools, workflows with suspend and resume, memory, RAG (retrieval-augmented generation), evaluations, observability, a local development UI and an HTTP server. Covered here as of 2026-11-19, major version 1.

| Field | Value |
|---|---|
| Packages | `@mastra/core` (agents, workflows, tools, server types), `@mastra/memory`, storage adapters such as `@mastra/libsql` and `@mastra/pg`, `@mastra/mcp`, `@mastra/observability`, CLI `mastra` |
| Version covered | `@mastra/core@1.85.0`, `@mastra/memory@1.41.2`, `@mastra/libsql@1.31.1`, `@mastra/mcp@2.10.0`, `@mastra/observability@1.24.2` |
| Language | TypeScript / JavaScript, Node 22.13 or later |
| Fit for an agent runtime | A full application framework with state, storage and a server. It brings a lot, and it brings its own storage schema and server. |

## Snapshot

| Row | Value | Evidence |
|---|---|---|
| Current version and date | `@mastra/core@1.85.0`, published 2026-11-18 (npm `time` 15:14 UTC); npm `latest` = 1.85.0. A GitHub release for `@mastra/core@1.84.0` is dated 2026-11-18. | [ran] `npm view @mastra/core time dist-tags`; `gh api repos/mastra-ai/mastra/releases` |
| Major history | 0.1.0 on 2024-10-02; 0.10.0 on 2025-05-21; 1.0.0-beta.1 on 2025-11-10; **1.0.0 on 2026-01-20**. So there has been one major release so far, from a 0.x line that changed constantly to a 1.x line. | [ran] `npm view @mastra/core time` |
| Release cadence | About 85 minor versions in 10 months since 1.0.0, so a minor roughly every three to four days. Hundreds of preview dist-tags (branch snapshots) exist on npm. | [ran] version number; dist-tag listing |
| Breaking changes | The 0.x line depended on the `ai` package at `^4.x` (0.10.0 `^4.2.2`, 0.24.0 `^4.3.19`); 1.x does not depend on `ai` at all. The 1.0 changeover (a beta from 2025-11-10) is where storage and API shapes were reorganised. I did not read the 0.x to 1.0 migration guide, so I cannot list what broke [unverified]. Inside 1.x, new features land as minors and several are marked beta with the explicit line "breaking changes may occur without a major version bump" (durable agents, added in 1.45.0). | [ran] `npm view @mastra/core@0.10.0 dependencies.ai`; [docs] `docs-harness-durable-agents.md` bundled in the package |
| License | Apache-2.0 for the code, **except** directories named `ee/` (`@mastra/core/auth/ee`, `@mastra/core/agent-builder/ee`, `@mastra/editor/ee`), which are under a separate "ee" license in `ee/LICENSE` that I did not read. Copyright holder: Kepler Software, Inc. | [source] `node_modules/@mastra/core/LICENSE.md`; `package.json` says Apache-2.0; GitHub API reports `NOASSERTION` for the repo, consistent with a mixed license |
| Maintainer | Kepler Software, Inc. (the company behind Mastra), repository `github.com/mastra-ai/mastra`; about 29,600 stars; last push 2026-11-19 | [source] LICENSE.md, package metadata; [ran] `gh api repos/mastra-ai/mastra` |
| Languages | TypeScript only | [docs] |
| Docs | https://mastra.ai/docs; machine-readable index https://mastra.ai/llms.txt; the whole doc set also ships inside the package at `node_modules/@mastra/core/dist/docs/` | [source] package contents |
| Status | Active and heavily staffed (frequent releases). Hosted commercial platform alongside. Some surfaces deprecated inside 1.x, for example "agent networks" (superseded by supervisor agents) | [docs] `docs-agents-networks.md` description says "deprecated Mastra agent networks" |

## What it is, in terms of the runtime loop

Mastra is organised around objects you register on one `Mastra` instance: `Agent`, `Workflow` (built from steps), `Memory`, tools made with `createTool`, scorers for evaluation, MCP servers and clients, and storage. The agent loop is Mastra's own implementation (the `loop` directory in `@mastra/core`), not a wrapper over the Vercel AI SDK agent class [source: `node_modules/@mastra/core/loop`; no `ai` dependency in `package.json`]. Model access goes through a "model router": a string such as `provider/model`, an object `{ id, url, apiKey, headers, api }` for any OpenAI-compatible server, or an existing language-model object from the Vercel AI SDK's provider interface [source: `dist/llm/model/shared.types.d.ts`].

Relation to the Vercel AI SDK, as verified: Mastra began on top of the `ai` package (0.x versions list `ai@^4` as a dependency [ran]). In 1.85.0 it depends on no `ai` package, but it still bundles the AI SDK provider specification packages for several generations (`@ai-sdk/provider` aliases for v5, v6 and v7 in dependencies [source: package.json]) and accepts models built from AI SDK providers of those generations, plus internal vendored copies of `ai` v4 and v5 types [source: `dist/test-utils/llm-mock.d.ts` imports from `_types/@internal_ai-sdk-v4` and `-v5`]. A separate package `@mastra/ai-sdk` (1.12.0 [ran npm view]) converts Mastra streams to the AI SDK UI format, and the docs say to pass `version: 'v7'` for AI SDK 7 [docs: `docs-guides-streaming.md`]. So the accurate summary is: historically built on it, now an independent loop that interoperates with AI SDK providers and UI.

| # | Duty | Provided? | API name |
|---|---|---|---|
| 1 | Stream from the model | **Provided** | `agent.stream()`, `textStream`, `fullStream`; AI SDK stream conversion via `@mastra/ai-sdk` |
| 2 | Loop as a state machine | **Provided, with a persistent variant.** The loop runs to a final answer or `maxSteps` (default 5 per the reference); a "durable agent" runs the loop inside a workflow so it can resume | `Agent`, `maxSteps`, `stopWhen`, `createDurableAgent` (beta) |
| 3 | Validate tool arguments, schemas | **Provided** | `createTool({ id, description, inputSchema, outputSchema, execute })`; validation errors go back to the model [ran] |
| 4 | Concurrent tools with cancellation | **Partly provided.** Abort signal is passed into tools (`abortSignal` in the execution context); background tasks with cancellation for long calls; no read-parallel/write-serial scheduler found | `abortSignal`, background tasks docs [docs, not run] |
| 5 | Sandboxed execution | **Partly provided.** Workspace/sandbox, filesystem, "code mode" in isolated local or remote sandboxes are documented | `docs-sandbox-*.md`, `docs-agents-code-mode.md` [docs, not run] |
| 6 | Context assembly and compaction | **Provided** | Memory: message history, working memory, semantic recall, observational memory (background agents condense history), memory processors [docs] |
| 7 | Session persistence | **Provided** | `Memory` with `thread` and `resource` ids, stored via storage adapter [ran] |
| 8 | Permissions | **Partly provided.** Per-tool and per-request approval; no rule language | `requireApproval: true`, `requireToolApproval`, `approveToolCall`, `declineToolCall` [ran] |
| 9 | Extension: MCP, plugins, hooks | **Provided** | `MCPClient`, `MCPServer`, A2A, ACP, processors (input and output), channels, skills [docs, MCP client ran] |
| 10 | Observability | **Provided** | `@mastra/observability` `Observability` with exporters; Studio traces; hosted option [ran partly] |
| 11 | Packaging and distribution | **Provided for services** | `mastra build` produces a Hono-based server; deployers for Vercel, Netlify, Cloudflare [docs, fetched mastra.ai] |
| 12 | Local-model integration | **Partly provided** via OpenAI-compatible config | model `{ id: 'x/y', url }` [ran]; no dedicated Ollama provider found in the docs I grepped (grep for "ollama" in the bundled docs: no hits) |

## Implement it

### Install and minimal agent

```bash
# executed
mkdir my-agent && cd my-agent && npm init -y
npm i @mastra/core zod        # core and a schema library (zod 3.25+ or 4)
# package.json needs "type": "module" or use .mjs
```

Complete program, **executed** against the stub (`agent2.mjs`, 16 lines):

```js
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const get_weather = createTool({
  id: 'get_weather',
  description: 'Get the current weather for a city',
  inputSchema: z.object({ city: z.string().describe('City name') }),
  execute: async ({ city }) => '31 C and clear',
});

const agent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: 'You are a weather assistant. Use the tool.',
  model: { id: 'stub/stub-model', url: 'http://127.0.0.1:8106/v1', apiKey: 'not-a-real-key' },
  tools: { get_weather },   // the KEY here is the tool name the model sees
});

const res = await agent.generate('What is the weather in Pune?');
console.log('FINAL:', res.text, '| steps', res.steps.length);
console.log(JSON.stringify(res.toolResults.map(r => r.payload)));
```

The docs' own quickstart says a plain object tool "silently fails to execute" and that tools must be built with `createTool`, and that `execute(inputData, context)` is the only signature [docs: `docs-agents-overview.md`]. Its `model` is normally a string like `openai/<model>`; the object form with `url` is how I pointed it at the stub [source: `OpenAICompatibleConfig` type: `id` as `provider/model`, optional `url`, `apiKey`, `headers`, `api: 'chat' | 'responses'`].

Install weight: `npm i @mastra/core @mastra/memory @mastra/libsql zod` produced 144 top-level packages and about 191 MB in `node_modules` [ran], versus 47 MB for the Vercel AI SDK set. Startup of the minimal script took about 0.4 seconds wall time [ran: `time node agent.mjs`].

### Run it against the stub [ran]

```text
tool ran with Pune
FINAL: It is 31 C and clear in Pune. | steps 2
[{"args":{"city":"Pune"},"toolCallId":"call_stub_1","toolName":"get_weather","result":"31 C and clear"}]
```

`GET /_log` showed requests to `/v1/chat/completions` with `tools: ["get_weather"]`, first with 2 messages, then 4. Round trip confirmed. Over the whole session the stub logged 30 requests (28 chat, 2 responses; the 2 responses were from the AI SDK profile run).

A first attempt registered the tool under the key `getWeather` while its `id` was `get_weather`; the model-visible name was the **key** (`getWeather`), so the stub (which only names `get_weather` specially) chose the first tool and sent `{}` [ran]. A second case showed the same through MCP: the MCP tool became `w_get_weather` (server name prefix), the stub sent `{}`, and Mastra returned a tool-input validation error to the model instead of crashing: `"Tool input validation failed for w_get_weather ... must have required property 'city'"`, and the loop continued to a final answer [ran]. That is the treatise's invariant 4, observed.

### Feature checks

Run in `features.mjs`, `crash1.mjs`, `trace.mjs` unless stated. For approvals and workflows, `new Mastra({ ..., storage })` was required.

**(a) Streaming [ran].** `const s = await agent.stream('...'); for await (const c of s.textStream) ...`; `s.fullStream` gives typed chunks including `tool-call-approval`. Resumable streams (clients reconnect, another reader follows a run with `observe()`) are documented [docs: `docs-agents-resumable-streams.md`, not run].

**(b) Memory across turns [ran].**

```js
// executed
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
const storage = new LibSQLStore({ id: 'store', url: 'file:./mastra.db' });
const memory = new Memory({ storage, options: { lastMessages: 10 } });
const agent = new Agent({ id: 'm', name: 'm', instructions: 'x', model, memory });
const mastra = new Mastra({ agents: { agent }, storage });
await agent.generate('hello one', { memory: { thread: 't1', resource: 'u1' } });
await agent.generate('hello two', { memory: { thread: 't1', resource: 'u1' } });
const r = await memory.recall({ threadId: 't1', resourceId: 'u1' });  // 4 messages persisted
```

Other layers: working memory (structured facts about the user or task), semantic recall (vector search over past messages), observational memory (recommended by the docs: background agents keep a dense observation log that replaces raw history as it grows), and memory processors to trim or filter [docs: `docs-memory-overview.md`]. These extra layers call models themselves, so they add cost and calls you did not write; I did not run them.

**(c) Durable state [ran for workflows].** A workflow step can call `suspend()`; its snapshot is stored in the storage adapter, and a later call resumes it:

```js
// executed in two separate node processes
// process 1: const run = await mastra.getWorkflow('wf2').createRun(); await run.start({ inputData: { q: 'x' } });  // status "suspended"
// process 2: const run = await mastra.getWorkflow('wf2').createRun({ runId });
//            const r = await run.resume({ step: 'ask', resumeData: { answer: 'after-restart' } }); // status "success"
```

Output: `resumed success {"a":"after-restart"}`, with the file-backed libSQL database as the only link between the two processes [ran]. So suspend and resume survives a process restart for workflows. For agents: a "durable agent" (`createDurableAgent`, `@mastra/core/agent/durable`, added in 1.45.0, labelled **beta**) wraps the loop in a workflow with PubSub so clients can reconnect; Inngest can execute it with memoised steps and retries [docs: `docs-harness-durable-agents.md`, not run]. A plain `Agent.generate()` that crashes mid-tool is not resumed. Agent-run approval snapshots are "minimal resume artifacts deleted once the run finishes" [docs].

**(d) Human approval [ran].** Mark the tool `requireApproval: true` (or pass `requireToolApproval: true` on a call); the stream emits `tool-call-approval`; call `agent.approveToolCall({ runId })` or `declineToolCall({ runId })`. Seen: chunk arrived, approval produced the final text. Requires storage on the `Mastra` instance, else a "snapshot not found" error [docs]. `suspend()` inside a tool provides mid-execution questions [docs: `docs-agents-human-in-the-loop.md`].

**(e) Second tool and parallel calls [unverified for parallel].** Add keys to `tools`. The stub emits one call per turn so no parallel execution was observed.

**(f) MCP [ran].** `@mastra/mcp` `MCPClient`:

```js
// executed
import { MCPClient } from '@mastra/mcp';
const mcp = new MCPClient({ servers: { w: { command: 'node', args: ['mcp-server.mjs'] } } });
const tools = await mcp.listTools();               // keys are prefixed: "w_get_weather"
const agent = new Agent({ id: 'mc', name: 'mc', instructions: 'x', model, tools });
await mcp.disconnect();
```

Mastra can also serve its agents, tools and workflows as an MCP server (`MCPServer`, [docs: `docs-server-mcp.md`, not run]), and speak A2A and ACP [docs].

**(g) Structured output [ran].** `agent.generate('x', { structuredOutput: { schema: z.object({ a: z.string() }) } })` gives `result.object`. Against the stub (prose reply) it failed with `STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED` ("expected object, received undefined"), and it also printed the error to the console [ran]. A model can be given for a separate structuring step per the docs [docs: `docs-agents-structured-output.md`, not run].

**(h) Tracing [partly ran].** `new Mastra({ observability: new Observability({ configs: { default: { serviceName, exporters: [new DefaultExporter()] } } }), storage })` from `@mastra/observability`. The call returned a `traceId` on the result [ran], but when I queried the libSQL `mastra_ai_spans` table 2.5 seconds later it had zero rows; I did not investigate (batching delay, or storage setup) [unverified whether spans are persisted in this configuration]. Studio (the dev UI, `mastra dev`) and the hosted Observability product consume these traces [docs].

**(i) Testing without a real model [partly ran].** `@mastra/core/test-utils/llm-mock` exports `createMockModel`, `MockProvider`, `MastraLanguageModelV2Mock`, `simulateReadableStream` [ran: import succeeded and listed these exports]; its types reference AI SDK v4/v5 mock models internally [source], so it may lag the newest provider specification. I did not run an agent on it. The evals subsystem (scorers, datasets, experiments, `runEvals` for CI, gates and verdicts) is a notable extra and tests quality, not just wiring [docs: `docs-evals-*.md`, not run].

## Models and local models

- **Router strings** `provider/model` pick credentials from environment variables (OPENAI_API_KEY and so on) and use a registry of providers (the docs mention a models.dev-based gateway, `ModelsDevGateway`) [docs]. First-class means present in that registry; the list is long and I did not enumerate it.
- **Custom gateway.** A `MastraModelGateway` abstraction lets you register your own routing, and the docs' example uses `@ai-sdk/openai-compatible` [docs: `reference-core-mastra-model-gateway.md`].
- **OpenAI-compatible endpoints (vLLM, llama.cpp server, Ollama `/v1`).** `model: { id: 'ollama/llama3', url: 'http://localhost:11434/v1', apiKey: 'x' }` shape is supported by the type [source], and the same shape ran against the stub [ran]. The `api: 'chat' | 'responses'` field lets you choose the wire format, which matters because local servers usually implement only chat completions [source for the field; behaviour with a real server [unverified]].
- **AI SDK providers.** Any language-model object from AI SDK v5, v6 or v7 providers can be passed directly [source: type union `LanguageModelV2 | V3 | V4`]; this is the escape hatch for Ollama's community provider.
- **Small-model issues.** Not tested with real models. Structural points: the loop depends on the server returning standard `tool_calls`; invalid arguments are returned to the model as a structured error [ran], which gives a small model a chance to self-correct; structured output with weak models relies on JSON prompting or provider support; `maxSteps` defaults to 5 [docs: `reference-agents-generate.md`], which a weak model that needs retries can exhaust, and `modelSettings.maxRetries` controls request retries [docs].
- **Memory features call a model.** Observational memory, working memory updates and title generation use an LLM (defaults to the agent's own model, configurable) [docs]. With a local model this is extra latency and quality risk.

## State, durability and concurrency

- **Representation.** Everything is rows in the storage adapter, grouped into domains: memory (threads, messages, resources, working memory), workflows (snapshots), observability (traces, spans, metrics, logs), scores, datasets, experiments, background tasks, schedules, thread state [docs: `docs-storage.md`]. Adapters named in the docs: libSQL, PostgreSQL (`@mastra/pg`), MongoDB, ClickHouse, DuckDB. Composite storage routes each domain to a different backend [docs]. The default in-memory store loses everything on restart.
- **What survives a crash.** Workflow snapshots and memory, with a persistent adapter [ran: cross-process resume, memory persisted]. A bare agent run in flight does not, unless wrapped as a durable agent (beta).
- **Local file database caveat.** `file:./mastra.db` resolves against each process's working directory and should not be used in multi-process production; the docs recommend PostgreSQL [docs].
- **Concurrency.** Node async. Workflows support parallel branches, loops, conditions, and can run in dedicated workers; managed execution via "workflow runners" such as Inngest [docs: `docs-workflows-overview.md`, `docs-deployment-workers.md`]. Scheduled workflows and background tasks exist [docs]. Not exercised by me.
- **Cancellation.** `abortSignal` passed into tool execution context [docs]; background tasks have per-call cancellation [docs]. Not run.

## What you still build yourself

| Need | What Mastra gives toward it |
|---|---|
| Permission policy | Per-tool `requireApproval`, per-request flag, guardrail processors (prompt injection, moderation, PII redaction) [docs]; no allow/deny rule engine |
| Sandboxing | Workspace, sandbox, filesystem and code mode docs; external providers (E2B, Vercel Sandbox) mentioned for deployment [docs] |
| Context compaction | Observational memory, memory processors, semantic recall [docs]; tuning is yours |
| Cost control | `maxSteps`, `stopWhen`, usage in results; no budget enforcement found |
| Evaluation | Scorers, datasets, experiments, CI runner [docs] (a real advantage over the plain SDK) |
| Authentication for the server | Auth providers: JWT, simple auth, Clerk, Auth0, WorkOS, Supabase and more; fine-grained authorization lives under `ee/` licensing [docs/source] |
| Tool scheduling (read parallel, write serial) | Not found |
| Your own session log format | You get Mastra's storage schema, not your own |

## Lock-in and escape hatches

- **Heavy.** You adopt `Agent`, `createTool`, `Memory`, `Mastra`, workflows and a storage schema in a database you then operate. Tools are portable (id, description, zod schema, function). Memory data and workflow snapshots are in Mastra's table layout; migrating them out is a custom job.
- **Deployment lock-in is soft.** The server is Hono-based and built with `mastra build`; deployers exist for Vercel, Netlify and Cloudflare, and you can run it in a container [docs: fetched mastra.ai deployment overview].
- **Hosted versus open source.** The framework code, the CLI and a local Studio are open source (Apache-2.0 apart from `ee/` directories). The "Mastra platform" is hosted and commercial: Observability, Studio and Server, with tiers Free ($0), Starter ($25 per workspace per month), Team ($250) and Enterprise (custom) on the pricing page [docs/secondary: mastra.ai/pricing fetched 2026-11-19 through a summarising fetch tool, so verify the numbers]. Self-hosting Studio is possible with `mastra studio` [docs].
- **Plain-loop reimplementation.** The loop is small (the treatise's 100 lines). The parts that would be large to rebuild are the memory layers, the workflow engine with snapshots, the evals, and the server. Rebuilding only "agent plus tools plus thread memory in Postgres" is a few hundred lines; rebuilding observational memory and the workflow engine is not.
- **Migration stories.** The relationship to the AI SDK is itself one: Mastra moved off the `ai` package between 0.x and 1.x and now vendors specification types [ran]. No user migration accounts were checked.

## Pitfalls

1. **Tool name is the object key, not the `id`** [ran]. Mismatches between the two cause confusing model-side names; MCP tools get a server-name prefix (`w_get_weather`) [ran].
2. **Silent failure of plain-object tools** (documented warning) [docs].
3. **Approvals and workflows need storage configured**, otherwise "snapshot not found" [docs]. Agents must be registered on a `Mastra` instance for some features (my approval and memory tests used one) [ran].
4. **`maxSteps` default of 5** [docs] is low for tool-heavy agents; the Vercel SDK's default is 20 [docs for the other framework].
5. **Release velocity.** A minor every few days and a long list of beta features inside 1.x without major bumps [docs, ran]. Pin versions and read release notes; core, memory, storage and mcp packages move independently and have peer ranges (`@mastra/ai-sdk` requires `@mastra/core >=1.83.0-0 <2`) [ran npm view].
6. **Install size and dependency count** (144 top-level packages, 191 MB with memory and libSQL) [ran]; a native libSQL client is used. npm printed an "install-scripts" warning during an install of the extra packages [ran], so check what your package manager allows to run.
7. **Docs written partly for AI coding agents.** The bundled markdown opens with lines such as "Trust them over training data", tells agents not to install AI SDK packages, and fixes model ids; in this document set the model ids shown (for example `openai/gpt-6.1-sol`) I did not verify as real [source]. Treat these as marketing for a coding assistant, not as verified facts.
8. **Structured output errors print to the console and throw** [ran]; wrap calls.
9. **Observability spans** were not visible in the database in my short test [ran, unexplained].
10. **Hidden extra model calls** from memory features and title generation [docs]; they alter cost, latency and the trace.

## Choose it when / avoid it when

**Choose it when:**
- You want one TypeScript product that already includes thread memory, workflow suspend and resume with human input, evals, tracing, a dev UI and a deployable server, and you accept running its database tables.
- Your agents are conversational assistants or business workflows (support, internal tools) where the workflow engine's `suspend` and storage-backed resume matter more than raw loop control.
- You need an eval loop (datasets, scorers, CI gates) integrated with the agent objects.

**Avoid it when:**
- You are building a coding-agent-style runtime with its own append-only session log, file-system permissions, subprocess sandbox and compaction policy: Mastra's memory and storage model would be the thing you fight. Use a thin provider layer and your own loop.
- You need a small footprint (CLI or desktop packaging, fast install): 191 MB and 144 packages for a basic setup [ran].
- You need a stable, slow-moving API, or you must avoid features that are labelled beta.
- You will run mostly local small models and want predictable call counts: the memory processors and extra agents add model calls.

**Against writing the loop yourself.** The 100-line reference loop gives you full control of the log format and permission flow. Mastra buys the surrounding product: storage schema, memory strategies, snapshot-based suspend and resume across processes [ran], MCP in and out, evals, observability and a server. It costs a large dependency tree, a framework-owned persistence model, and a fast-moving surface. If your need is agent plus tools plus conversation memory in a service, Mastra saves weeks. If your need is a runtime whose loop and log are the product, it saves little and constrains you.

**TypeScript in coding-agent harnesses.** The [Harness Engineering guide](../../llm-learning-repository/tutorials/06-agent-systems/29-harness-engineering.md) records TypeScript in five of eleven studied coding-agent harnesses. I have no evidence that those harnesses use Mastra, and I make no claim that they do [unverified]. What the fact supports is that a TypeScript runtime is mainstream; it says nothing about this framework.

## What was verified

| Item | Result |
|---|---|
| Installed | `@mastra/core@1.85.0`, `@mastra/memory@1.41.2`, `@mastra/libsql@1.31.1`, `@mastra/mcp@2.10.0`, `@mastra/observability@1.24.2`, `zod@4.6.7` in `envs/mastra` on Node v26 (core requires Node 22.13+) |
| Ran against stub | Minimal agent with OpenAI-compatible `url` model and tool round trip (2 steps, final text correct); streaming; memory with libSQL (4 messages persisted over 2 turns); tool approval via `requireApproval` and `approveToolCall`; workflow suspend and resume in the same process and across two separate processes; MCP client stdio tool call (and the validation-error path); structured output (failed with a typed error as expected for prose reply) |
| Stub proof | `GET /_log`: 30 requests over the session (shared with the AI SDK profile run), tool offered and a 2-then-4 message sequence per agent run |
| Read only | Bundled docs for agents, HITL, storage, memory, workflows, durable agents, evals, streaming, sandbox; type definitions for model config; `mastra.ai` deployment and pricing pages through a fetch tool (secondary) |
| Not verified | The 0.x to 1.0 breaking-change list; durable agents and Inngest runners; parallel tool execution; real Ollama, vLLM or llama.cpp behaviour; span persistence (zero rows seen); evals, RAG, sandbox, code mode; `ee/LICENSE` terms; the hosted platform itself; whether any studied coding-agent harness uses Mastra |
