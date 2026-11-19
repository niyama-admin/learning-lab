# PydanticAI

A type-safe Python agent framework from the Pydantic team: agents are typed objects, tools are plain functions whose schemas come from type hints, outputs are validated models, and runs can be made durable by plugging in a workflow engine.

| Field | Value |
|---|---|
| Covers | PydanticAI **2.71.0** (the `pydantic-ai-slim` package), as of 2026-11-19 |
| Language | Python 3.11 and up (package metadata lists 3.11 to 3.15) |
| Verified on | Python 3.15.2 on macOS, throwaway venv, stub model server on port 8104 |
| Evidence key | [ran] executed here, [docs] official docs, [source] installed package source or metadata, [secondary], [unverified] |

## Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version, date | 2.71.0, uploaded to PyPI 2026-11-19 (the day of writing). The previous four releases were 2.67.0 (2026-11-11), 2.68.0 (11-12), 2.69.0 (11-17), 2.70.0 (11-17). A 1.x line also still publishes (1.107.10 on 2026-11-04). | [source] PyPI JSON API https://pypi.org/pypi/pydantic-ai-slim/json |
| License | MIT | [source] package metadata `License-Expression: MIT`; GitHub API |
| Maintainer, governance | Pydantic (the company behind Pydantic and Logfire). Company-controlled open source; durable-execution integrations are co-maintained with the engine vendors. | [source] package metadata; [docs] https://pydantic.dev/docs/ai/integrations/durable_execution/overview/ |
| Languages | Python only. | [source] metadata |
| Repository | https://github.com/pydantic/pydantic-ai (about 21,000 stars, pushed the same day, not archived) | [source] GitHub API |
| Docs | https://pydantic.dev/docs/ai/ | [docs] |
| Release cadence | Very fast: five 2.x minors in the nine days before writing; 358 releases on PyPI in total. | [source] PyPI JSON API |
| Major versions and what broke | **1.0.0**: 2025-09-05. **2.0.0**: 2026-06-23 (2.0.0b1 was 2026-05-21). V2 removed many V1 names and changed defaults: MCP classes `MCPServerStdio`, `MCPServerSSE`, `MCPServerStreamableHTTP` became one `MCPToolset`; `mcp_servers=` became `toolsets=`; `OpenAIModel` became `OpenAIChatModel`; the string prefix `openai:` now means the Responses API (use `openai-chat:` for Chat Completions); `DeferredToolCalls` became `DeferredToolRequests`; prefix-less model names like `'gpt-5'` now raise; default `end_strategy` became `'graceful'`; a bare install dropped the bedrock, groq, mistral, cohere, xai, huggingface and temporal extras. | [docs] https://pydantic.dev/docs/ai/overview/migration/; [ran] the old import `from pydantic_ai.mcp import MCPServerStdio` fails here with an error naming the replacement; [source] `pydantic_ai/_removed_names.py` |
| Status | Active, fast-moving, production-stable classifier. No successor. The V2 line is the main line. | [source] metadata classifier "5 - Production/Stable"; GitHub activity |

Almost every tutorial and model-generated snippet you will find is V1 and fails on a fresh install, which pulls V2. The repository also ships `pydantic-graph`, `pydantic-evals` and `pydantic-ai-harness` as separate packages released in step ([source] `Requires-Dist: pydantic-graph==2.71.0`).

## What it is, in terms of the runtime loop

PydanticAI gives you an `Agent` object, generic over a dependencies type (`deps_type`) and an output type (`output_type`). You register tools as decorated Python functions; the framework generates JSON Schema from their signatures and docstrings, validates the model's arguments with Pydantic, feeds validation errors back to the model as a retry, runs the model-tool loop until the model produces a final output of the declared type, and returns a result object holding the output, full message history and usage. Everything beyond the base loop (instrumentation, MCP, model fallback, history processing, durability, approval handlers) is expressed as **capabilities** and **toolsets** attached to the agent ([source] `pydantic_ai/capabilities/` directory listing: `instrumentation.py`, `mcp.py`, `model_fallback.py`, `process_history.py`, `hooks.py`, `prepare_tools.py` and others). The loop itself is an internal graph (`_agent_graph.py`, built on `pydantic-graph`) [source].

