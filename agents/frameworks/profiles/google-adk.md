# Google Agent Development Kit (ADK)

Code-first agent toolkit from Google with parallel implementations in Python, TypeScript, Go, Java and Kotlin; optimised for Gemini, runs other models through adapters. Profile as of 2026-11-19.

| Field | Value |
|---|---|
| Covers | `google-adk` 2.14.1 (Python), the version actually installed and run |
| Docs | https://adk.dev/ (the old `google.github.io/adk-docs/` now 301-redirects there) [docs] |
| Python repo | https://github.com/google/adk-python [docs] |
| Run in this session | Python 3.15.2 on macOS arm64, against the stub server [ran] |
| Not run | TypeScript (installed, API inspected only), Go, Java, Kotlin (no toolchains) |

## Snapshot

| Item | Finding | Evidence |
|---|---|---|
| Python | `google-adk` **2.14.1**, released 2026-11-12; 2.0.0 GA was 2026-05-19, 2.0.0a1 on 2026-03-18; 1.0.0 was 2025-05-20; last 1.x seen was 1.34.0 (2026-05-18). Requires Python >=3.11. | [source] PyPI JSON for `google-adk`; [docs] CHANGELOG https://github.com/google/adk-python/blob/main/CHANGELOG.md |
| TypeScript | `@google/adk` **2.5.0** (npm `latest`, modified 2026-11-12). The site banner announces "ADK TypeScript 2.0 GA". Install: `npm install @google/adk`. | [source] `npm view`; [docs] https://adk.dev/ |
| Go | `google.golang.org/adk/v2` **v2.8.0** (tag 2026-11-16); the docs list both v2.x and v1.x import paths. | [source] proxy.golang.org; [docs] https://adk.dev/ |
| Java | `com.google.adk:google-adk` **1.15.0** (Maven metadata, lastUpdated 2026-11-18). Note: the Maven Central search index still showed 1.4.0, so the search API lags the repository metadata. | [source] repo1.maven.org `maven-metadata.xml` |
| Kotlin | `com.google.adk:google-adk-kotlin-core`, repo `google/adk-kotlin`, **1.6.0** (2026-11-17). Repo is small (308 stars) and has no description on GitHub. Newest of the five. | [source] Maven metadata, GitHub API |
| License | Apache-2.0 for all five repos | [source] GitHub API |
| Maintainer | Google (`github.com/google`), also the Google Cloud product line (Agent Runtime, Cloud Run) | [docs] |
| Stars (indicative) | adk-python about 22.3k, adk-go about 9.0k, adk-js about 1.5k, adk-java about 1.8k, adk-kotlin about 0.3k | [source] GitHub API, 2026-11-19 |
| Cadence | Python: v2.12.0 2026-10-13, v2.13.0 2026-10-22, v2.14.0 2026-11-07, v2.14.1 2026-11-12. README says "roughly bi-weekly". Java and Go ship roughly every two weeks. | [source] GitHub releases; [docs] README |
| Breaking changes | The 1.x to 2.0 jump introduced the graph workflow engine ("New in ADK 2.0" per the docs). Inside 2.x the CHANGELOG still carries "Breaking changes" blocks: 2.13.0 telemetry moved to OpenTelemetry GenAI semantic conventions v2 and removed the `call_llm` span (opt back with `ADK_TELEMETRY_SCHEMA_VERSION_OPT_IN=otel_semconv_1_36`); a later 2.x release made enum tool arguments arrive as enum members and restricted `VertexAiSessionService.create_session` keyword arguments. The project calls experimental APIs out as such and "graduates" them. I did not diff 1.x against 2.0 line by line. | [docs] CHANGELOG |
| Status | Active, very high velocity. No successor. | [source] |

Reading of maturity: Python is the reference implementation and the only one I exercised. Go and Java have comparable release cadence but I did not run either. TypeScript's built-in model support is Gemini and Apigee only (see Models). Kotlin is the youngest. Treat feature parity between languages as unverified; the docs page I fetched carries no parity table.

## What it is, in terms of the runtime loop

