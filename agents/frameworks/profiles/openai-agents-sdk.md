# OpenAI Agents SDK

A small, provider-agnostic-in-principle library for building agent loops (agent, tools, handoffs, guardrails, sessions, tracing) in Python and TypeScript, with first-class support for OpenAI's Responses API and hosted services.

| Field | Value |
|---|---|
| Covers | `openai-agents` 0.25.0 (Python) and `@openai/agents` 0.22.0 (TypeScript) |
| Profile date | 2026-11-19 |
| Verified by | Installed both, ran the minimal agent and nine feature checks against the local stub server (see the last section) |

Evidence labels: **[ran]**, **[docs]**, **[source]**, **[secondary]**, **[unverified]** as defined in the profile spec.

## Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version, Python | `openai-agents` 0.25.0, uploaded 2026-11-18. Previous: 0.24.0 (2026-10-15), 0.23.1 (2026-10-02), 0.22.3 (2026-09-17) | [ran] pip install; dates from PyPI JSON `https://pypi.org/pypi/openai-agents/json` |
| Current version, TypeScript | `@openai/agents` 0.22.0, published 2026-11-12. Previous: 0.21.0 (2026-10-20), 0.20.0 (2026-10-08), 0.19.0 (2026-10-05) | [ran] npm install; dates from `npm view @openai/agents time` |
| License | MIT (PyPI `License-Expression: MIT`; npm `license: MIT`) | [source] package metadata |
| Maintainer and governance | OpenAI; open repository, vendor-controlled roadmap. No foundation or independent steering group found | [docs] repository `https://github.com/openai/openai-agents-python` (owner is the vendor); governance statement: not verified |
| Languages | Python (more features: sandbox agents, many session backends, LiteLLM and any-llm adapters, `agents.testing`, voice, realtime). TypeScript (same core concepts, fewer extras; I found no scripted test model in the TS package, only a `testing` folder in agents-core's dist that I did not inspect). Python needs `>=3.10` | [source] package metadata and file listing; TS parity gaps [ran]/[source] partial |
| Repository | `https://github.com/openai/openai-agents-python` and `https://github.com/openai/openai-agents-js` | [docs] PyPI project URLs; the JS URL is from memory of the npm homepage, not checked [unverified] |
| Docs | `https://openai.github.io/openai-agents-python/` (Python), `https://openai.github.io/openai-agents-js/` (TS) | [docs] |
| Release cadence | Python: about one minor per month recently (0.22.1 on 2026-09-08, 0.23.1 on 10-02, 0.24.0 on 10-15, 0.25.0 on 11-18), many patch releases (125 releases on PyPI). TS: roughly every 1 to 3 weeks | [ran] PyPI and npm metadata |
| Versioning and breaking changes | Pre-1.0 "modified semver" `0.Y.Z`: minor bumps may break non-beta public interfaces; patch bumps do not. The docs advise pinning. Last breaking changes: 0.22.0 (non-streaming Responses calls with status `failed` or `incomplete` now raise `ModelBehaviorError`; `OpenAIProvider` rejects `openai_client` combined with `organization` or `project`; output guardrails that block terminal tool output replace it with fixed text); 0.21.0 (requires `openai>=3,<4`; custom `http_client` must move from `httpx` to `httpx2`); 0.20.0 (default model changed to `gpt-5.6-luna`; MCP v2 forces `httpx2`); 0.16.0 (default model changed from `gpt-4.1` to `gpt-5.4-mini`); 0.15.0 (refusals raise `ModelRefusalError`); 0.9.0 (Python 3.9 dropped); 0.8.0 (sync tools on worker threads); 0.6/0.7 (handoff history format changed). The release page I fetched stopped at 0.22.0, so I did not see notes for 0.23 to 0.25 | [docs] `https://openai.github.io/openai-agents-python/release/` |
| Status | Active. No successor named. There is no 1.0 yet, so there is no "last two major versions" to compare; the relevant churn is the 0.x minors above | [docs]/[ran] |

Default-model fact worth remembering: if you do not set a model, Python uses `OPENAI_DEFAULT_MODEL` or `gpt-5.6-luna` [source] `agents/models/default_models.py`. Always set the model explicitly.

## What it is, in terms of the runtime loop

The SDK is a loop runner. `Runner.run` (Python) or `run` (TS) takes an `Agent` (instructions, model, tools, optional handoffs, guardrails and output type), calls the model, executes the tool calls it returns, appends results, and repeats until the model produces a final output, a handoff transfers control to another agent, or `max_turns` (default 10, [source] `run_config.py`) is hit. Everything exchanged is represented as Responses-API "items" (messages, function calls, function outputs, reasoning), even when the actual wire protocol is Chat Completions; a converter does the translation. The loop is a bounded `while` inside the runner, not an exposed state machine, but its state can be serialized (`RunState`) when it pauses for approval.

| # | Runtime duty | Status | API name in this framework |
|---|---|---|---|
| 1 | Stream from the model | Provided | `Runner.run_streamed()` then `result.stream_events()` (Python); `run(agent, input, { stream: true })` (TS). Both [ran] on chat completions. Raw events plus higher level `run_item_stream_event` (`tool_called`, `tool_output`, `message_output_created`) |
| 2 | Loop as state machine | Partly | Loop is internal; you get `max_turns`, `RunHooks`/`AgentHooks` lifecycle callbacks, `tool_use_behavior` and `RunState` for pause and resume. No user-visible transition table |
| 3 | Validate tool args, generate schemas | Provided | `@function_tool` derives JSON Schema from type hints and docstring (Pydantic); TS `tool({ parameters: z.object(...) })` uses Zod 4. Bad JSON from the model returned an error result and the run continued [ran] |
| 4 | Concurrent tools, cancellation | Partly | Parallel tool calls run concurrently (two 0.2 s async tools interleaved: `start Pune, start Delhi, end Pune, end Delhi`) [ran]. No read/write distinction: writers are not serialized for you. Cancellation is whatever asyncio or `AbortSignal` cancellation does; tool `timeout` fields exist [source] `tool.py` |
| 5 | Sandboxed execution | Partly | Python has beta "sandbox agents" (`agents/sandbox`, backends: Unix-local, Docker, plus E2B, Modal, Daytona, Cloudflare, Blaxel under `extensions/sandbox`) [source] file listing; I did not run them. Local function tools run in your process with no sandbox |
| 6 | Context assembly and compaction | Partly | Instructions, `ModelSettings`, `call_model_input_filter`, `OpenAIResponsesCompactionSession` (server-side compaction, needs Responses API) [source] `memory/openai_responses_compaction_session.py`. No client-side summarizer for arbitrary models |
| 7 | Session persistence | Provided | `Session` protocol; `SQLiteSession`, `OpenAIConversationsSession`, plus SQLAlchemy, Redis, MongoDB, Dapr, encrypted wrappers under `extensions/memory` [source]. SQLite and in-memory [ran] |
| 8 | Permissions | Partly | Per-tool `needs_approval` (bool or function) with `result.interruptions` and `state.approve()` / `reject()` [ran]. No rules engine, no modes; policy is yours |
| 9 | Extension (MCP, plugins, hooks) | Provided for MCP and hooks | `MCPServerStdio`, streamable HTTP, SSE, hosted MCP tool [ran for stdio in both languages]; lifecycle hooks; no plugin or skill packaging concept |
| 10 | Observability | Provided, with a catch | Built-in tracing (trace, agent, generation, function, handoff, guardrail spans) [ran]. Default exporter sends to OpenAI's backend; see Pitfalls. Third-party processors exist [docs] |
| 11 | Packaging | Library only | Python wheel pulls openai, pydantic, mcp, httpx2, starlette, requests (104 MB site-packages in a fresh venv, including the openai client) [ran]; TS 88 MB `node_modules` [ran]. You package your own app |
| 12 | Local model integration | Partly | Any OpenAI-compatible endpoint through `set_default_openai_client` or `OpenAIChatCompletionsModel`; optional LiteLLM and any-llm adapters marked beta [docs]. Quality of tool calling is the model's, not the SDK's |

## Implement it

### Install and minimal agent

```bash
# Python (executed)
python3 -m venv .venv && .venv/bin/pip install openai-agents      # resolved to openai-agents 0.25.0, openai 3.55.1 on Python 3.15.2
# TypeScript (executed)
npm install @openai/agents zod                                    # resolved to @openai/agents 0.22.0, zod 4.6.7 on Node 26
```

Python program, executed against the stub (language: Python, [ran]). Under 60 lines; the stub URL is the only thing you would change for a real endpoint.

```python
import asyncio
from openai import AsyncOpenAI
from agents import (Agent, Runner, function_tool, set_default_openai_client,
                    set_default_openai_api, set_tracing_disabled)

# Point the SDK at any OpenAI-compatible server. Responses API is the default wire protocol;
# many non-OpenAI servers only implement chat completions, so switch it.
set_default_openai_client(AsyncOpenAI(base_url="http://127.0.0.1:8102/v1", api_key="stub"))
set_default_openai_api("chat_completions")   # or "responses"
set_tracing_disabled(True)   # otherwise traces go to api.openai.com

@function_tool
def get_weather(city: str) -> str:
    """Return the current weather for a city."""
    return "31 C and clear"

agent = Agent(name="Weather", instructions="Use tools to answer.",
              model="stub-model", tools=[get_weather])

async def main():
    result = await Runner.run(agent, "What is the weather in Pune?")
    print(result.final_output)

asyncio.run(main())
```

TypeScript program, executed against the stub (language: JavaScript ES module, [ran]):

```javascript
import OpenAI from 'openai';
import { Agent, run, tool, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents';
import { z } from 'zod';

setDefaultOpenAIClient(new OpenAI({ baseURL: 'http://127.0.0.1:8102/v1', apiKey: 'stub' }));
setOpenAIAPI('chat_completions');          // or 'responses'
setTracingDisabled(true);

const getWeather = tool({
  name: 'get_weather',
  description: 'Return the current weather for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => '31 C and clear',
});

const agent = new Agent({ name: 'Weather', instructions: 'Use tools to answer.',
                          model: 'stub-model', tools: [getWeather] });
const result = await run(agent, 'What is the weather in Pune?');
console.log(result.finalOutput);
```

### Run it against the stub

I started `node stub/server.mjs 8102` and ran both programs with both wire protocols.

- Python, Responses API: printed `It is 31 C and clear in Pune.` [ran]. `GET /_log` showed two requests to `/v1/responses`, both listing the tool `get_weather`, with 1 then 3 input items (the second carries the tool call and its output): that is the tool round trip [ran].
- Python, Chat Completions: same output; log shows `/v1/chat/completions` twice, 2 then 4 messages [ran].
- TypeScript, both `responses` and `chat_completions`: same output and same log pattern [ran].
- Python 3.15 needed no workaround [ran].

### Feature checks

All snippets below were run against the stub unless marked otherwise. Python names first; TS equivalents given.

**(a) Streaming [ran, both languages].** Chat Completions streaming against the stub works; the Responses stub does not stream, so streaming on the Responses path was not tested.

```python
r = Runner.run_streamed(agent, "What is the weather in Pune?")
async for ev in r.stream_events():       # ev.type: raw_response_event | run_item_stream_event | agent_updated_stream_event
    ...
print(r.final_output)
```
TS: `const s = await run(agent, input, { stream: true }); for await (const e of s) {...}; await s.completed;`. Observed event kinds: `raw_model_stream_event`, `run_item_stream_event` with names `tool_called`, `tool_output`, `message_output_created`.

**(b) Conversation memory [ran].** `session = SQLiteSession("id", "file.db")` then `Runner.run(agent, text, session=session)`. Two turns left 6 items in the session (user, call, output, assistant, user, assistant) [ran]. TS: `new MemorySession()` and `run(agent, text, { session })` gave 6 items too [ran]. Other backends listed in [source] `extensions/memory/`. `OpenAIConversationsSession` stores history in OpenAI's servers [source]; avoid it if you do not want that.

**(c) Durable state: pause, resume, crash [ran for pause and resume across serialization; crash recovery not provided].** A run that stops for approval returns `result.interruptions`. `result.to_state().to_json()` produced a 6.4 kB (Python) / 5.3 kB (TS `state.toString()`) blob; I rebuilt it with `RunState.from_json(agent, blob)` / `RunState.fromString(agent, str)`, approved, and `Runner.run(agent, state)` finished with the right answer [ran]. That is durable pause and resume if you write the blob to disk. It is not crash recovery: the loop does not checkpoint after each tool call on its own. Use the Session for history and write your own checkpoint of `RunState` at interruptions.

**(d) Human approval before a tool runs [ran].**

```python
@function_tool(needs_approval=True)          # or an async callable (ctx, params, call_id) -> bool
def get_weather_gated(city: str) -> str: ...
r = await Runner.run(agent, "...")
for item in r.interruptions: print(item.name)     # pending approvals
state = r.to_state()
for item in state.get_interruptions(): state.approve(item)    # or reject
r = await Runner.run(agent, state)
```
TS: `tool({ needsApproval: true, ... })`, `result.interruptions`, `state.approve(item)`, `run(agent, state)` [ran].

**(e) Second tool and parallel calls [ran].** With `agents.testing.ScriptedModel` I scripted a model reply with two `get_weather` calls in one turn; execution order was `start Pune, start Delhi, end Pune, end Delhi`, so async tools run concurrently [ran].

**(f) MCP [ran, stdio, both languages].**

```python
from agents.mcp import MCPServerStdio
async with MCPServerStdio(params={"command": "python", "args": ["mcp_srv.py"]}) as srv:
    agent = Agent(name="M", model="stub", mcp_servers=[srv])
    print((await Runner.run(agent, "What is the weather in Pune?")).final_output)
```
The MCP tool appeared in the stub's tool list and the run finished. TS: `new MCPServerStdio({command, args})`, `await srv.connect()`, `new Agent({ mcpServers: [srv] })` [ran]. Gotcha: with `mcp` 2.x installed my first server crashed because `mcp.server.fastmcp` was renamed `mcp.server.mcpserver.MCPServer`; the SDK's own requirement is `mcp>=1.30,<3` excluding 2.0 and 2.1 [source] METADATA.

**(g) Structured output [ran partly].** `Agent(output_type=MyPydanticModel)` (TS: `outputType: zodSchema`). On Responses and OpenAI Chat it uses JSON Schema response format. Against the stub, which returns plain text, the run raised `ModelBehaviorError` (invalid JSON), which confirms the validation path [ran]; a successful typed result needs a model that returns JSON, which I did not test. Docs warn some providers support only `json_object` [docs].

**(h) Tracing [ran for the hook, docs for the exporter].** Custom processor via `set_trace_processors([MyProcessor()])` received `trace`, then spans `generation`, `function`, `turn`, `agent`, `task` [ran]. By default the SDK installs an exporter that posts to `https://api.openai.com/v1/traces/ingest` [source] `tracing/processors.py`; disable with `set_tracing_disabled(True)`, env `OPENAI_AGENTS_DISABLE_TRACING=1` or `RunConfig.tracing_disabled` [docs] `https://openai.github.io/openai-agents-python/tracing/`.

**(i) Test without a real model [ran, Python].** `agents.testing.ScriptedModel(steps=[ModelStep(output=[function_call(...)]), ModelStep(output=[assistant_message("done")])])` passed as `Agent(model=...)`; it errors if called after the script is exhausted [source]. I also scripted malformed tool arguments (`"{bad"`): the run did not crash and the tool output the model saw was the generic text `An error occurred while running the tool.`, so the model gets no hint about what was wrong, and you may want a custom `failure_error_function` [ran; hook name from [source], not exercised]. TS: I did not find an equivalent public scripted model; write a small `Model` implementation or point at the stub [unverified].

### Primitives you will meet

- Agent: instructions, model, tools, `handoffs`, guardrails, `output_type`, `model_settings` [docs].
- Handoff: model-visible tool named `transfer_to_<agent>`; control moves to the other agent, with a configurable input filter (0.6 and 0.7 changed how history is passed) [docs] release page.
- Guardrails: input guardrails on the first agent, output guardrails on the last, tool guardrails around function tools; a trip raises an exception [source] `guardrail.py`, `tool_guardrails.py`.
- `Agent.as_tool()`: use an agent as a tool of another (manager pattern) [source] 0.9.0 note.
- Hosted tools (web search, file search, code interpreter, image generation, computer use, hosted MCP, tool search): Responses API only, executed on OpenAI's servers [docs] models page.

## Models and local models

- Pointing at another endpoint: `set_default_openai_client(AsyncOpenAI(base_url=...))` globally, `RunConfig(model_provider=...)` per run, or `Agent(model=OpenAIChatCompletionsModel(model=..., openai_client=...))` per agent [docs] `https://openai.github.io/openai-agents-python/models/`. The first path [ran].
- Ollama, vLLM and llama.cpp server: use the OpenAI-compatible URL (for Ollama `http://localhost:11434/v1`, for vLLM `http://host:8000/v1`) with `chat_completions`. I did not run these servers; I only ran the stub [unverified for the real servers]. The SDK cannot do better than what the server returns for tool calls.
- Wire protocol default: Responses API. The docs warn that many providers return 404 for it, so call `set_default_openai_api("chat_completions")` [docs]. Verified both paths against the stub [ran].
- Adapters: `openai-agents[litellm]` (`litellm/...` names) and `openai-agents[any-llm]` for broader provider coverage; marked beta and best-effort in the docs; the LiteLLM serializer patch wraps a private LiteLLM API [docs]. Not run [unverified].
- First-class vs second-class: OpenAI models on Responses are first-class (hosted tools, server compaction, conversation storage, reasoning items). Chat Completions-compatible servers get function tools, handoffs, guardrails, sessions (the local ones), MCP and tracing, but no hosted tools. Anthropic, Gemini and others go through LiteLLM or any-llm or their own OpenAI-compatible endpoints and are second-class [docs].
- Known problems with small or open models [docs unless noted]: structured output may 400 if the server only supports `json_object`; JSON from small models may be malformed (the SDK raises `ModelBehaviorError`, tested with the stub [ran]); streamed tool-call chunks from some servers are unreliable, so set `buffer_streamed_tool_calls=True`; a `finish_reason="length"` reply with no content raises `ModelBehaviorError`; usage metrics need `ModelSettings(include_usage=True)` on adapters; strip images for text-only models; use `strict_feature_validation=True` to fail fast when you configured hosted tools a backend cannot run.
- Retries: runner-managed model retries are opt-in (`ModelSettings.retry`) [source] `model_settings.py`. The underlying `openai` client has its own default retry count, which applies silently [unverified for the exact number in this version].

## State, durability and concurrency

- Where state lives: your process memory for a run; the conversation in a `Session` backend (SQLite file, Redis, SQL, Mongo, Dapr, or OpenAI's servers) [source]; paused runs in a `RunState` JSON blob you store [ran].
- What survives a crash: whatever the Session persisted after the last completed turn. In my test the session got all six items after each run completed; I did not kill a process mid-turn, so mid-turn behaviour (is the tool call persisted before the tool finishes?) is not verified. Treat mid-turn crash as "redo the turn".
- Concurrency: Python is asyncio. Async function tools run concurrently [ran]. Since 0.8.0 synchronous tools run on worker threads [docs]. TS is promise-based on one event loop. There is no scheduler for read-only versus write tools; you add a lock around writers.
- Cancellation: cancel the asyncio task or abort the signal; I did not test that a streamed run cleans up its HTTP request or child processes [unverified]. `MCPServerStdio` subprocesses are cleaned up by the async context manager [source, not stress-tested].

## What you still build yourself

| Need | What the SDK gives toward it |
|---|---|
| Permission policy (rules, modes, per-path or per-argument decisions) | `needs_approval` callable per tool, `RunState` approve/reject, tool guardrails. You write the policy engine and the approval UI |
| Sandboxing of shell and file tools | Beta sandbox agents (Python) and provider backends; no sandbox for ordinary function tools |
| Context compaction for non-OpenAI models | Hooks (`call_model_input_filter`, trimming extension `tool_output_trimmer`); server compaction only on Responses. Summarizer is yours |
| Cost and budget control | Per-run `usage` object; no budget stop. Add a `RunHooks` counter and raise |
| Crash-safe checkpoints | RunState serialization at interruptions only |
| Evaluation harness | `ScriptedModel` for deterministic tests; trace export for datasets. Graders are yours |
| Retry and rate-limit policy | Opt-in `ModelSettings.retry`; otherwise the underlying client's defaults |
| Prompt and tool-result safety (injection, secrets) | Input and output guardrails as hooks; policy is yours |

## Lock-in and escape hatches

- Surface in your code: `Agent`, `Runner`, `function_tool`, `Session`, `RunState`, and item types (`ToolCallItem`, `MessageOutputItem`). Prompts, tools (plain functions) and MCP servers move with you.
- Hard lock-in spots: (1) hosted tools and server-side compaction and conversations, which only exist on OpenAI [docs]; (2) tracing defaults and the Traces dashboard; (3) the Responses item schema inside persisted sessions and serialized `RunState` (a blob written by one version may not load in the next, since 0.x minors break; not tested [unverified]); (4) defaults tied to OpenAI models, such as the default model and reasoning settings.
- Removal cost: such a loop (model call, tool dispatch, append, stop) is about 100 lines (the language-neutral reference spec, [section 8](../../languages/README.md#8-a-language-neutral-reference-specification)). What the SDK adds over that loop: JSON Schema generation from type hints, MCP client, session backends, handoffs, tracing spans, approval pause. Of those, MCP client and schema generation are the pieces that are tedious to redo; the rest is small. Rewrite cost for a team using only function tools, sessions and tracing: a few days. With handoffs plus guardrails plus hosted tools: weeks.
- Migration stories: Anthropic links a cookbook recipe mapping OpenAI Agents SDK primitives onto the Claude Agent SDK [docs] `https://platform.claude.com/cookbook/claude-agent-sdk-04-migrating-from-openai-agents-sdk` (not read). No independent reports collected.

## Pitfalls

1. **Tracing uploads by default.** Prompts, tool arguments and outputs are captured in spans (sensitive data included unless turned off) and sent to OpenAI's trace backend even when your model is local, if an OpenAI key is present; without one you get 401 noise [docs] tracing page. For a customer-data product set `set_tracing_disabled(True)` first thing, or replace processors with `set_trace_processors([...])` [ran for the processor hook]. The docs say tracing is unavailable under zero data retention.
2. **Responses API default.** Pointing `base_url` at Ollama or vLLM without `set_default_openai_api("chat_completions")` hits `/v1/responses`, which many servers lack [docs]. The stub supports both, so it would not catch this.
3. **Pre-1.0 churn.** Minor releases break (listed in the snapshot). The release page lists a breaking change or migration note in 14 of the 22 minors from 0.1 to 0.22 [docs]. Pin `openai-agents==0.25.*`.
4. **Default model change.** 0.16.0 and 0.20.0 both changed the default model silently [docs]. Set `model=` everywhere.
5. **Tool errors are opaque to the model.** Malformed arguments reached it only as `An error occurred while running the tool.` [ran].
7. **Python heavy dependency set.** Starlette, PyJWT, python-multipart and requests arrive in a library that only needs HTTP and JSON, because of the voice, realtime and sandbox features [source] METADATA.
8. **Feature skew between languages.** Sandbox agents, `ScriptedModel`, many session backends and the adapters are Python-first [source].
9. **Unverified on real servers.** Everything here was exercised against a deterministic stub. Tool-call quality of Ollama, vLLM or llama.cpp models, streaming tool-call assembly from them, and retry behaviour under 429s were not tested.

## Choose it when / avoid it when

Choose it when:
- You are on OpenAI models (Responses API) and want hosted web search, file search, code interpreter or server compaction without writing them.
- You want a small library (agent, tools, handoffs, guardrails, sessions) that does not dictate a project layout or a CLI, in Python or TypeScript.
- You want approval pause and resume with serializable state in a few lines (shown above).
- You will run mostly against OpenAI-compatible endpoints and accept `chat_completions` mode, with your own tracing processor.

Avoid it when:
- You need a coding-agent runtime (file edit tools, shell, permission modes, skills): you would build all of it (compare the Claude Agent SDK profile).
- Data must never leave your boundary and you cannot audit that no trace or hosted call fires; a hand-written loop is easier to reason about.
- You need crash-safe, step-level durable execution: the SDK only serializes at approval pauses.
- You depend on features of small open models that need controlled tool-call parsing, constrained decoding or custom chat templates: you will fight the item conversion layer.

Versus writing the loop yourself (about 100 lines): the SDK buys MCP client, schema generation from types, tested streaming assembly across two wire protocols, session adapters, approval pause with a serializable blob, tracing spans and a scripted test model. It costs a pre-1.0 dependency with roughly monthly breaking minors, an OpenAI-shaped item model, a heavy Python dependency tree and a default tracing exporter you must remember to turn off. If your product is the runtime (permissions, compaction, sandbox, local-model tuning), the SDK covers duties 1, 3, 7, 9 and 10 only partially and the rest you write anyway, so the case for it weakens; if your product uses an agent loop as a component, it is a reasonable default.

## What was verified

| Item | Result |
|---|---|
| Installed | Python 3.15.2 venv: `openai-agents` 0.25.0, `openai` 3.55.1, `mcp` 2.3.0, `pydantic` 2.14.3. Node v26.12.0: `@openai/agents` 0.22.0 (deps `@openai/agents-core`, `-openai`, `-realtime` all 0.22.0, `openai` ^7.45.1), `zod` 4.6.7 |
| Ran: minimal agent | Python and TS, Responses and Chat Completions, all returned `It is 31 C and clear in Pune.`; `/_log` shows two requests per run with the tool listed and growing history |
| Ran: features | Streaming (chat), SQLite and in-memory sessions, approval pause with serialize and resume (both languages), tool-call concurrency with `ScriptedModel`, malformed tool args, stdio MCP (both languages), structured output failure path, custom trace processor, `ScriptedModel` |
| Read only | Release notes, models and tracing docs pages, package metadata, source layout (sandbox, memory backends, adapters, default model, tracing endpoint) |
| Could not check | Real Ollama, vLLM or llama.cpp servers; real OpenAI hosted tools; Responses streaming (stub lacks it); LiteLLM and any-llm adapters; sandbox agents; mid-turn crash recovery; cancellation cleanup; TS scripted testing; successful typed structured output; release notes for 0.23 to 0.25; governance statements; the Temporal integration |
