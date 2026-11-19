# LangChain

LangChain is an open-source Python and JavaScript library of model, tool and message abstractions. Since the 1.0 line its agent entry point, `create_agent`, returns a LangGraph graph with a middleware layer on top.

| Field | Value |
|---|---|
| Covers | `langchain` 1.5.2 (Python), with `langchain-core` 1.8.3, as installed and run on 2026-11-19 |
| Profile date | 2026-11-19 |
| Companion profile | [langgraph.md](langgraph.md) (the engine underneath) |
| Primary language | Python |

## Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version, Python | `langchain` 1.5.2, uploaded 2026-11-18; `langchain-core` 1.8.3 (2026-11-18); `langchain-openai` 1.8.3 | [ran] pip install resolved these; [source] https://pypi.org/pypi/langchain/json |
| Current version, JS | `langchain` 1.6.7 on npm, published 2026-11-18; `@langchain/core` 1.4.2; `@langchain/langgraph` 1.7.5 (2026-11-17) | [source] https://registry.npmjs.org/langchain/latest (not installed or run) |
| License | MIT (Python and JS packages; GitHub repo reports MIT) | [source] PyPI and npm metadata, GitHub API |
| Maintainer and governance | LangChain, Inc. (a venture-backed company) owns the `langchain-ai` GitHub organisation. Community contributes, but there is no foundation or independent governance that I verified | [source] repo `langchain-ai/langchain`; governance statement not found, so "no foundation" is [unverified] |
| Languages | Python is primary. JavaScript/TypeScript has a parallel package (`langchain`, `@langchain/langgraph`) on its own version numbers. The docs have separate `oss/python` and `oss/javascript` trees. Relative maturity: the JS version numbers are in the same 1.x range, but I did not compare feature parity; treat parity as [unverified] | [docs] https://docs.langchain.com/oss/python/langchain/overview; [source] npm |
| Python requirement | PyPI says `>=3.11,<4.0` for `langchain` 1.5.2. The v1 migration page says 3.10+. The package metadata is newer than the page, so trust the metadata | [source] PyPI; [docs] https://docs.langchain.com/oss/python/migrate/langchain-v1 |
| Repository | https://github.com/langchain-ai/langchain (about 150k stars, last push 2026-11-19 at query time) | [source] GitHub API on 2026-11-19 |
| Docs | https://docs.langchain.com/oss/python/langchain/overview | [docs] |
| Release cadence | `langchain` 1.0.0 on 2025-10-17, 1.1.0 on 2025-11-24, 1.2.0 on 2025-12-15, 1.3.0 on 2026-05-12, 1.4.0 on 2026-09-03, 1.5.0 on 2026-11-11, 1.5.2 on 2026-11-18. So minor releases roughly every one to five months, with patch releases between | [source] PyPI release history |
| Breaking-change history | Last two majors: 0.3.0 (2024-09-13) to 1.0.0 (2025-10-17). In 1.0 the `langchain` namespace was trimmed: legacy chains, retrievers, indexing, the hub and community re-exports moved to `langchain-classic`; `create_react_agent` was replaced by `create_agent`; `prompt` became `system_prompt`; the streamed node name `agent` became `model`; static context moved from `config["configurable"]` to `context=`; custom state must be a `TypedDict`; prompted structured output was removed; Python 3.9 dropped. Before that, 0.2 to 0.3 (2024-09) moved to Pydantic 2 | [docs] migration guide https://docs.langchain.com/oss/python/migrate/langchain-v1; 0.3 Pydantic move is [unverified] (recalled) |
| Status | Active. The agent API is `create_agent`. Legacy `AgentExecutor`, chains and similar live in `langchain-classic` 1.0.8 (2026-06-10), kept for compatibility | [source] PyPI; [docs] migration guide |

## What it is, in terms of the runtime loop