The mapping below is onto the twelve duties of an agent runtime from the [languages treatise, section 2](../../languages/README.md#2-what-a-runtime-layer-actually-does).

| # | Duty | Status | API and evidence |
|---|---|---|---|
| 1 | Stream from the model, assemble partial tool calls | **Provided** | `agent.run_stream(...)` with `stream_text(delta=True)`, `agent.run_stream_events`, `stream_response`. [ran] stream through the stub returned one text chunk. Partial tool-call assembly lives in `_parts_manager.py` [source]. |
| 2 | Loop as a state machine | **Provided, but you do not own it** | Internal graph in `_agent_graph.py` [source]; stop rule is "output of the declared type produced" (`end_strategy`, default `'graceful'` in V2 [docs]). You can cap with `UsageLimits` [ran]. You cannot easily add your own states. |
| 3 | Validate tool arguments, generate schemas | **Provided, the framework's strongest point** | Schema from type hints and docstring via `@agent.tool` / `@agent.tool_plain`; Pydantic validation. [ran] A tool call with `{"x":"notint"}` for an `int` parameter produced a structured validation-error message returned to the model, and the loop continued. |
| 4 | Concurrent tools, cancellation, timeouts | **Provided** | Async tools in one model turn run concurrently; `sequential=True` on a tool is a barrier [docs]. [ran] two async tools sleeping 1 s took 1.01 s total; adding a third marked `sequential=True` brought it to 2.01 s. `Agent(tool_timeout=...)` exists as a constructor argument [source: accepted keyword; behaviour not exercised]. `_cancel.py` exists [source], not exercised. |
| 5 | Execute untrusted commands in a sandbox | **You build it** | No sandbox. A `workspaces/` package exists [source: name only]; I saw nothing that isolates a process. |
| 6 | Assemble and compact context | **Partly provided** | History processors via the `ProcessHistory` capability (V2 name; the V1 `history_processors=` argument was removed [docs]). OpenAI Responses compaction [docs]. No built-in summariser that I verified. |
| 7 | Persist sessions | **Partly provided** | Message history serialises to JSON with `ModelMessagesTypeAdapter` [ran: 2,759 bytes for a one-tool turn, restored and used as `message_history`]. A `conversation_store.py` module exists [source: name only]. |
| 8 | Permissions, approvals | **Partly provided** | `@agent.tool_plain(requires_approval=True)` plus `DeferredToolRequests` / `DeferredToolResults` / `ToolDenied` [ran, see below]. There is no rule engine (allow/deny patterns, modes); you write the policy that decides who approves. |
| 9 | Extension: MCP, plugins, hooks | **Provided** | `MCPToolset` [ran]; `capabilities/hooks.py` and custom `AbstractCapability` [source]. |
| 10 | Observability | **Provided** | OpenTelemetry instrumentation via the `Instrumentation` capability; Logfire is the first-party backend but any OTel backend works [docs]. [ran] with an in-memory span exporter: spans `invoke_agent agent`, `chat stub` (x2), `execute_tool get_weather`. Token and cost accounting: `result.usage` and `genai-prices` dependency [source]. |
| 11 | Package and distribute | **Not applicable / you build it** | A Python library. Deployment is your normal Python packaging. `import pydantic_ai` is documented to be kept light by lazy-importing MCP [source comment in `capabilities/mcp.py`]. |
| 12 | Local-model integration | **Provided via OpenAI-compatible providers** | `OpenAIChatModel` with `OpenAIProvider(base_url=...)` [ran against the stub]; `VLLMProvider`, `OpenAICompatibleProvider`, an Ollama guide [docs]. No in-process inference; you run a server. |

## Implement it

### Install and minimal agent

Install (executed; resolved to 2.71.0 with `pydantic 2.14.3`, `openai 3.55.1`, `mcp 2.3.0`):

```bash
python3 -m venv .venv && .venv/bin/pip install 'pydantic-ai-slim[openai,mcp]'
```

The slim package plus extras is the lean choice; every dependency installed on Python 3.15.2 [ran].

The minimal agent. Language: Python. **Executed [ran]** against the stub; the only difference from the file that ran is that I removed a `print(result.usage())` line, because `usage` is now a property in V2 (calling it printed a `PydanticAIDeprecationWarning`).

```python
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

model = OpenAIChatModel(
    "stub",
    provider=OpenAIProvider(base_url="http://127.0.0.1:8104/v1", api_key="x"),
)
agent = Agent(model, instructions="Answer using tools.")

@agent.tool_plain
def get_weather(city: str) -> str:
    """Return the weather for a city."""
    return "31 C and clear"

result = agent.run_sync("What is the weather in Pune?")
print(result.output)
print(result.usage)   # RunUsage(...) in V2; the V1 spelling usage() warns
```

### Run it against the stub

Command: `python -I min.py` (the `-I` flag isolates the interpreter from the current directory). Output [ran]:

```text
It is 31 C and clear in Pune.
RunUsage(input_tokens=40, output_tokens=20, requests=2, tool_calls=1)
```

The framework tallied two requests and one tool call. `GET /_log` proved the round trip [ran]:

```json
[{"path":"/v1/chat/completions","model":"stub","tools":["get_weather"],"messages":2},
 {"path":"/v1/chat/completions","model":"stub","tools":["get_weather"],"messages":4}]
```

Request one carried 2 messages (instructions plus the user prompt) and the `get_weather` tool; request two carried 4 messages, meaning the assistant tool call and the tool result were appended. A first-run banner is printed to the terminal; `PYDANTIC_AI_NO_BANNER=1` silences it [ran; variable named in the banner]. The stub was called through `/v1/chat/completions` because I chose `OpenAIChatModel`; the string form `'openai:...'` would have used the Responses API [docs].

### The nine feature checks

All snippets are Python. Everything marked [ran] was executed against the stub or against PydanticAI's built-in `TestModel`/`FunctionModel` (which need no server). Where I used a built-in fake rather than the stub, I say so.

**(a) Streaming output. [ran]** `async with agent.run_stream("...") as r: async for chunk in r.stream_text(delta=True): ...`. Against the stub this yielded one chunk, `"It is 31 C and clear in Pune."`, with the tool call completed before the text started.

**(b) Conversation memory across turns. [ran]** The framework does not keep memory for you; you pass it back:

```python
r1 = agent.run_sync("What is the weather in Pune?")
r2 = agent.run_sync("again", message_history=r1.all_messages())
```

After turn two `all_messages()` held 6 messages. There is no session object or automatic trimming.

**(c) Durable state: pause, resume, restart after a crash.** Three separate things.
- *Serialise and restore history:* [ran] `ModelMessagesTypeAdapter.dump_json(r.all_messages())` then `validate_json(...)` gave back usable history. This survives a crash only if you write the bytes somewhere between turns.
- *Pause at an approval and resume later:* [ran], see (d). The deferred request is part of the returned output, so you can store it and resume in another process by passing the history and `deferred_tool_results`.
- *Replay after a crash mid-run:* needs a durable-execution engine. The docs list nine: Temporal, DBOS, Prefect, Restate, AWS Lambda, Absurd, pgtask, Azure Durable Task, Apache Airflow. You add one to the agent's capabilities (`capabilities=[TemporalDurability()]`, similarly `DBOSDurability`, `PrefectDurability`); the engine journals model requests and wrapped tool calls, and a restarted run replays completed steps and retries the one in flight. Only one engine per agent. Changing a tool's durable placement on a deployed agent can break in-flight runs on replay [docs: https://pydantic.dev/docs/ai/integrations/durable_execution/overview/]. The installed package contains `durable_exec/` with `temporal`, `dbos`, `prefect` subpackages [source]. I did **not** run any engine (none is installable without running a Temporal or database service); mark [docs] only. Without an engine, the docs point to `StepPersistence` in `pydantic-ai-harness` [docs; not run].

**(d) Human approval before a tool runs. [ran]**

```python
from pydantic_ai import Agent, DeferredToolRequests, DeferredToolResults, ToolDenied

ag = Agent(model, output_type=[str, DeferredToolRequests])

@ag.tool_plain(requires_approval=True)
def get_weather(city: str) -> str:
    "Weather."
    return "31 C and clear"

r = ag.run_sync("weather Pune")
# r.output is a DeferredToolRequests; r.output.approvals[0] has tool_name and args
res = DeferredToolResults()
res.approvals[r.output.approvals[0].tool_call_id] = True      # or ToolDenied("no")
r = ag.run_sync(message_history=r.all_messages(), deferred_tool_results=res)
print(r.output)
```

Observed [ran]: the first run returned `DeferredToolRequests` with `('get_weather', '{"city":"Pune"}')` and the tool did **not** execute; after approving, the final text came back. The `ToolDenied("no")` path also completed and the loop carried on. The run **ends** at the approval point and you start a new run to resume, which makes cross-process approval possible; the approval UI, storage and timeouts are yours. (V1 called this `DeferredToolCalls` with `.tool_calls` [docs].)

**(e) A second tool and parallel tool calls. [ran]** Used `TestModel` (a built-in fake that calls every registered tool once). Two `async def` tools each sleeping 1 s completed in 1.01 s total, so they ran concurrently; marking a third `sequential=True` made the total 2.01 s. The stub only ever emits one call, so it cannot show this.

**(f) Calling an MCP server. [ran]** A stdio MCP server written with the `mcp` package (2.x: `from mcp.server.mcpserver import MCPServer`, not the V1 `mcp.server.fastmcp`) exposing `get_weather`:

```python
import sys
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPToolset

srv = MCPToolset({"mcpServers": {"w": {"command": sys.executable, "args": ["-I", "mcpsrv.py"]}}})
agent = Agent(model, toolsets=[srv])
print(agent.run_sync("weather Pune").output)
```

Result [ran]: the tool return in the history was `31 C and clear (mcp)`, and the final answer came back. Two V2 breaks hit me: `MCPServerStdio` no longer exists, and `mcp 2.x` renamed `FastMCP`. An `MCP` capability can also hand a URL to a provider's native MCP support [source: `capabilities/mcp.py`]. Retry and timeout defaults differ from V1 [docs].

**(g) Structured (typed) output. [ran with fakes]** `Agent(model, output_type=W)` where `W` is a Pydantic `BaseModel`. I ran this with `TestModel` only, which produced `city='a' temp='a'` (a synthetic value that satisfies the schema). That proves wiring, not that a real or small model fills it correctly. Output modes (tool-based, native `response_format`, prompted) are described in the docs [docs: https://pydantic.dev/docs/ai/models/compatible-apis/]; `NativeOutput` needs the server to support `response_format`.

**(h) Tracing and observability. [ran]**

```python
from pydantic_ai.capabilities import Instrumentation
from pydantic_ai.models.instrumented import InstrumentationSettings
agent = Agent(model, capabilities=[Instrumentation(settings=InstrumentationSettings(tracer_provider=tp))])
```

With an in-memory OpenTelemetry exporter the spans were `['chat stub', 'execute_tool get_weather', 'chat stub', 'invoke_agent agent']`. The V1 `Agent(..., instrument=...)` argument is gone (`TypeError: unexpected keyword argument 'instrument'` [ran]). Run-span usage attribute names changed in V2 (`gen_ai.aggregated_usage.*`) [docs], so V1 dashboards need updating.

**(i) Testing without a real model. [ran]** Three built-ins: `TestModel` (calls every tool once, fills outputs with synthetic data), `FunctionModel` (your Python function plays the model; I used it to emit a malformed tool call and watch the retry), and `agent.override(model=TestModel())` as a context manager to swap the model in code that has the model hard-wired [ran]. `pydantic-evals` (version 2.71.0, separate package) gives `Dataset`, `Case` and evaluators such as `Contains`; I ran one case against the stub and got `[('pune', {'Contains': True})]` [ran]. `Dataset` requires a `name` argument in this version.

## Models and local models

**Switching providers.** The model is a constructor argument or a string like `'anthropic:...'`. In V2 prefix-less names raise, and `openai:` selects the Responses API, so a stack using an OpenAI-compatible local server must say `openai-chat:` or construct `OpenAIChatModel` [docs migration page]. First-class (own classes [docs]): OpenAI (Chat and Responses), Anthropic, Google, plus extras for bedrock, groq, mistral, cohere, xai, huggingface. I ran no real provider.

**OpenAI-compatible endpoints (Ollama, vLLM, llama.cpp).**

```python
# language: Python; NOT executed (needs a real server); API per docs
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai_compatible import OpenAICompatibleProvider
model = OpenAIChatModel("model_name",
    provider=OpenAICompatibleProvider("llama-cpp", base_url="http://127.0.0.1:8080/v1", api_key="x"))
```

[unverified] as code (not run), [docs] as API: https://pydantic.dev/docs/ai/models/compatible-apis/ lists `VLLMProvider` (set `base_url` or `VLLM_BASE_URL`), `OpenAICompatibleProvider` for llama.cpp and similar, and says Ollama has its own guide. My run through `OpenAIProvider(base_url=...)` against the stub did work [ran], which is the same transport.

**Known problems with small or open models [docs unless noted].**
- vLLM must be started with `--enable-auto-tool-choice` and a model-specific `--tool-call-parser`, or tool calls will not come back structured.
- Structured output via `NativeOutput` requires `response_format` support on the server. If missing, fall back to tool output or prompted output.
- Servers that accept only one leading system message need `openai_chat_supports_multiple_system_messages=False` on the model profile; servers that end a stream without a finish reason need `openai_chat_streaming_requires_finish_reason=True`; repeating tool-call ids need `tool_call_ids_are_response_scoped=True`.
- The OpenAI client retries by itself (default `max_retries=2`) on top of agent validation retries; set `max_retries=0` for one layer. Fixed-length tuples and over-nested schemas fall back to non-strict mode. [docs]
- Wrong argument types come back to the model as a validation error [ran with `FunctionModel`]; I have not measured how often a real small model recovers. Cap loops with `UsageLimits` [ran: `request_limit=0` raised `UsageLimitExceeded`].

## State, durability and concurrency

- **State and location.** In process memory unless you serialise it [ran] or use a durable engine.  A run's state is its message history: a list of typed request and response objects with parts (text, tool call, tool return, retry prompt, thinking) [source: `messages.py`]. Agent *dependencies* (`deps`) are a separate user-supplied object passed per run and injected into tools via `RunContext`. The agent object itself is meant to be a module-level singleton, stateless between runs [docs, general design].
- **What survives a crash.** Without an engine: nothing in flight; only what you wrote after the previous run. With Temporal, DBOS or Prefect: completed model requests and wrapped tool calls are journaled and replayed; the in-flight step is retried [docs]. Tool functions must therefore tolerate being run more than once.
- **Concurrency.** `asyncio` throughout; `run_sync` is a wrapper that runs an event loop; sync tools execute in worker threads [unverified]. Tools in one turn run concurrently unless `sequential=True` [ran]. A `concurrency.py` module exists for limiting [source: name only].
- **Cancellation.** Standard asyncio cancellation; `_cancel.py` in the package [source, not exercised]. Durable engines have their own cancellation semantics.

## What you still build yourself

| Need | What the framework gives | What remains |
|---|---|---|
| Permissions | `requires_approval=True`, `DeferredToolRequests`, `ToolDenied` [ran]; tool-preparation hooks (`prepare_tools` capability [source]) | A rule engine (allow/deny patterns, modes), approval UI, audit log, per-user policy |
| Sandboxed execution | Nothing isolating | Process or container sandbox for any shell, code or file tools; network policy; resource limits |
| Context compaction | `ProcessHistory` capability hook [docs]; OpenAI-side compaction for the Responses API [docs] | The summarising/pruning policy itself and its tests |
| Cost control | `UsageLimits` (request and token caps) [ran]; usage and price data [source: `genai-prices`] | Budgets per user or tenant, alerts, model-routing by cost |
| Session store | JSON round trip [ran] | Database, indexing, forking, retention, encryption |
| Evaluation | `pydantic-evals` with `Dataset`, `Case`, evaluators [ran, tiny] | The cases, graders (LLM judges need a real model), regression history |
| Retry and fallback policy | Validation retries, `ModelRetry` exception, model fallback capability [source: `capabilities/model_fallback.py`] | Provider outage policy, idempotency of tools |

## Lock-in and escape hatches

- **How much of your code is the framework's types.** A tool is a plain function with a decorator, so tool bodies are portable. What is not portable: `RunContext[Deps]` parameters, `Agent` construction, `ModelRetry`, `DeferredToolRequests` flow, message history objects (a framework-specific JSON format with its own type adapter), capabilities, and output types if you rely on its output-mode machinery. Your stored sessions are in PydanticAI's message format; migrating them to another format needs a converter [unverified: I saw the JSON output but did not check it against a published schema; it is not an industry standard].
- **Plain-loop reimplementation.** What you actually use in a simple agent (schema from type hints, validation with retry, a loop, concurrent tool calls, history serialisation) is a few hundred lines on top of Pydantic and an OpenAI client, but the long tail is large: provider-specific message mapping, streaming of partial tool calls, structured-output modes, usage accounting and OTel semantic conventions. Quick to rebuild: the loop, schemas, retries. Slow: multi-provider adaptation, streaming assembly, durable replay.
- **Version churn is the main lock-in cost.** V1 to V2 renamed or removed dozens of public names ([docs] migration page, [ran] the removal errors). The authors made the failure helpful (every removed name raises an `ImportError` naming its replacement [source: `_removed_names.py`]), which reduces the pain but not the work. Pin an exact version in anything you deploy.
- **Migration stories.** None collected [unverified].

## Pitfalls

1. **Unpinned installs get V2, tutorials are V1.** Verified: `MCPServerStdio`, `instrument=`, `usage()` and `OpenAIModel` all fail or warn on 2.71.0 [ran].
2. **The string prefix `openai:` is now the Responses API.** A local server that only implements Chat Completions will return errors if you copy a string model id [docs].
3. **Two retry layers.** Agent validation retries plus the OpenAI client's own `max_retries=2` mean one flaky call can become several HTTP requests [docs]. Count requests in `RunUsage.requests` [ran] when debugging cost.
4. **Hidden prompt behaviour.** The framework adds tool schemas, retry messages and (in prompted output modes) its own instructions. The stub log records counts only, so I did not inspect the wording [not verified].
5. **Banner on first run** prints to the terminal; set `PYDANTIC_AI_NO_BANNER=1` for CLIs that parse stdout [ran].
6. **MCP version coupling.** PydanticAI V2 uses `fastmcp-slim` and the `mcp` package at 2.x here; the old `mcp.server.fastmcp` import no longer exists in `mcp 2.3.0` [ran]. 
7. **Churn rate.** Five minor releases in nine days; breaking behaviour can arrive in a minor version (the migration page lists defaults changed). [source] release dates.

## Choose it when / avoid it when

**Choose it when**
- You are in Python and your hard problem is the *boundary* with the model: validating arguments, typed final outputs, retries on bad arguments, dependency injection into tools. This is what it is best at and what I could confirm works [ran].
- You want durable agents on infrastructure you already run (Temporal, DBOS, Prefect, Lambda, Airflow) and prefer a maintained integration over writing a journal and replay layer [docs].
- You want a test story without a model: `TestModel`, `FunctionModel`, `override` [ran].

**Avoid it when**
- You need a sandbox, a permission rule engine or a compaction policy supplied for you; it provides none of them in a usable form.
- You need to own the loop, for example to interleave permission checks, speculative tool execution or custom stop conditions; you will be fighting an internal graph.
- You cannot tolerate API churn and cannot pin; or your team will copy V1 examples.

**Versus writing the loop yourself** (the roughly 100-line loop in the [reference specification](../../languages/README.md#8-a-language-neutral-reference-specification)). The framework buys: schema generation and validation with automatic retry (duty 3), streaming assembly (1), concurrent tool execution with a sequential escape (4), approval pause/resume (8, partly), MCP (9), OTel (10), provider adapters (12), and durable engines. It costs: a large, fast-moving dependency, a message format you do not control, a loop you cannot rearrange, and a V2 migration your code may need again. Of the reference specification's eight invariants I observed 4 (malformed argument gives an error result, no crash), 5 (concurrent reads, a sequential call waits), 6 (an unapproved call does not run) and part of 8 (stops on output and on a usage limit), all [ran]. I did not test cancellation (2, 3) or log replay (7). My recommendation for an implementer who needs a typed Python agent with real infrastructure behind it: use it, pin the exact version, and keep tools as plain functions plus a thin adapter layer so the framework stays replaceable. If your agent is mainly a coding or shell loop, write the loop and borrow Pydantic for schemas only.

## What was verified

| Item | Detail |
|---|---|
| Environment | Python 3.15.2, venv at `.../tmp/envs/pydai`; stub server on port 8104 (stopped afterwards) |
| Installed | `pydantic-ai-slim[openai,mcp]` 2.71.0, `pydantic-graph` 2.71.0, `pydantic` 2.14.3, `openai` 3.55.1, `mcp` 2.3.0, `fastmcp-slim` 4.2.2, `opentelemetry-api` 1.45.2, `logfire-api` 5.6.0; later `opentelemetry-sdk` and `pydantic-evals` 2.71.0. All installed on Python 3.15 without problems. |
| Ran against the stub | Minimal agent (output matched, `/_log` showed two requests of 2 and 4 messages); streaming; message-history round trip; approval and denial; MCP stdio; OTel spans; one `pydantic-evals` case |
| Ran against built-in fakes, not the stub | `TestModel` for parallel tools, structured output and `override`; `FunctionModel` for malformed-argument retry; `UsageLimits` |
| Read only | Durable-execution integrations (nothing run), `StepPersistence` in the harness package, model providers other than OpenAI-compatible, Ollama guide, V1 to V2 migration list (read via a fetch tool that summarises pages) |
| Could not verify | Real model behaviour with small or open models; real tool-call formats from vLLM/llama.cpp; durable replay after a kill; cancellation behaviour; sync-tool threading; exact V2 release changelog beyond PyPI dates; third-party migration stories; token overhead of the framework's own prompts (the stub log records counts only) |
