# LangGraph

LangGraph is an open-source library for building stateful, checkpointed graphs of steps (nodes) over a shared state, used as the engine under LangChain's agents.

| Field | Value |
|---|---|
| Covers | `langgraph` 1.2.23 (Python) with `langgraph-checkpoint` 4.3.2, `langgraph-prebuilt` 1.1.3, `langgraph-checkpoint-sqlite` 3.1.3 |
| Profile date | 2026-11-19 |
| Companion profile | [langchain.md](langchain.md) |
| Primary language | Python |

## Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version, Python | `langgraph` 1.2.23, uploaded 2026-11-19 | [ran] installed; [source] https://pypi.org/pypi/langgraph/json |
| Current version, JS | `@langchain/langgraph` 1.7.5, published 2026-11-17 | [source] npm registry; not installed or run |
| License | MIT | [source] PyPI, GitHub API |
| Maintainer and governance | LangChain, Inc., repository `langchain-ai/langgraph` (about 45k stars, last push 2026-11-19 at query time). No independent foundation verified | [source] GitHub API; governance [unverified] |
| Languages | Python (primary) and JavaScript/TypeScript (separate package, its own version line, docs under `oss/javascript`). Feature parity not compared | [source] npm; [docs] https://docs.langchain.com/oss/python/langgraph/overview; parity [unverified] |
| Python requirement | `>=3.10` | [source] PyPI |
| Repository / docs | https://github.com/langchain-ai/langgraph ; https://docs.langchain.com/oss/python/langgraph/overview | [docs] |
| Release cadence and history | 0.2.0 2024-08-07; 0.3.0 2025-02-26; 0.6.0 2025-07-28; 1.0.0 2025-10-17 (same day as `langchain` 1.0.0); 1.1.0 2026-03-10; 1.2.0 2026-05-12; 1.2.23 2026-11-19. Patch releases are frequent (23 in the 1.2 line over six months) | [source] PyPI release history |
| Breaking changes, last two majors | 0.x to 1.0: the docs say 1.0 deprecated `create_react_agent` in favour of `langchain.agents.create_agent`, "Deprecated in LangGraph V1.0 to be removed in V2.0" [ran, deprecation warning text]. The LangChain migration guide lists the node rename `agent` to `model`, `context=` replacing `config["configurable"]` for static data, and `TypedDict`-only custom agent state [docs, https://docs.langchain.com/oss/python/migrate/langchain-v1]. Before 1.0, 0.2 to 0.3 to 0.6 had several renames of `interrupt` and checkpoint APIs [unverified, recalled] | mixed as labelled |
| Status | Active. It is the runtime that `langchain` 1.x agents compile to | [ran] `type(create_agent(...))` is `CompiledStateGraph`; [docs] |

### Relationship to LangChain, and what is open versus hosted

- **LangGraph does not require LangChain.** The overview page says LangChain is "the agent framework" and LangGraph does not require it, though examples often use it [docs]. `langgraph` 1.2.23 has no `langchain` dependency in my venv listing; it pulls `langchain-core` [ran: `pip list`; direct dependency edge is [unverified]].
- **LangChain's `create_agent` is built on LangGraph** [ran: returns `CompiledStateGraph`; docs]. The older `langgraph.prebuilt.create_react_agent` still imports and warns [ran].
- **Open and free (MIT, run on your machine):** `langgraph`, `langgraph-checkpoint`, SQLite and Postgres checkpointer packages, the in-memory saver, `langgraph-sdk` (a client), `langchain-mcp-adapters` [source: PyPI/GitHub licenses for the ones I queried: `langgraph` MIT, `langgraph-checkpoint-postgres` 3.2.1 MIT; the others [unverified]]. All my feature runs used only these, with no account and no key [ran].
- **Hosted or commercial products from LangChain, Inc.:** **LangSmith** (tracing, evaluation, prompts, and deployment) and the **Agent Server** (the deployment product; the 2026 docs call it "LangSmith Agent Server", with Studio for visual prototyping). The overview page does not mention the older name "LangGraph Platform" [docs, fetched 2026-11-19]. The self-hosting page says "Agent Server hosting requires an Enterprise plan" and that hosting is optional for observability and evaluation; it lists standalone server, full platform on Kubernetes, and hybrid (marked not recommended and to be deprecated) [docs, https://docs.langchain.com/langsmith/deploy-self-hosted-full-platform]. I did not find a statement of free-tier limits or a licence key on the pages I read, so "what a free self-hosted server includes" is **not verified**. Plan on this: the library is free; managed persistence, scaling, cron, assistants, Studio and tracing UI are the paid products; you can replace them with Postgres, your own HTTP server and OpenTelemetry-style tracing.

## What it is, in terms of the runtime loop

LangGraph is a **graph runner over a typed state**. You declare a state schema, add nodes (ordinary Python functions that take the state and return a partial update), connect them with edges (fixed or conditional), and `compile()` the graph, optionally with a checkpointer. Execution proceeds in "super-steps" (a Pregel-style bulk-synchronous model, from the module name `langgraph.pregel` [source]): nodes that are ready run, their updates are merged into the state by **reducers** (functions that say how to combine old and new values for a key; for example `operator.add` appends to a list), and the state is checkpointed at the step boundary. A tool-calling agent is a two-node cycle: model node, tool node, loop until the model returns no tool calls.

| # | Duty | Status | API and notes |
|---|---|---|---|
| 1 | Stream from the model | Partly provided | Stream modes `values, updates, checkpoints, tasks, debug, messages, custom` [source: `langgraph.types.StreamMode`]. `messages` mode emits model token chunks from any chat model called inside a node [ran]. Wire-level SSE parsing is in the model class, not LangGraph |
| 2 | Loop as a state machine | Provided | `StateGraph`, `add_conditional_edges`, `tools_condition`, `ToolNode` [ran: hand-built agent returned the stub answer]. The recursion limit and termination are your configuration |
| 3 | Validate tool args, schemas | Partly provided | `ToolNode` runs LangChain tools, so validation is LangChain's [ran]. Raw graphs have no tools at all unless you add them |
| 4 | Concurrent tools, cancellation | Partly provided | Parallel nodes in one super-step run concurrently; tools in `ToolNode` handle multiple calls [ran: two calls processed]. Read/write serialisation, per-tool timeouts: you build. `RetryPolicy` and per-node `timeout` options exist on `add_node` in recent versions [unverified] |
| 5 | Sandbox | You build it | Nothing in LangGraph |
| 6 | Context assembly, compaction | You build it (or use LangChain middleware) | State is yours; there is no automatic trimming in the core. `trim_messages` and summarisation helpers live in LangChain [unverified] |
| 7 | Session persistence | Provided | Checkpointers, `thread_id`, `get_state`, `get_state_history`, state forking via checkpoint ids [ran: reload; history/fork [docs]] |
| 8 | Permissions | Partly provided | `interrupt(...)` pauses the graph for a decision [ran]; the policy is yours |
| 9 | Extension (MCP, hooks) | Partly provided | No MCP in core; via `langchain-mcp-adapters` [ran, see LangChain profile]. Hooks are just nodes and edges |
| 10 | Observability | Partly provided | Stream modes `debug` and `tasks`; LangChain callbacks; LangSmith hosted tracing [docs, not run] |
| 11 | Packaging | You build it | Library only. The Agent Server product is the intended packaging, and it is hosted-product territory |
| 12 | Local models | Partly provided | Model-agnostic: any chat model object you call inside a node. OpenAI-compatible base URL [ran against stub] |

## Implement it

### Install and minimal agent

```bash
# executed: Python 3.15.2
python3 -m venv .venv
.venv/bin/pip install langgraph langchain-openai langgraph-checkpoint-sqlite
```

LangGraph on its own contains no model and no tool abstraction; the shortest honest agent builds the graph by hand and borrows LangChain's chat model, `@tool` and `ToolNode`:

```python
# Python, EXECUTED against the stub server (http://127.0.0.1:8101/v1)
from langchain.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START
from langgraph.prebuilt import ToolNode, tools_condition

@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return "31 C and clear"

model = ChatOpenAI(model="stub", base_url="http://127.0.0.1:8101/v1", api_key="x")
bound = model.bind_tools([get_weather])

def call_model(state: MessagesState):
    return {"messages": [bound.invoke(state["messages"])]}

g = StateGraph(MessagesState)             # MessagesState = {"messages": list with append reducer}
g.add_node("model", call_model)
g.add_node("tools", ToolNode([get_weather]))
g.add_edge(START, "model")
g.add_conditional_edges("model", tools_condition)   # to "tools" if tool calls, else END
g.add_edge("tools", "model")
app = g.compile()

out = app.invoke({"messages": [{"role": "user", "content": "What is the weather in Pune?"}]})
print(out["messages"][-1].content)
```

[ran] Output: `It is 31 C and clear in Pune.` The stub `/_log` showed two chat-completions requests with the tool offered, the second carrying 3 messages [ran, same proof as the LangChain run]. The one-liner equivalent is LangChain's `create_agent(model, tools=[get_weather])`; I ran that too and its type is `CompiledStateGraph` [ran]. The `bind_tools` step is where a model without tool support fails; `tools_condition` then routes straight to END.

### The feature checks

**(a) Streaming.** `app.stream(input, stream_mode="updates")` gives one dict per node step; `"messages"` gives token chunks plus metadata including `langgraph_node` [ran, via `create_agent`; same engine]. Combine modes with a list. Docs: https://docs.langchain.com/oss/python/langgraph/streaming (not fetched).

**(b) Memory across turns.** `g.compile(checkpointer=InMemorySaver())` and `config={"configurable": {"thread_id": "t1"}}`. Two invocations on one thread left 6 messages [ran]. Longer-term, cross-thread memory is a separate **store** (`BaseStore`, passed as `store=`), documented but not run [docs: overview, durable execution page].

**(c) Durable state: pause, resume, crash.**
```python
# Python, EXECUTED
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
cp = SqliteSaver(sqlite3.connect("ck.sqlite", check_same_thread=False))   # not a context manager in 3.1.3
app = g.compile(checkpointer=cp)
```
Crash test [ran]: a two-node graph `a -> b` where `b` raised on its first call. After the exception, a fresh compile on the same SQLite file reported `get_state(cfg).next == ('b',)`, and `app.invoke(None, cfg)` resumed by running only `b` (call counts a=1, b=2). So node-level resume works: completed nodes are not re-run. What you must design: a node that has side effects and crashes mid-way will run again from its start, so make nodes idempotent or split side effects into their own node. The docs recommend wrapping side effects (a `@task` wrapper) and say determinism matters for replay; the durable-execution page I fetched did not state this and did not describe durability modes [docs: the page covers only checkpointer basics]. From source: `Pregel.invoke` takes a `durability` argument that defaults to `"async"` [source: `langgraph/pregel/main.py`, lines 2673 and 2715]. The values I expect are `exit`, `async`, `sync` [unverified: I saw the default but not the full set]. A hard kill (SIGKILL) test was not run. Production: `langgraph-checkpoint-postgres` 3.2.1 (`PostgresSaver`, `AsyncPostgresSaver`) is recommended by the docs for production and SQLite for local development [docs: durable-execution page]; not installed or run.

**(d) Human approval before a tool runs.** Two mechanisms. Dynamic: call `interrupt(payload)` inside any node or tool; the run stops and `invoke` returns `{"__interrupt__": [Interrupt(value=..., id=...)]}`; resume with `invoke(Command(resume=value), same_config)`; the interrupt call then returns `value` [ran, custom node: `interrupt("approve b?")`, resumed with `"yes"`, final state `{'log': ['a', 'b:yes']}`]. Static: `interrupt_before=["tools"]` / `interrupt_after` in `compile` or `create_agent` [source: signature; not run]. Both need a checkpointer. When a node resumes, it **re-executes from the start of the node**, and the `interrupt` call returns the stored value; code before `interrupt` therefore runs twice [docs: recalled; consistent with node-level resume in the crash test; [unverified] for this exact claim]. The prebuilt approve/edit/reject behaviour is LangChain's `HumanInTheLoopMiddleware` [ran].

**(e) Second tool and parallel tool calls.** Add the tool to the list and to `ToolNode`. [ran] A fake model emitting two tool calls in one message produced two tool messages. Parallel branches in the graph itself: add two edges from one node; both run in the same super-step and the reducer merges their updates [docs; not run]. Without a reducer on a key that two parallel nodes write, LangGraph raises an invalid-update error [docs: recalled, [unverified]].

**(f) MCP.** Use `langchain-mcp-adapters` to get LangChain tools, then pass them to `ToolNode` or `create_agent` [ran: stdio server, one tool, result returned as content blocks]. LangGraph itself has no MCP client.

**(g) Structured output.** Not a graph feature. Options: `create_agent(..., response_format=...)` [ran wiring; stub cannot produce the typed output, so success path unverified], or bind a Pydantic schema as the model's `with_structured_output` inside your own node [unverified: not run].

**(h) Tracing.** Hosted: LangSmith via environment variables [docs: not run, needs a key]. Open: `stream_mode="debug"` and `"tasks"` (events per task) [source: StreamMode literal; not run]. Reducers and checkpoint history (`get_state_history`) double as an audit trail.

**(i) Test without a real model.** [ran] Node functions are plain functions, so you can unit-test them directly. For the model, use a fake chat model (needs a `bind_tools` override, see LangChain profile), or the stub server. A graph with `InMemorySaver` makes whole-conversation tests deterministic. Resuming an interrupted run in a test is just a second `invoke(Command(resume=...))` [ran].

### Concepts that matter for this runtime

- **State and reducers.** [ran] A `TypedDict` key annotated `Annotated[list, operator.add]` appends updates; without the annotation, a key is overwritten. `MessagesState` uses a message-specific reducer that appends and also merges by message id [source: name and behaviour; id-merge [unverified]].
- **Subgraphs.** A compiled graph can be added as a node of a parent graph [ran: parent output `['x', 'sub']`]. Shared state keys pass through. Different schemas need a wrapper function. Checkpoints and interrupts inside subgraphs propagate to the parent [docs: recalled, [unverified]].
- **Time travel and forking.** `get_state_history(config)` lists checkpoints; invoking with a past `checkpoint_id` forks [docs: https://docs.langchain.com/oss/python/langgraph/overview mentions state inspection; mechanics [unverified], not run].
- **Functional API.** LangGraph also has `@entrypoint` / `@task` for writing a workflow as ordinary Python with checkpointing, without declaring nodes and edges [unverified: recalled; not run]. For an agent loop it may be the lower-ceremony way.

## Models and local models

- LangGraph has no model layer; models come from LangChain integrations or any callable you wrap [ran: `ChatOpenAI`].
- **OpenAI-compatible endpoints** (Ollama, vLLM, llama.cpp server): `ChatOpenAI(base_url=...)`. Proven against the stub only [ran]; against a real local model [unverified].
- **First-class vs second-class:** determined by the LangChain package for each provider, not by LangGraph. I did not rank providers.
- **Small-model problems** (all [unverified] unless noted): tool-call format depends on the server template; if `bind_tools` is ignored, `tools_condition` ends the run with text; malformed arguments produce a `ToolNode` error message to the model and a retry [ran: "Field required ... Please fix the error and try again"]; set a recursion limit so a model that loops forever stops (`recursion_limit` in config, default value not verified).

## State, durability and concurrency

- **Representation.** One state object, a `TypedDict` (or dataclass/Pydantic in raw graphs, `TypedDict` for LangChain agents [docs]), updated by reducers. Messages are LangChain message objects; serialisation to the checkpoint uses `langgraph-checkpoint` serde (a serializer for state types) [source: package names]. Custom classes in state need to be serialisable by it; failures appear at checkpoint time [unverified].
- **Where it lives.** In memory during a run; at each step boundary in the checkpointer: memory (lost on exit), SQLite (single file; lock contention under many writers [unverified]), Postgres (production recommendation [docs]). There is also a store for cross-thread data [docs].
- **What survives a crash.** Completed super-steps whose checkpoint was written. With the default `durability="async"` (checkpoint write overlaps the next step [source for default; semantics from docs recall, [unverified]]) the most recent step may be lost on a hard kill. In-flight node work is lost and re-run [ran for exception; hard kill not tested].
- **Concurrency and cancellation.** Sync and async APIs (`invoke`/`ainvoke`, `stream`/`astream`). Nodes in the same super-step run concurrently. Cancelling is asyncio cancellation of the run task [unverified]. Two concurrent runs on one `thread_id` conflict; the Agent Server product has a "multitask" policy for that, which the open library does not [unverified, recalled].
- **Python 3.15.** Works [ran]; `langsmith` emits a deprecation warning about `asyncio.iscoroutinefunction` slated for removal in 3.16 [ran].

## What you still build yourself

| Need | LangGraph gives | You build |
|---|---|---|
| Permission policy | `interrupt`, `Command(resume=...)` | Rules, modes, deny lists, audit |
| Sandboxing | Nothing | Everything |
| Context compaction | State and reducers to hold it | The summariser and its triggers (LangChain middleware offers one) |
| Cost and budget limits | Recursion limit; step counting | Token and currency accounting |
| Tool timeouts and tree-kill | Nothing verified | Wrapper |
| Evaluation | Deterministic graphs with fake models | Harness and datasets (LangSmith offers a hosted one) |
| Serving over HTTP, queues, cron, multi-tenant auth | Nothing in the library | Your own server, or the hosted/Enterprise Agent Server |
| Packaging, startup time | Nothing | Everything |

## Lock-in and escape hatches

- **Your graph code is LangGraph's types:** `StateGraph`, `Command`, `interrupt`, reducers, checkpointer interfaces. Tool and model code may be LangChain's. The graph model is a real design commitment: control flow lives in edges and node returns rather than in a normal function.
- **Persistence format.** Checkpoints in SQLite/Postgres use LangGraph's table layout and serialiser. Migrating means exporting message lists from `get_state_history`, not copying tables [source: inference from the saver design; [unverified]].
- **Replacement cost.** For the agent loop only: the 100-line reference loop plus an append-only log gives message history, resume at turn boundaries, and approval pauses. What is hard to rebuild is generic mid-step resume, parallel branches with reducers, time travel and subgraph interrupts. If you only need "resume after a tool approval" and "resume at a turn boundary", the plain loop is smaller. [unverified estimate: 150 to 300 lines]
- **Escape from the hosted products:** the open library works without LangSmith or the Agent Server [ran]. Swapping the saver to Postgres is a constructor change [docs]. The deployment layer (assistants, threads, runs API, cron, Studio) has no open drop-in that I verified.
- **Migration stories:** none read. Internal evidence: the 1.0 move of `create_react_agent` to `langchain.agents` is itself a migration the project imposed [ran, docs].

## Pitfalls

- **Version churn in documentation.** Tutorials show `create_react_agent`, `prompt=`, node name `agent`, `SqliteSaver.from_conn_string` as a context manager. In 1.x `create_react_agent` warns and is slated for removal in V2.0 [ran]. `SqliteSaver(...)` was not usable in a `with` block in 3.1.3 [ran]. Pin versions: the minor line moved every few months, and the patch line moves weekly.
- **Abstraction cost.** To express "call the model, run tools, repeat" you declare a schema, two nodes, one conditional edge and one back edge, then compile. That is 10 lines for something that is 15 lines of a plain loop; the ceremony pays off only when you use checkpointing, interrupts, branches or subgraphs.
- **Re-execution semantics.** Node-level resume re-runs the interrupted or crashed node from the top. Non-idempotent side effects before an `interrupt()` call run twice [ran for crash; interrupt re-run claim [unverified]].
- **Async checkpointing default** can lose the last step on hard kill [source: default; consequence [unverified]].
- **Reducers and state shape.** Forgetting a reducer overwrites silently; parallel writes without one error [partly unverified, see above]. Messages are LangChain objects, so JSON-friendliness of your state is not automatic.
- **Debugging.** Exceptions inside nodes come wrapped in the runner's stack. The `GenericFakeChatModel` failure surfaced as an empty `NotImplementedError` [ran].
- **Hosted pull.** Docs and examples lean on LangSmith and the Agent Server; features such as cron, multi-tab Studio, background runs and per-thread concurrency policies sit in the product, and the Enterprise plan is the stated requirement for self-hosted Agent Server [docs]. Verify which feature you need is in the open library before designing around it.
- **Install weight.** 67 distributions in the venv [ran].

## Choose it when / avoid it when

**Choose it when**
- Your agent has real control flow: branches, parallel sub-agents, a supervisor that routes to specialists, loops with human gates, and you want each step checkpointed and resumable.
- You need human-in-the-loop with an arbitrary pause point and a generic resume, and you can use Postgres for the checkpointer.
- You will write in Python (or TypeScript) and accept LangChain message types.
- You want a path to a hosted deployment if the product grows, while keeping the open library for development.

**Avoid it when**
- Your agent is a single tool-calling loop and you only need turn-level history; the loop is shorter without it.
- You need a different language or a small, dependency-light binary.
- You cannot accept version churn in dependencies for a runtime that others rely on.
- You need hard-kill durability guarantees, strict deterministic replay (the replay semantics need verification first), or a permission model with custom invariants that must hold even with nodes executing concurrently.

**Versus writing the loop yourself** ([reference loop](../../languages/README.md#8-a-language-neutral-reference-specification)): the framework buys durable step checkpoints, interrupt/resume, multiple stream modes and subgraphs; it costs a graph vocabulary, a heavy dependency set and replay semantics you must learn. If the eight invariants are a hard spec for your runtime, you still write tests for them against the graph. I tested bad-argument recovery [ran] and node-level crash resume [ran]; the cancellation, write-serialisation, denial and replay invariants were not tested.

## What was verified

| Item | Detail | Label |
|---|---|---|
| Environment | Python 3.15.2 venv under `/Users/tejasn/.claude/jobs/717ecb0a/tmp/envs/langchain`; install succeeded without errors | [ran] |
| Versions | langgraph 1.2.23, langgraph-checkpoint 4.3.2, langgraph-prebuilt 1.1.3, langgraph-checkpoint-sqlite 3.1.3, langgraph-sdk 0.4.14, langchain 1.5.2, langchain-core 1.8.3 | [ran] |
| Hand-built tool agent vs stub; `create_agent` vs stub | Both returned `It is 31 C and clear in Pune.`; `/_log` showed two requests (1 then 3 messages) | [ran] |
| Reducer (`operator.add`), `interrupt` and `Command(resume)`, subgraph as a node, SqliteSaver reload, node crash and resume, InMemorySaver memory, streaming modes `updates` and `messages`, fake model tests, MCP via adapter, `HumanInTheLoopMiddleware` | Worked as described | [ran] |
| `create_react_agent` deprecation | Warning text `LangGraphDeprecatedSinceV10 ... removed in V2.0` | [ran] |
| Durability default `"async"` | In `langgraph/pregel/main.py` | [source] |
| Releases, licenses, star counts, JS versions | PyPI, npm, GitHub API on 2026-11-19 | [source] |
| LangGraph vs LangChain relationship; hosted vs open; Enterprise requirement for Agent Server hosting | overview and self-host pages | [docs] |
| Not verified | Postgres saver; hard-kill durability; durability mode set (`exit`/`async`/`sync`); `interrupt_before`/`after` runs; interrupt re-execution detail; functional API; time travel; store (long-term memory); JS runs and JS/Python parity; Agent Server licensing details beyond the Enterprise sentence; token overhead; real local models; concurrent runs on one thread; LangSmith tracing | not verified |