ADK is a runtime plus an authoring library. You declare an `Agent` (alias of `LlmAgent`) with a model, instruction and tools, then drive it through a `Runner` that owns a session service, artifact service, memory service and plugins. `Runner.run_async()` yields an async stream of `Event` objects (partial text, function calls, function responses, state deltas, final response); the loop of model call, tool call, append result happens inside the runner and you observe it as events. Agents compose: `SequentialAgent`, `ParallelAgent`, `LoopAgent` (workflow agents with no model of their own), `AgentTool` (call an agent as a tool), LLM-driven `transfer_to_agent` for sub-agents, and since 2.0 a graph `Workflow` of nodes (routes, fan-out and fan-in, retries and timeouts, human input, dynamic nodes). Custom agents subclass `BaseAgent`. [docs] https://adk.dev/ and [source] `google/adk/agents`, `google/adk/workflow`.

| # | Duty | ADK | API / note |
|---|---|---|---|
| 1 | Stream from the model, assemble partial tool calls | **Provided** | `RunConfig(streaming_mode=StreamingMode.SSE)` yields `partial=True` events; I saw partial function-call events and a partial then final text event [ran] |
| 2 | Loop as state machine | **Provided but opaque** | Flow classes in `google/adk/flows` [source]; you extend with callbacks and plugins, not by owning the loop |
| 3 | Validate tool args, generate schema | **Provided** | Schema from Python signature and docstring (`FunctionTool`), `FUNCTION_TOOL_ARG_VALIDATION` mentioned in the CHANGELOG [docs]; OpenAPI toolsets [docs] |
| 4 | Concurrent tools, cancellation | **Partly** | Async tool execution inside the runner; I did not observe a parallel call because the stub never emits two. Hard cancellation of subprocess trees is yours [unverified] |
| 5 | Sandboxed execution | **Partly** | `code_executors`: container, GKE, Vertex/Agent Engine sandbox, built-in (Gemini) and `unsafe_local_code_executor`; `environment` module (local, plus OpenSandbox per CHANGELOG) [source] |
| 6 | Context assembly and compaction | **Partly** | Instruction templating from session state (`{a_out}`), context caching for Gemini, `AgentControlledContextCompactor` in the TS package [source]; Python compaction config exists in `apps` [unverified] |
| 7 | Session persistence | **Provided** | `InMemorySessionService`, `DatabaseSessionService` (SQLAlchemy), `VertexAiSessionService`, plus MongoDB and Firestore services listed in the CHANGELOG [source/docs] |
| 8 | Permissions, approvals | **Partly** | `FunctionTool(fn, require_confirmation=True)` and a tool-confirmation flow; allow/deny rule engines are yours [ran for the request half] |
| 9 | Extension: MCP, plugins, hooks | **Provided** | `McpToolset`, `BasePlugin` (logging, reflect-and-retry, tool-call integrity, BigQuery analytics), agent callbacks, `SkillToolset` [source] |
| 10 | Observability | **Provided** | OpenTelemetry GenAI spans and metrics, `LoggingPlugin`, `DebugLoggingPlugin`, `AutoTracingPlugin`, dev UI [source/docs] |
| 11 | Packaging | **Provided (cloud-biased)** | `adk deploy docker`, `adk deploy cloud_run`, GKE, Agent Runtime (formerly Vertex AI Agent Engine) [docs] |
| 12 | Local models | **Provided via adapters** | `LiteLlm` wrapper, with Ollama, vLLM listed in the model docs [docs]; stub run through `LiteLlm` [ran] |

## Implement it

### Install and minimal agent

```bash
python3 -m venv adk && adk/bin/pip install google-adk litellm   # executed: ok
adk/bin/pip install "google-adk[db]" aiosqlite                   # only for DatabaseSessionService (executed)
```

Installing `google-adk` pulled in `google-genai` 2.34.0, FastAPI, OpenTelemetry SDK, SQLAlchemy Spanner bits and many Google Cloud libraries (105 installed distributions in the venv including litellm) [ran]. `litellm` 1.110.1 is **not** a dependency of the base install; you add it for any non-Gemini model [ran: the `LiteLlm` import needs it].