LangChain is two things that are easy to confuse. First, a library of **abstractions**: chat model classes with one interface across providers (`ChatOpenAI` and others), message types, a `@tool` decorator that builds a JSON Schema from a Python function, output parsers, and loaders for vector stores and retrievers. Second, since 1.0, an **agent constructor**, `create_agent(model, tools, middleware=..., ...)`. That constructor does not contain its own loop. It builds and returns a LangGraph `CompiledStateGraph` with a model node, a tools node and conditional edges. [ran] `type(agent)` printed `langgraph.graph.state.CompiledStateGraph`. [docs] The v1 guide says to use `langchain.agents.create_agent`. So the loop, persistence, interrupts and streaming are LangGraph features; LangChain adds the model/tool/message layer and the **middleware** system (hooks around the model call, the tool call and the loop boundaries).

Mapping onto the twelve runtime duties ([languages treatise section 2](../../languages/README.md#2-what-a-runtime-layer-actually-does)):

| # | Duty | Status | API and notes |
|---|---|---|---|
| 1 | Stream from the model | Provided | `agent.stream(..., stream_mode="messages")` yielded `AIMessageChunk` objects tagged with node `model` [ran]. Partial tool-call assembly is done in the chat model class |
| 2 | Loop as a state machine | Provided | The graph model -> tools -> model until no tool calls [ran, 3 updates: model, tools, model]. Stop conditions beyond "no tool calls": `ModelCallLimitMiddleware`, `ToolCallLimitMiddleware` exist [source: listed in `langchain.agents.middleware`, not run] |
| 3 | Validate tool arguments, generate schemas | Provided | `@tool` plus Pydantic. [ran] Bad args `{"wrong": 1}` came back to the model as a `ToolMessage` "Error invoking tool ... city: Field required. Please fix the error and try again." and the loop continued |
| 4 | Concurrent tools with cancellation | Partly provided | Two tool calls in one AI message both ran and produced two `ToolMessage`s [ran, fake model]. Whether they run in parallel threads or sequentially I did not measure. Per-tool timeouts and subprocess-tree cancellation: you build them. Task cancellation follows asyncio cancellation [unverified] |
| 5 | Sandboxed execution | Partly provided | Middleware classes `ShellToolMiddleware`, `HostExecutionPolicy`, `DockerExecutionPolicy`, `CodexSandboxExecutionPolicy` exist [source: names only, not run]. Treat sandbox quality as [unverified] |
| 6 | Context assembly and compaction | Partly provided | `SummarizationMiddleware`, `ContextEditingMiddleware` / `ClearToolUsesEdit`, `dynamic_prompt` exist [source: names only, not run]. You decide thresholds and test quality |
| 7 | Session persistence | Provided (via LangGraph) | `checkpointer=` argument, `thread_id` in config [ran: InMemorySaver 2 turns -> 6 messages; SqliteSaver reload -> 4 messages] |
| 8 | Permissions | Partly provided | `HumanInTheLoopMiddleware(interrupt_on={...})` for approve/edit/reject [ran]. Rule engines, modes and deny lists: you build them, perhaps as `wrap_tool_call` middleware [ran for a logging version] |
| 9 | Extension: MCP, plugins, hooks | Partly provided | Hooks are middleware [ran]. MCP is a separate package `langchain-mcp-adapters` 0.3.2 with `MultiServerMCPClient` [ran, stdio]. No plugin or skill system in `langchain` itself that I found [unverified] |
| 10 | Observability | Partly provided | Callbacks are built in. The easy path is LangSmith (hosted), enabled by environment variables. It was off in my run [ran: `LANGSMITH_TRACING` unset, no network calls to LangSmith observed; I did not capture traffic, so "no calls" is [unverified]]. Self-built tracing through callbacks or OpenTelemetry: possible, not tried |
| 11 | Packaging | You build it | It is a Python library (67 installed distributions in my venv including MCP and SQLite saver, see Pitfalls). No binary packaging story |
| 12 | Local and open models | Partly provided | Any OpenAI-compatible URL through `ChatOpenAI(base_url=...)` [ran against stub]. Dedicated `langchain-ollama` and others exist as packages [unverified: not installed] |

## Implement it

### Install and minimal agent

```bash
# executed: Python 3.15.2 venv, all packages installed without errors
python3 -m venv .venv
.venv/bin/pip install langchain langchain-openai
```

```python
# Python, EXECUTED against the stub server (http://127.0.0.1:8101/v1)
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_openai import ChatOpenAI

@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return "31 C and clear"

model = ChatOpenAI(model="stub", base_url="http://127.0.0.1:8101/v1", api_key="x")
agent = create_agent(model, tools=[get_weather])
out = agent.invoke({"messages": [{"role": "user", "content": "What is the weather in Pune?"}]})
print(out["messages"][-1].content)
```

[ran] Output: `It is 31 C and clear in Pune.` The stub log (`GET /_log`) showed two requests to `/v1/chat/completions`, the first with `tools: ["get_weather"]` and 1 message, the second with 3 messages (user, assistant tool call, tool result). That proves the round trip. Against a real endpoint, replace `base_url` and key, or pass a model string such as `"openai:gpt-4o-mini"` (string form: [docs], not run). `create_agent` signature as installed [source, via `inspect.signature`]: `(model, tools=None, *, system_prompt=None, middleware=(), response_format=None, state_schema=None, context_schema=None, checkpointer=None, store=None, interrupt_before=None, interrupt_after=None, debug=False, name=None, cache=None, transformers=None)`.

A warning appears under Python 3.15: `langsmith` calls `asyncio.iscoroutinefunction`, deprecated for removal in 3.16 [ran, shown only with `-W default`]. Harmless today, a signal that 3.15 is ahead of the ecosystem.

### The feature checks

All snippets below were executed (Python, stub or fake model) unless marked otherwise.

**(a) Streaming.** `agent.stream(msg, stream_mode="updates")` yielded `{'model': ...}`, `{'tools': ...}`, `{'model': ...}` [ran]. `stream_mode="messages"` yielded `(AIMessageChunk, metadata)` pairs, 7 items for the stub run including one `ToolMessage` [ran]. Other modes (`values`, `custom`, `debug`, `tasks`, `checkpoints`) are listed by `langgraph.types.StreamMode` [source]. Async: `astream`.

**(b) Conversation memory.** [ran]
```python
from langgraph.checkpoint.memory import InMemorySaver
agent = create_agent(model, tools=[get_weather], checkpointer=InMemorySaver())
cfg = {"configurable": {"thread_id": "t1"}}
agent.invoke(msg, cfg); agent.invoke({"messages": [("user", "again")]}, cfg)  # 6 messages in state
```

**(c) Durable state.** Same code with `SqliteSaver(sqlite3.connect(path, check_same_thread=False))` from `langgraph-checkpoint-sqlite`. A second `create_agent` on a fresh saver reading the same file returned the 4 stored messages from `get_state` [ran]. Mid-run crash recovery was tested on a plain LangGraph graph: node `b` raised, `get_state(...).next == ('b',)`, and `invoke(None, cfg)` re-ran only `b` (counts a=1, b=2) [ran]; see the LangGraph profile. Note: `SqliteSaver` is not a context manager in 3.1.3 despite older examples [ran, the error]. Production saver: `langgraph-checkpoint-postgres` 3.2.1 exists [source PyPI; not installed or run].

**(d) Human approval before a tool runs.** [ran]
```python
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.types import Command
agent = create_agent(model, tools=[get_weather], checkpointer=InMemorySaver(),
    middleware=[HumanInTheLoopMiddleware(interrupt_on={"get_weather": True})])
r = agent.invoke(msg, cfg)            # r["__interrupt__"] holds action_requests with name and args
r = agent.invoke(Command(resume={"decisions": [{"type": "approve"}]}), cfg)
```
The interrupt payload listed `allowed_decisions: approve, edit, reject, respond` [ran]. A checkpointer is required, because the pause is a stored state.

**(e) Second tool and parallel calls.** Pass two tools; if the model emits two calls in one message, both run [ran with a scripted fake model: message types `human, ai, tool, tool, ai`]. Order of the audit log was `get_time` then `get_weather`, the reverse of call order, which suggests concurrent execution but I did not prove it [ran; interpretation unverified]. For invariant 1 (results in call order) check message order in state, not execution order.

**(f) MCP server.** [ran] Install `langchain-mcp-adapters mcp`. A stdio FastMCP server with one tool `get_weather`:
```python
from langchain_mcp_adapters.client import MultiServerMCPClient
client = MultiServerMCPClient({"w": {"command": sys.executable, "args": ["srv.py"], "transport": "stdio"}})
tools = await client.get_tools()            # ['get_weather']
agent = create_agent(model, tools=tools); await agent.ainvoke(msg)
```
The tool result came back as a list of content blocks (`[{'type': 'text', 'text': '31 C and clear (mcp)', ...}]`) instead of a plain string [ran]. Not tried: HTTP transport, OAuth, tool-name collisions across servers. Docs: https://docs.langchain.com/oss/python/langchain/mcp (not fetched).

**(g) Structured output.** `response_format=ToolStrategy(MyModel)` or a plain Pydantic class (`ProviderStrategy`, native provider JSON mode, is selected when the provider supports it) [docs: migration guide; source: signature]. [ran] With the stub, the result dict had a `structured_response` key whose value was `None`, because the stub never emits the synthetic structured-output tool call. So the wiring exists but its success path is **not verified here**. Prompted output (asking nicely, then parsing) was removed in 1.0 [docs]. Small models that cannot emit the extra tool call will fail; see Models.

**(h) Tracing.** Built-in: set `LANGSMITH_TRACING=true` and a key; traces go to the hosted LangSmith service [docs, https://docs.langchain.com/langsmith/; not run, since it needs a key]. Open-source alternative: callbacks (`BaseCallbackHandler`) and `stream_mode="debug"` [source]. `configure_trace_policy`, `TracePolicy` and `omit_payload` appear in the middleware namespace, which suggests control over what payloads are traced [source: names only].

**(i) Test without a real model.** [ran] `GenericFakeChatModel(messages=iter([AIMessage(tool_calls=[...]), AIMessage("done")]))` from `langchain_core.language_models.fake_chat_models`. It does **not** implement `bind_tools`: the first attempt raised `NotImplementedError`. Subclass it:
```python
class Fake(GenericFakeChatModel):
    def bind_tools(self, tools, **kw): return self
```
With that, the whole loop ran deterministically with two tool calls and a final answer [ran]. Alternatively, run the stub server as I did.

## Models and local models

- **Providers.** One package per provider (`langchain-openai`, `-anthropic`, `-google-genai`, `-ollama` and others). Only `langchain-openai` was installed and run [ran]. Which providers are first-class: OpenAI and Anthropic packages are the most visible in the docs; I did not rank the rest [unverified].
- **OpenAI-compatible endpoints** (Ollama, vLLM, llama.cpp server): `ChatOpenAI(base_url="http://host:port/v1", api_key="anything", model="name")` [ran against the stub; same call shape documented widely, not run against a real local model]. Dedicated Ollama class: [unverified].
- **Known problems with small and open models** (labelled [unverified] unless noted): tool calling depends on the server's chat template and parser; the `bind_tools` call sends OpenAI-style `tools`, so a server that ignores them produces plain text and the loop ends silently after one turn. Structured output via `ToolStrategy` needs the model to call an extra tool correctly. When tool arguments fail validation, LangChain sends the error back to the model [ran], which suits small models; retry caps are your job (`ModelCallLimitMiddleware`, `ToolRetryMiddleware` names exist [source]).
- **Responses API default.** The v1 notes say the OpenAI Responses API now defaults to storing items in `content` [docs]. If your endpoint is chat-completions only, check which wire API `ChatOpenAI` uses. The stub log showed `/v1/chat/completions` [ran].

## State, durability and concurrency

State lives in the LangGraph state object: `AgentState` with a `messages` list under a reducer that appends, plus any custom `TypedDict` fields (v1 requires `TypedDict`, not Pydantic or dataclass for agent state) [docs]. Where it lives: in process memory unless a checkpointer is passed. `InMemorySaver` loses all on restart; `SqliteSaver` survived a "restart" (second saver on the same file) [ran]. A checkpoint is written at each step boundary; the default durability setting for `invoke` is `"async"`, meaning checkpoint writes happen in the background while the next step runs [source: `langgraph/pregel/main.py` line 2715]. The consequence: a hard process kill can lose the last step's checkpoint unless you choose `durability="sync"`. I did not test a hard kill.

Concurrency: a sync API (`invoke`, `stream`) and an async API (`ainvoke`, `astream`). Tool nodes can run calls in a thread pool or on the event loop depending on whether the tool is sync or async [unverified; recalled]. Cancellation: asyncio task cancellation in the async API; there is no built-in subprocess-tree kill [unverified]. Two simultaneous runs on one `thread_id` are not safe without your own locking [unverified].

## What you still build yourself

| Need | What LangChain gives | You build |
|---|---|---|
| Permission policy | `HumanInTheLoopMiddleware`, `wrap_tool_call` hook | Rule matching, modes, per-argument policy, audit log |
| Sandbox | Shell middleware and execution policy classes [names only] | Verify and harden; a real container or OS sandbox boundary |
| Compaction | `SummarizationMiddleware` | Triggers, quality tests, cache-friendly ordering |
| Cost control | Call-limit middleware; usage on messages | Budgets in currency, per-user quotas |
| Evaluation | LangSmith evals (hosted) | Open-source harness; fixtures from the fake model or stub |
| Parallel and write-serialisation policy | Parallel tool nodes | Read/write classification, serial writers |
| Timeouts and cancellation of tools | None that I verified | Wrappers |
| Packaging | None | Everything |

## Lock-in and escape hatches

Your tool definitions (`@tool` on typed functions) are the most portable part: they are plain functions plus a decorator. Message types (`HumanMessage`, `AIMessage`, `ToolMessage`), middleware classes and the state schema are LangChain types and spread through your code. Because `create_agent` returns a LangGraph graph, you can drop down to LangGraph (see the companion profile) without a rewrite, but that is a move to the same ecosystem, not out of it. Removal cost: the loop you use here is roughly the 100-line reference loop; I estimate 150 to 300 lines to replace `create_agent` plus a message type and a SQLite log, if you do not need middleware, streaming modes or interrupts [unverified: estimate]. Observed migration stories: the 1.0 migration page itself is evidence of in-ecosystem churn (every `create_react_agent` user had to move) [docs]. Third-party posts about leaving LangChain exist; I did not read any, so none are cited.

## Pitfalls

- **Package sprawl and renames.** The install pulled `langchain`, `langchain-core`, `langchain-openai`, `langgraph`, `langgraph-prebuilt`, `langgraph-checkpoint`, `langgraph-sdk`, `langchain-protocol`, `langsmith` [ran, `pip list`]. Many documentation examples from 2024-2025 use removed or moved APIs (`AgentExecutor`, `initialize_agent`, `create_react_agent`, `prompt=`, node name `agent`). [docs] `create_react_agent` still imports from `langgraph.prebuilt` but emits `LangGraphDeprecatedSinceV10: ... moved to langchain.agents ... removed in V2.0` [ran].
- **Fake model gap.** `GenericFakeChatModel` fails with an empty `NotImplementedError` message when used in `create_agent` [ran]. Easy to fix, hard to diagnose.
- **Structured output silently yields `None`** with a model that does not emit the structured tool [ran, stub]. Check for `None`.
- **Tool results can be content-block lists**, not strings, for MCP tools [ran]. Code that does `str(result)` or string matching breaks.
- **Hidden prompts and defaults.** The HITL middleware writes its own description text into the interrupt; the summarization middleware has its own prompt [source: names; contents not read]. Read the source before trusting defaults.
- **Hosted pull.** Docs and defaults steer toward LangSmith for tracing, evals and deployment. Nothing I ran called out unprompted [ran, but not network-captured].
- **Token overhead and latency of the framework itself:** not measured. Do not assume it is negligible when you add several middleware layers.
- **Python 3.15** works but warns; `langchain` 1.5.2 metadata says Python 3.11+ [ran, source].
- **Debugging.** Errors surface from inside graph execution; the stack passes through LangGraph internals. The `NotImplementedError` above is an example [ran].

## Choose it when / avoid it when

**Choose it when**
- You are in Python or JavaScript and want a pre-built tool-calling loop with approval, summarisation, limits and fallbacks as configuration (the middleware list above is long: model fallback, retry, PII, todo list, tool selection [source: names]).
- You will switch between several model providers and want one message format.
- You want LangGraph's persistence and interrupts but do not want to write the graph (`create_agent` hands you the graph).
- You accept LangSmith for tracing, and your team already knows the LangChain ecosystem.

**Avoid it when**
- Your runtime is not Python or JS/TS (Rust, Go: there is no first-party framework; see the language treatise).
- You need a strict, auditable permission engine, subprocess-tree cancellation, or hard-kill durability guarantees: you will write them anyway, around types that are not yours.
- You run only small local models through one endpoint, where a 100-line loop is easier to debug than a graph engine.
- You need a small install footprint or a single binary.

**Versus writing the loop yourself** ([reference loop](../../languages/README.md#8-a-language-neutral-reference-specification)): the loop itself is the cheap part. What the framework buys is checkpointed state, interrupt/resume, streaming modes, ready middleware and provider adapters. What it costs is a large dependency tree, API churn (one breaking reorganisation in the last year), indirection when debugging, and the need to match your own invariants (results in call order, denied calls never run, deterministic replay) to its behaviour. Of the eight invariants, I checked two: bad arguments return an error result and the loop continues (4) [ran], and a result is appended for every call (1, partially) [ran]. The rest are untested here.

## What was verified

| Item | Detail | Label |
|---|---|---|
| Interpreter | Python 3.15.2, throwaway venv `/Users/tejasn/.claude/jobs/717ecb0a/tmp/envs/langchain`. Install succeeded | [ran] |
| Versions installed | langchain 1.5.2, langchain-core 1.8.3, langchain-openai 1.8.3, langgraph 1.2.23, langgraph-prebuilt 1.1.3, langgraph-checkpoint 4.3.2, langgraph-checkpoint-sqlite 3.1.3, langchain-mcp-adapters 0.3.2, mcp 1.30.0, langsmith 0.15.0, pydantic 2.14.3 | [ran] |
| Minimal agent vs stub, tool round trip proved by `/_log` | Output `It is 31 C and clear in Pune.` | [ran] |
| Streaming (updates, messages), InMemorySaver memory, SqliteSaver reload, HITL approve, MCP stdio adapter, fake model (with `bind_tools` subclass), parallel calls, bad-args recovery, `wrap_tool_call` middleware | All worked as described | [ran] |
| Structured output | Wiring ran; success path not exercised (stub limitation); `structured_response` was `None` | [ran, partial] |
| Release dates, JS versions, licenses, stars | PyPI, npm, GitHub API on 2026-11-19 | [source] |
| v1 migration facts | https://docs.langchain.com/oss/python/migrate/langchain-v1 | [docs] |
| Hosted vs open (LangSmith, Agent Server) | See the LangGraph profile | [docs] |
| Not checked | JS packages run; JS/Python parity; Postgres saver; HTTP MCP; real local-model tool calling; LangSmith tracing; token overhead; hard-kill durability; middleware prompts; langchain-classic content; third-party migration stories | not verified |