Executed Python program (ran against the stub on port 8103; `python -I`):

```python
import asyncio, os
os.environ["OPENAI_API_KEY"] = "stub"
os.environ["OPENAI_API_BASE"] = "http://127.0.0.1:8103/v1"
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

def get_weather(city: str) -> str:
    """Return the weather for a city."""
    return "31 C and clear"

agent = Agent(
    name="weather_agent",
    model=LiteLlm(model="openai/stub-model", api_base="http://127.0.0.1:8103/v1", api_key="stub"),
    instruction="You answer weather questions using tools.",
    tools=[get_weather],
)

async def main():
    svc = InMemorySessionService()
    runner = Runner(agent=agent, app_name="demo", session_service=svc, auto_create_session=True)
    msg = types.Content(role="user", parts=[types.Part(text="What is the weather in Pune?")])
    async for ev in runner.run_async(user_id="u", session_id="s1", new_message=msg):
        if ev.is_final_response():
            print("FINAL:", ev.content.parts[0].text)

asyncio.run(main())
```

### Run against the stub [ran]

Output: `FINAL: It is 31 C and clear in Pune.` `GET /_log` showed exactly two `POST /v1/chat/completions` calls, the first with 2 messages and tools `["get_weather"]`, the second with 4 messages (assistant tool call plus tool result added). That proves the tool round trip happened in the Python tool, not in the stub. Exact requirement to reach a non-Gemini endpoint: `pip install litellm`, model string `openai/<name>` (the `openai/` prefix tells LiteLLM to use its OpenAI-compatible route), and `api_base`. No other adapter was needed. Note `Runner(..., auto_create_session=True)`; without it you must call `session_service.create_session` first [source: parameter exists in the signature I used].

### Feature checks

| Feature | How | Status |
|---|---|---|
| (a) Streaming | `runner.run_async(..., run_config=RunConfig(streaming_mode=StreamingMode.SSE))`. Observed sequence: partial function-call event, final function-call event, function-response event, partial text, final text. Partial events have `ev.partial is True`; filter them for final text. | [ran] (stub returns non-token-chunked text but the partial/final event protocol is visible) |
| (b) Session memory across turns | Reuse the same `session_id`; `session.events` accumulate and the agent reads them. Long-term cross-session memory: `BaseMemoryService` implementations plus `LoadMemoryTool`/`PreloadMemoryTool` (names in the TS package; Python names via `google.adk.memory`). Artifacts: `google.adk.artifacts.BaseArtifactService`. | in-session [ran]; memory service [docs]; artifacts [source: base class only] |
| (c) Durable state | `DatabaseSessionService(db_url="sqlite+aiosqlite:///path")`. I ran one turn, built a **second** service instance on the same file and `get_session` returned 4 events (user, call, response, final). So a process restart resumes the transcript. Mid-turn resume after a crash is not shown; long-running tools use `LongRunningFunctionTool` and the workflow engine has node state [docs, not run] | [ran] for persistence; [docs] for mid-run resume |
| (d) Human approval | `FunctionTool(get_weather, require_confirmation=True)`. Run result: the agent emitted the call `get_weather`, then an `adk_request_confirmation` call, and the tool response was `{'error': 'This tool call requires confirmation, please approve or reject.'}`. The client must send back a function response to `adk_request_confirmation` to proceed. I ran the request half only. `require_confirmation` also accepts a callable, so approval can depend on arguments. | [ran] request; resume [docs] |
| (e) Second tool and parallel calls | Add more functions to `tools=[...]`. Parallel function calls from one model turn are executed by the flow; the stub cannot emit two calls so I did not observe it. | [unverified] |
| (f) MCP | `from google.adk.tools import McpToolset` (also exported as `MCPToolset`) with stdio, SSE or streamable-HTTP connection params. In the CHANGELOG: OAuth PKCE support in `McpToolset`. The `mcp` package was **not** installed in the venv by `google-adk`, so I did not start a server. | [docs/source]; not run |
| (g) Structured output | `Agent(output_schema=PydanticModel)`. I ran it: ADK let the plain-text stub reply through as the final response without raising. The CHANGELOG notes that an agent with `output_schema`, no own tools and a transfer target gets a synthetic `set_model_response` tool on models that cannot combine a schema with tools. So validation behaviour depends on model path; test it with your model, not a stub. | [ran] (permissive), [docs] |
| (h) Tracing | OpenTelemetry GenAI spans out of the box; Cloud Trace, BigQuery analytics plugin, `LoggingPlugin`; `adk web` dev UI shows traces. 2.13.0 changed span names (see Snapshot). | [docs/source]; not run |
| (i) Testing without a real model | Three routes: (1) point `LiteLlm` at a local stub exactly as above [ran]; (2) subclass `BaseLlm` and return canned `LlmResponse` objects [source: class exported by `google.adk.models`]; (3) `adk test FOLDER` runs pytest over recorded agent-test JSON files, with `--rebuild` to regenerate them from the real agent [source: `adk test --help`]. Evaluation: `adk eval` with eval-set JSON, metrics including final-response match, rubric-based, hallucination (`final_response_match_v2`, `hallucinations_v1`, user simulation) in `google/adk/evaluation` [source], `adk optimize` rewrites root instructions using eval results [source: command listing]. | [ran] 1, [source] 2-3 |

Additional runs (with the deprecation warning noted in Pitfalls): `SequentialAgent(sub_agents=[a, b])` with `output_key="a_out"` and the second agent's instruction `"Refine: {a_out}"` ran both agents in order against the stub and emitted one final event per agent (authors `a`, `b`) [ran]. Agent types per docs: LLM agents, workflow agents (sequential, loop, parallel), custom agents (subclass `BaseAgent`), graph workflows and managed agents [docs https://adk.dev/].

CLI surface (Python): `adk create`, `run`, `web` (FastAPI plus dev UI), `api_server`, `eval`, `eval_set`, `test`, `optimize`, `deploy`, `generate_agent_card`, `conformance`, `migrate`, `telemetry` [ran: `adk --help`]. `adk migrate` suggests tooling for upgrades but I did not test it.

## Models and local models

- **Gemini is first-class.** The README says "optimized for Gemini but model-agnostic" [docs]. Native classes: `Gemini` (Gemini API and Vertex), `Gemma`, `ApigeeLlm` (Apigee AI Gateway), `AnthropicLlm` (Claude via the Anthropic SDK, with the CHANGELOG mentioning adaptive thinking mapping) [source: files `google_llm.py`, `gemma_llm.py`, `apigee_llm.py`, `anthropic_llm.py`].
- **Everything else goes through `LiteLlm`** (`google.adk.models.lite_llm`), a wrapper over the LiteLLM library. The docs list Claude, OpenAI, Ollama, vLLM, LiteLLM and LiteRT-LM as supported [docs https://adk.dev/]. This is a second-class path in the sense that the integration is Google's thin adapter over a third-party library whose own provider quirks leak (message-format conversion, finish reasons, caching metrics; the file is thousands of lines [source]).
- **OpenAI-compatible endpoint** (Ollama `/v1`, vLLM, llama.cpp server): `LiteLlm(model="openai/<served-name>", api_base="http://host:port/v1", api_key="anything")` [ran against the stub]. For Ollama, LiteLLM also has its own `ollama_chat/` prefix [unverified here].
- **TypeScript is the narrowest.** In `@google/adk` 2.5.0 the exported model classes were `Gemini`, `ApigeeLlm`, `ChromeBuiltInLlm`, `RoutedLlm`, plus base class `BaseLlm` and `LLMRegistry`; I found no OpenAI or Anthropic class in the dist [source: `Object.keys(require('@google/adk'))` and `dist/esm/models`]. A non-Gemini model in TS therefore means writing a `BaseLlm` subclass, or using an Apigee or similar gateway. Go, Java and Kotlin model coverage: not verified.
- **Small and open models.** Nothing ADK-specific is documented for small models; the known failure surface is LiteLLM's tool-call translation and the model's own tool-call format. The `ReflectAndRetryModelPlugin` and `ReflectAndRetryToolPlugin` retry failed model or tool calls with the error fed back [source]. Verify structured output path per model (see (g)).
- **Where Gemini-only features hide:** built-in tools (Google Search grounding, code execution, URL context, Vertex AI Search/RAG), context caching, Live API streaming and audio. These do not work on other models [docs: tools list; source].

## State, durability and concurrency

State is the `Session` (events plus a key-value `state` dictionary with scopes: session, user, app, temp; the prefixes follow the ADK convention [docs, not re-verified]). Events are the source of truth; `state_delta` on events updates state. `DatabaseSessionService` stores sessions and events with SQLAlchemy; the CHANGELOG notes new PostgreSQL JSON columns are `json`, not `jsonb`, and existing tables are not migrated, which tells you schema evolution is a real operational concern [docs]. After a crash you recover the transcript and state, and re-run; I found no framework-level exactly-once guarantee for a tool that was mid-flight [unverified]. The graph `Workflow` keeps node state and can pause for human input [docs]. The programming model is Python `asyncio` (async generators from `run_async`); `Runner` also has `run`, `run_debug` and `run_live` [ran: `dir(Runner)`]. Cancelling the consumer of the async generator stops the run; subprocess cleanup is your tool's job. A2A: `to_a2a(agent)` (in `google/adk/a2a/utils/agent_to_a2a.py`) serves an agent over the Agent2Agent protocol, `RemoteA2AAgent` consumes one, and a persistent task store was added in 1.34.0; the install extra for the a2a SDK is separate [source/docs; not run]. Note the README text I fetched does not mention A2A; the docs site has A2A quickstarts for Python, Go, Java and (consume only) Kotlin.

## What you still build yourself

| Need | What ADK gives | What is left |
|---|---|---|
| Permissions | `require_confirmation`, plugin `before_tool_callback` hooks | Rule language, deny-by-default, per-path policies, audit |
| Sandboxing | Container, GKE and Agent Engine code executors; `environment` module | Shell and filesystem tools with OS-level confinement for a local coding agent; `unsafe_local_code_executor` is exactly what it says |
| Context compaction | Instruction templating; Gemini context caching | A compaction policy for non-Gemini models [Python config unverified] |
| Cost control | Token usage in events; `RunConfig` limits (the TS package has `LlmCallsLimitExceededError`) | Budgets across sessions, spend ceilings, pricing tables |
| Evaluation | `adk eval`, eval sets, user simulation, rubrics | Your own golden tasks and judge model choice |
| Crash recovery | Session persistence | Idempotent tools, a re-drive policy for half-done turns |
| Tenant isolation | Session `user_id` and `app_name` keys | Authorization on those keys; the framework trusts the caller |

## Lock-in and escape hatches

Your code sits in ADK types at several seams: `Agent`, `FunctionTool` signatures (plain Python functions are portable), `Event` and `types.Content` (these are `google.genai` types, so even the message format is Google's), session service interfaces, and plugin hooks. Plain functions as tools and instruction strings port out easily. The runner and event model do not: reproducing sessions, artifacts, workflow nodes, A2A serving, eval and the dev UI is thousands of lines, while the loop alone is a hundred. Moving between languages is also not mechanical: the five implementations are parallel codebases with separate APIs (class names above differ already: `LlmAgent`/`Agent`, `InMemoryRunner`, `McpToolset`/`MCPToolset`) [source]. Observed migration stories: none found in primary sources; the project ships `adk migrate` for its own version upgrades [ran: command exists, not exercised].

## Pitfalls

1. **Two layers of churn.** 2.0 rewrote the orchestration model and 2.x releases still list breaking changes (telemetry schema, enum arguments, session-service signatures) every few releases [docs CHANGELOG]. Pin exact versions.
2. **`LiteLlm` is optional and separate.** The base install does not include it; a missing extra raises an ImportError with the extra's name, as I saw for `google-adk[db]` [ran].
3. **Missing extras fail late.** `DatabaseSessionService` import failed with "pip install google-adk[db]" until SQLAlchemy was present; the same pattern applies to A2A and MCP (the `mcp` package was absent after install) [ran].
4. **Heavy dependency tree** (Google Cloud clients, FastAPI, OpenTelemetry), long cold install [ran].
5. **Workflow agents are being deprecated inside 2.x.** Running `SequentialAgent` printed `DeprecationWarning: SequentialAgent is deprecated in favor of Workflow and will be removed in a future version. Workflow cannot yet be used as an LlmAgent sub-agent.` So the workflow-agent family named in the docs is already on a removal path, and the replacement has a stated gap [ran]. Python 3.15 otherwise worked for every path I ran, though ADK declares only >=3.11.
6. **Hidden prompts.** Sub-agent transfer injects instructions and the `transfer_to_agent` tool into each model request; the stub log shows only the tool names I provided for a single agent but multi-agent trees add tools. Inspect requests before trusting token counts [source: `AgentTransferLlmRequestProcessor`].
7. **Gemini-first docs.** Many tool and feature pages assume Gemini; verify each against your model [docs].
8. **Confirmation protocol is client work.** `require_confirmation` makes your UI answer an `adk_request_confirmation` function call; a naive client treats the error text as the result [ran].
9. **Language parity.** TypeScript had no non-Gemini model class in 2.5.0 [source].

## Choose it when / avoid it when

Choose ADK when: you deploy on Google Cloud (Cloud Run, GKE, Agent Runtime) or call Gemini; you need ready sessions, artifacts, eval sets, a dev UI and A2A in one package; you want the same agent model in Go or Java services alongside Python; your orchestration is graph-shaped and you want a supported workflow engine.

Avoid it when: your main model is a local open model and you need tight control of tool-call formats (you inherit LiteLLM quirks); you need a small dependency footprint or a single static binary; you cannot absorb a minor-version cadence with breaking-change notes; you are on TypeScript and not using Gemini.

Against writing the loop yourself (the roughly 100-line loop in the [reference specification](../../languages/README.md#8-a-language-neutral-reference-specification)): ADK buys duties 1, 3, 7, 9, 10 and 11 plus eval and the dev UI. It costs the ability to own duties 2, 4, 5, 6 and 8: the loop is inside the runner, and permissions and sandboxing are not a policy engine. If the runtime itself is your product, hand-written loop plus selected pieces (MCP client, OpenTelemetry) is the cleaner design; use ADK for a service built on top.

## What was verified

| Item | Detail | Result |
|---|---|---|
| Install | `google-adk` 2.14.1 plus `litellm` 1.110.1 into a throwaway venv, Python 3.15.2 | [ran] ok |
| Extras | `google-adk[db]`, `aiosqlite` | [ran] ok after install |
| Minimal agent | Program above, `LiteLlm` to stub on 8103 | [ran] `FINAL: It is 31 C and clear in Pune.`, two chat-completion requests in `/_log`, tools `["get_weather"]` |
| Streaming | `StreamingMode.SSE` | [ran] partial and final events seen |
| DB sessions | sqlite, restart-style reload | [ran] 4 events reloaded |
| Confirmation | `require_confirmation=True` | [ran] request half only |
| Structured output | `output_schema` with stub | [ran] no error, no validation of non-JSON |
| Sequential workflow | two agents, `output_key` templating | [ran] |
| CLI | `adk --help`, `adk test --help` | [ran] |
| TypeScript | `npm i @google/adk@2.5.0`; listed exports only | [source] not run |
| Go, Java, Kotlin | version and cadence only (proxy, Maven, GitHub API) | [source]; no code run |
| MCP, A2A, eval, deployment, tracing | read in docs, CHANGELOG and package layout | [docs/source]; not run |
| Not verified | Parallel tool calls; mid-turn crash resume; cross-language parity; behaviour with real Gemini, Claude or Ollama | none |
