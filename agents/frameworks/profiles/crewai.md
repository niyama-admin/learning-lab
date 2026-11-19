# CrewAI

Role-based multi-agent framework (Crews of agents with roles and tasks) plus an event-driven workflow layer (Flows), with a commercial hosting platform (AMP) built on top.

| Item | Value |
|---|---|
| Covers version | `crewai` 1.15.43 (PyPI upload 2026-11-19) |
| Profile date | 2026-11-19 |
| Primary language | Python (3.10 to 3.13) |
| Verified by | Installed and ran against the stub model server; read package source and metadata; read docs pages |
| Related reading | [CAMEL](../../../llm-learning-repository/tutorials/04-agents-and-protocols/17-camel.md), [MetaGPT](../../../llm-learning-repository/tutorials/04-agents-and-protocols/19-metagpt.md), [runtime duties](../../languages/README.md#2-what-a-runtime-layer-actually-does), [reference loop](../../languages/README.md#8-a-language-neutral-reference-specification) |

## Snapshot

| Row | Finding | Evidence |
|---|---|---|
| Current version | 1.15.43, uploaded 2026-11-19 04:13 UTC. A dated `.dev` build is published daily. | [source] PyPI JSON `https://pypi.org/pypi/crewai/json` |
| First release | 0.1.0, 2023-11-14. 1.0.0 on 2025-10-20. | [source] PyPI JSON |
| License | MIT (GitHub licence field). The installed wheel's licence metadata field is empty, so rely on the repository. | [source] GitHub API `repos/crewAIInc/crewAI`; wheel METADATA |
| Maintainer and governance | Company-owned: CrewAI Inc. (author e-mail domain `crewai.com`; founder Joao Moura named in metadata). Open-source core, commercial platform on top. No foundation governance seen. | [source] wheel METADATA; [docs] https://docs.crewai.com/en/introduction |
| Languages | Python only. The runtime requires Python `>=3.10,<3.14`. No official TypeScript or other-language port was found. | [source] wheel METADATA (`Requires-Python`); [unverified] that no port exists |
| Repository | https://github.com/crewAIInc/crewAI (about 61,000 stars at the time of the check; stars are popularity, not quality) | [source] GitHub API |
| Docs | https://docs.crewai.com ; platform docs at https://docs-platform.crewai.com | [docs] |
| Release cadence | Very high: patch releases roughly daily in November 2026 (1.15.36 on 6 Nov to 1.15.43 on 19 Nov). | [docs] https://github.com/crewAIInc/crewAI/releases |
| Breaking-change history | (1) 0.x to 1.0.0 (2025-10-20): LiteLLM went from a hard pin (`litellm==1.57.4` in 0.100.0) to an optional extra (`litellm>=1.74.9; extra == "litellm"` in 1.0.0). (2) 0.1 to about 0.30 hard-depended on LangChain (below). (3) Release 1.15.34 (2026-11-01) documents "the removal of the 1.15.29 agent executor with migration notes": the executor was replaced inside one minor series. (4) 1.15.40 and 1.15.42 swapped vector storage (Chroma optional; Knowledge defaults to local Qdrant). | [source] PyPI metadata for 0.11.2, 0.30.0, 0.100.0, 1.0.0; [docs] release page. What exactly broke at 1.0.0 beyond the dependency change: not verified |
| Status | Active, fast-moving. No successor. | [docs] releases page |

### Relationship to LangChain (verified, and the docs FAQ is incomplete)

- The project FAQ says CrewAI is "built entirely from the ground up, with no dependencies on LangChain" [source] FAQ text inside the 1.15.43 wheel METADATA.
- That is true today but not historically. PyPI metadata shows `langchain (>=0.1.0,<0.2.0)` and `langchain-openai` as hard requirements in 0.11.2 (February 2024) and `langchain<0.2.0,>=0.1.10` in 0.30.0. By 0.100.0 (January 2025) LangChain is gone and `litellm==1.57.4` is a hard pin. [source] PyPI JSON for each version.
- In the clean install of 1.15.43 no `langchain*` or `litellm` package was installed. [ran] `pip list` in the venv.

### Open source versus commercial

| Piece | Where | Evidence |
|---|---|---|
| Framework: Agent, Task, Crew, Flow, tools, memory, MCP client, CLI (`crewai run`, `train`, `test`, `replay`) | MIT, installs from PyPI | [source] package tree; [ran] import |
| `crewai-tools` (prebuilt tools), `crewai-cli`, `crewai-core`, `crewai-files` | Separate PyPI packages pinned to the same version | [source] wheel `Requires-Dist` |
| AMP (the platform; also called Enterprise) | Hosted or self-hosted commercial product: deploy from Git, Studio (no-code builder), traces, role-based access, secrets manager, PII redaction in traces, "Agent Control Plane" for fleet health and cost limits | [docs] https://docs-platform.crewai.com/platform/en/introduction |
| Pricing | Basic free tier, 50 workflow executions per month; Enterprise custom, with VPC and on-premises options. Prices change; re-check. | [secondary] https://crewai.com/pricing as fetched on 2026-11-19 |

In practice everything needed to run an agent locally is MIT; the platform sells operations (deployment, tracing UI, access control).

## What it is, in terms of the runtime loop

CrewAI's core abstraction is a **role-playing agent**: you give an `Agent` a `role`, `goal` and `backstory`, which are interpolated into a prompt template (`You are {role}. {backstory}\nYour personal goal is: {goal}`). A `Task` is a description plus an expected output, assigned to an agent. A `Crew` is a list of agents and tasks run under a `Process` (sequential, or hierarchical with a manager agent that delegates). A `Flow` is a separate class-based, event-driven graph (`@start`, `@listen`, `@router`) with typed state; the docs recommend a Flow for overall structure and a Crew inside a step when a team is needed. [docs] https://docs.crewai.com/en/introduction ; [source] `crewai/flow`, `crewai/crew.py`.

Inside one agent, the loop is the usual model-call, tool-call, observation cycle. The text prompt templates in `crewai/translations/en.json` still contain a ReAct-style format ("Thought / Action / Action Input / Final Answer") and the sentence "Begin! This is VERY important to you, use the tools available and give your best Final Answer, your job depends on it!" [source]. When the model provider supports function calling, the stub server saw native `tools` in the request and returned a native tool call, so the native path was used for the OpenAI-compatible route. [ran] stub `/_log`: `"tools": ["get_weather"]`. Iteration is capped by `max_iter` (default 25) [source] `agents/agent_builder/base_agent.py`.

| # | Runtime duty (from the [treatise](../../languages/README.md#2-what-a-runtime-layer-actually-does)) | CrewAI | API name and note |
|---|---|---|---|
| 1 | Stream from the model | Provided | `Crew(stream=True)`; `kickoff()` returns an iterable of chunks plus `.result`. [ran] 2 chunks seen against the stub. Streaming at the `LLM` level is also available (`LLM(..., stream=True)`, [source]) |
| 2 | Loop as a state machine | Provided, but internal | The agent executor is itself implemented as a Flow with states and routers (`agents/agent_executor.py`, [source]). You cannot easily replace the loop; you configure `max_iter`, `max_rpm`, planning and guardrails |
| 3 | Validate tool arguments, generate schemas | Provided | `@tool` decorator or `BaseTool` subclass with a Pydantic `args_schema`; schema generated from type hints and docstring. [ran] the stub received a valid schema and arguments |
| 4 | Concurrent tools, cancellation | Partly | Native tool calls can be run in parallel (`_should_parallelize_native_tool_calls`, [source]); tasks can be `async_execution=True`; `kickoff_async`. No first-class cancellation token seen. Not exercised in a run |
| 5 | Sandboxed execution | You build it | A Docker-based code interpreter option exists [unverified, recalled]; nothing for shell or files |
| 6 | Context assembly and compaction | Partly | `respect_context_window` summarises on overflow [unverified, recalled]; unknown models get an 8,192-token window. [ran] warning seen |
| 7 | Session persistence | Partly | Flow state persistence (`@persist`, SQLite) [ran]; `checkpoint=` configuration on Crew with JSON or SQLite providers (`crewai/state`, [source], not run); no append-only conversation log for a single agent |
| 8 | Permissions | You build it (hook points exist) | `@before_tool_call` hook receives tool name and input and can return `False` to block. [ran] hook fired with `('get_weather', {'city': 'Pune'})`; blocking not run. `Task(human_input=True)` asks a human at the terminal [source] |
| 9 | Extension: MCP, plugins, hooks | Provided | `Agent(mcps=[MCPServerStdio(...)])` [ran]; hooks in `crewai.hooks`; skills (`crewai/skills`, [source]); A2A extra (`crewai[a2a]`) |
| 10 | Observability | Provided | Event bus (`crewai.events`), OpenTelemetry, `crew.usage_metrics` [ran]: `total_tokens=120 ... successful_requests=4` for one run |
| 11 | Packaging | Partly | `crewai create` / `crewai run` scaffold a YAML project; deploy path is AMP; heavy install |
| 12 | Local models | Provided | `ollama/...`, `hosted_vllm/...`, any `base_url` through the OpenAI-compatible provider. [ran] OpenAI-compatible stub; Ollama itself not run |

## Implement it

### Install and minimal agent

Python 3.15 does not work: CrewAI 1.x declares `Requires-Python >=3.10,<3.14`, so on the machine's default Python 3.15.2 `pip install crewai` silently resolved the only version whose metadata allowed it (0.11.2, from February 2024) and then failed building `tiktoken` for lack of a Rust compiler. [ran] `pip index versions crewai` under 3.15 listed only 0.x versions up to 0.11.2; the build error was `Failed building wheel for tiktoken`. A Python 3.12 virtual environment (existing system Python, nothing installed system-wide) worked.

```bash
# executed
python3.12 -m venv crew312
crew312/bin/pip install crewai        # resolved crewai 1.15.43; pulled lancedb 0.41.0, mcp 1.30.0, openai 2.54.0, pydantic 2.12.5
```

The default install is large (LanceDB, Qdrant client, OpenTelemetry exporters, `instructor`, `mcp`, `openai`). Provider SDKs are extras (`crewai[anthropic]`, `[google-genai]`, `[aws]`, `[litellm]`, `[tools]`, `[a2a]`). [source] wheel METADATA.

Minimal agent (Python, executed against the stub):

```python
import os
os.environ["OPENAI_API_KEY"] = "stub"
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"
os.environ["OTEL_SDK_DISABLED"] = "true"
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

@tool("get_weather")
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return "31 C and clear"

llm = LLM(model="openai/stub-model", base_url="http://127.0.0.1:8105/v1",
          api_key="stub", temperature=0)
agent = Agent(role="Weather assistant", goal="Answer weather questions using the tool",
              backstory="You report weather accurately.", tools=[get_weather],
              llm=llm, verbose=False)
task = Task(description="What is the weather in Pune?",
            expected_output="One sentence answer", agent=agent)
crew = Crew(agents=[agent], tasks=[task], verbose=False)
print("FINAL:", crew.kickoff().raw)
```

A single agent still needs a Task and a Crew, and three required text fields. A lighter entry point (`LiteAgent`, `lite_agent.py` [source]) exists; I did not run it.

### Run against the stub

[ran] Stub server on port 8105, OpenAI-compatible base URL. Output:

```text
FINAL: It is 31 C and clear in Pune.
```

plus warnings that the token count is approximate and the context window is assumed to be 8,192 tokens (the stub model name is unknown). Stub `GET /_log` showed two `/v1/chat/completions` requests: the first offered `tools: ["get_weather"]` with 2 messages (system, user), the second carried 4 messages (the assistant tool call and the tool result added), then the stub replied with the final text. The tool round trip is proven by the second request carrying a tool message. [ran]

No LiteLLM was involved: the `openai/...` prefix routed to the native OpenAI provider class (`crewai/llms/providers/openai`). [ran] LiteLLM not installed; run succeeded.

### Feature checks

| Feature | How | Status |
|---|---|---|
| (a) Streaming | `Crew(..., stream=True)`; `s = crew.kickoff(); for chunk in s: chunk.content; s.result.raw`. Against the stub: 2 chunks, result "It is 31 C and clear in Pune." | [ran] |
| (b) Conversation or session memory across turns | Crew-level `memory=True` creates a shared `Memory()` (LanceDB under `./.crewai/memory` or `$CREWAI_STORAGE_DIR/memory`); the crew extracts facts after each task and recalls before each task. Default embedder is OpenAI `text-embedding-3-large`, so a local setup needs `Memory(llm="ollama/...", embedder={"provider": "ollama", ...})`. There is also a conversational Agent session feature (release 1.15.36, "experimental"). No plain "append a message to a chat history" API for a Crew. I did not run memory because the default embedder needs a real key. | [docs] https://docs.crewai.com/en/concepts/memory ; [docs] release notes; not run |
| (c) Durable state | Flows: `@persist(SQLiteFlowPersistence(path))`; a second run with `inputs={"id": <state id>}` restored state. Observed: the resumed run printed `22 22` (the first run's output scrolled off; by the code it ended at `n=11`, an inference), so the state from the earlier run was loaded and the steps ran again on top of it (resume restarts the flow from `@start` with restored state; it is not a step-level resume). Crew checkpointing exists (`Crew(checkpoint=...)`, JSON or SQLite providers, events such as `task_completed`) [source], not run | [ran] Flow persistence; [source] Crew checkpoint |
| (d) Human approval before a tool | Options: `@before_tool_call` hook returning `False` blocks [ran: hook fired and saw the input; blocking path not run]; `Task(human_input=True)` prompts at the terminal after a task [source]; Flow `@human_feedback` decorator and async feedback providers for Flows (`crewai/flow/human_feedback.py`, [source]) | [ran] hook fire; others [source] |
| (e) Second tool and parallel calls | Pass more tools in `tools=[...]`. I registered two tools and the run succeeded, but I did not print which tool names the stub received. Parallel execution of native tool calls is implemented (`_should_parallelize_native_tool_calls`) but the stub only emits one call per turn so parallelism was not observed | [ran] two tools registered, run succeeded; parallel [source] |
| (f) MCP server | `Agent(mcps=[MCPServerStdio(command=..., args=[...])])`, also HTTP and SSE transports (`crewai/mcp/transports`). Against a small FastMCP server the agent listed its tool and completed the round trip. The model-facing tool name was an opaque string derived from the server command path with an 8-hex-character suffix, not `get_weather`. Whether the original tool name is recoverable in that string was not checked | [ran] |
| (g) Structured output | `Task(output_pydantic=Model)` or `output_json=`. Against the stub (which returns prose) validation failed, CrewAI logged a Pydantic error, then "Converter could not convert the output to Out (ValidationError); keeping the raw output." and returned `result.pydantic = None` with the raw text. So a failed parse is a silent downgrade to text unless you check `.pydantic` | [ran] |
| (h) Tracing | In-process event bus `crewai.events` (`BaseEventListener`, events for crew, task, agent, LLM call, tool usage, memory, flow); OpenTelemetry in dependencies; `crew.usage_metrics` for tokens; AMP Traces if you pay or use the free tier | [ran] `usage_metrics`; events [source]; AMP [docs] |
| (i) Test without a real model | Point `LLM(base_url=...)` at a stub server (done here). `crew.test(n_iterations, eval_llm)` and `crewai test` run the crew and score it with an LLM, so it needs a model and is evaluation rather than unit testing. A fake `BaseLLM` subclass is possible [source: `llms/base_llm.py`] but I did not run it | [ran] stub; [source] `crew.test` |

## Models and local models

- **Routing.** `LLM(model="<provider>/<model>")`. Native provider classes exist for: openai, anthropic (claude), azure, google/gemini, bedrock (aws), plus OpenAI-compatible adapters preconfigured for openrouter, deepseek, ollama, ollama_chat, hosted_vllm, cerebras, dashscope, snowflake, deepinfra. [source] `SUPPORTED_NATIVE_PROVIDERS` in `crewai/llm.py`. Anything else falls back to LiteLLM, which must be installed with `crewai[litellm]`; if it is not, the constructor raises with that instruction. [source] `llm.py` lines around 348-360.
- **Arbitrary OpenAI-compatible endpoint** (llama.cpp server, vLLM, LM Studio, a gateway): `LLM(model="openai/<name>", base_url="http://host:port/v1", api_key="x")`. [ran] against the stub. For vLLM there is a `hosted_vllm` prefix; for Ollama `ollama/<model>` defaults the key to `"ollama"` and the base URL to the local server. [source] `llms/providers/openai_compatible/completion.py`. Not run against a real Ollama.
- **First class versus second class.** OpenAI, Anthropic, Azure, Gemini and Bedrock have dedicated classes; everything else rides the OpenAI-compatible adapter or LiteLLM, so provider-specific features (native structured output, caching) are best on the first group. [source]; the ranking is [unverified].
- **Small and open models.** The templates teach a ReAct text format (`Action:`, `Action Input:`) with a parser (`agents/parser.py`). Without native function calling that text path runs, and small models often break the format, costing re-prompts. [source]; failure frequency [unverified]. `json-repair` is a dependency, so malformed tool JSON is repaired first. [source]
- **Context window default** of 8,192 tokens for unknown models can truncate or trigger summarisation on a long-context local model unless you pass `context_window_size=`. [ran] warning observed.
- **Retries.** `llms/retry.py` and task guardrail retries (`guardrail_max_retries`, default 3) exist; silent provider retry counts were not tested. [source]

## State, durability and concurrency

- **State representation.** A Crew run has no user-visible serialisable state: results are `CrewOutput` and `TaskOutput` objects; context passes between tasks as text (`Task(context=[other_task])`). Flows have typed state (a Pydantic model or dict) that can be persisted. [source]
- **What survives a crash.** Flow state, if `@persist` is used with SQLite or another `FlowPersistence`; I confirmed restore on a rerun but a mid-step crash resumes by restarting the flow with restored state, not by replaying the middle of a step. Crew checkpointing (`crewai/state`) writes JSON or SQLite snapshots on configured events. Not exercised. Memory (LanceDB) persists on disk. In-flight model calls and tool side effects are not made idempotent. [ran] flow; [source] checkpoint
- **Concurrency.** Tasks may be `async_execution=True`; `kickoff_async` exists; the executor can run native tool calls in threads and planner "todos" with `asyncio.gather`; `max_rpm` rate-limits per agent or crew. [source]
- **Cancellation.** I found no cancellation token comparable to the treatise's invariants 2 and 3; wrap `kickoff()` in your own timeout or process kill. [unverified: limited source read]

## What you still build yourself

| Need | What CrewAI gives | What remains |
|---|---|---|
| Permissions and approval policy | `before_tool_call` hook; `human_input`; Flow human feedback | A rule engine (allow, deny, ask), persistent approvals, audit trail |
| Sandboxing | Optional Docker-based code execution tool | Everything for shell or file tools; process-tree kill; network policy |
| Context compaction | Summarise-on-overflow flag; memory recall | Your own policy, since defaults assume an 8,192-token window |
| Cost control | `usage_metrics`; `max_iter`; `max_rpm`; AMP cost limits (paid) | Hard budget stop that aborts a run; per-user quotas |
| Durable runs | Flow persistence; Crew checkpoints | Idempotent tools, job queue, resume policy |
| Evaluation | `crew.test`, `crew.train` | Pass/fail suites on your data |
| Typed output guarantees | `output_pydantic` (soft failure) | Retry-until-valid loop; fail closed on `.pydantic is None` |

## Lock-in and escape hatches

- **Your code is mostly framework types.** Agents, tasks and crews are Pydantic models; tools are `@tool` or `BaseTool`; flows use decorators. The YAML project scaffold (`agents.yaml`, `tasks.yaml`) adds a convention that only CrewAI reads. [docs] project templates in `crewai/cli` [source]
- **Roles and backstories are portable text**, but their effect depends on CrewAI's prompt templates.
- **Reimplementing what you used.** For the single-agent case, the framework adds a prompt wrapper, a loop, retries and event emission; a plain loop per the [reference specification](../../languages/README.md#8-a-language-neutral-reference-specification) is about 100 lines plus your own schema generation. For hierarchical delegation, memory and Flows, reimplementation is a real project. [unverified: effort estimate]
- **Observed migration stories.** The framework's own history is the clearest: LangChain removed, LiteLLM demoted from required to optional, executor replaced inside 1.15.x, vector stores swapped inside two patch releases. Code that touched those internals broke; code that used only Agent/Task/Crew did not necessarily break (not verified across versions). [source] PyPI metadata; [docs] releases page

## Pitfalls

1. **Python version window.** `>=3.10,<3.14`; on Python 3.14 or 3.15 `pip` falls back to a 2024 release and fails on a native build. [ran]
2. **Daily release cadence and executor swaps.** Pin exactly (`crewai==1.15.43`) and re-run your tests before upgrading; the executor was replaced within the 1.15.x series. [docs] releases page
3. **Hidden prompts.** Every call carries the role-playing template, the ReAct instruction block, and for tasks the line "Begin! This is VERY important to you ... your job depends on it!" You do not write these; they cost tokens on every call and shape behaviour. [source] `translations/en.json`
4. **Cost of the abstraction.** One agent with one tool took 2 model calls, the same as a bare loop. Adding a second agent with a dependent task added one more call (3 calls total for two sequential tasks) and the second agent's prompt includes the first task's output as context. Hierarchical process adds a manager agent whose delegation calls are extra model calls. I could not measure the hierarchical cost because a scripted stub does not delegate. Per call, the system prompt scaffolding is paid every time. [ran] call counts via `/_log` for single and sequential; hierarchical [unverified]
5. **Silent soft failures.** Structured output falls back to raw text with `pydantic=None`; guardrails retry up to `guardrail_max_retries`. [ran] / [source]
6. **Context window default of 8,192 tokens** for models the framework does not know. [ran]
7. **Telemetry.** The package has a telemetry module and OpenTelemetry exporters; I set `CREWAI_DISABLE_TELEMETRY=true` and `OTEL_SDK_DISABLED=true` in every run and did not observe traffic, so whether it is on by default is [unverified].
8. **Memory defaults to OpenAI embeddings** (`text-embedding-3-large`, 3072 dimensions), and an existing store built with a 1536-dimension embedder fails with a dimension mismatch. [docs] memory page
9. **Default install weight** (LanceDB, Qdrant, OpenTelemetry, PDF and spreadsheet libraries) and noisy event-bus warnings on error paths. [ran]
10. **Documentation drift.** The release and memory pages name models (for example a default "gpt-6-luna") that I could not check; copy no model names from the docs. [docs]

### Does the multi-agent abstraction help?

Candid assessment. Role, goal and backstory prompts descend from the role-play line of research: [CAMEL](../../../llm-learning-repository/tutorials/04-agents-and-protocols/17-camel.md) had two role-prompted agents converse to complete a task, and [MetaGPT](../../../llm-learning-repository/tutorials/04-agents-and-protocols/19-metagpt.md) encoded a software company's roles and standard operating procedures with typed intermediate documents. CrewAI is a generic packaging of that idea: "researcher", "writer", "reviewer" are prompts, and the Process decides who speaks when. Read the two linked chapters for what the original evidence does and does not show.

From this session: extra agents are extra model calls (one more per extra task in the sequential case, measured) and extra prompt tokens (role scaffolding repeats; earlier task output is pasted in). A Flow of plain Python steps with a model call only where needed gives the same control with fewer calls. A crew helps when the sub-tasks genuinely need different tool sets, different models (a cheap one for extraction, a strong one for synthesis, via per-agent `llm=`), or independent context windows to avoid one long conversation. It helps least when "roles" are only different names for the same model with the same tools. No answer-quality comparison was run here [unverified]; run your own before accepting the abstraction.

## Choose it when / avoid it when

**Choose CrewAI when**

- You want a quick prototype of cooperating, tool-using workers with YAML-configured roles, on Python 3.10 to 3.13.
- You want Flows (typed state, `@listen`, `@router`, persistence) as a lightweight workflow engine, and you will pin the version.
- You plan to deploy on AMP for its tracing, access control and secrets management.
- You need ready MCP, A2A, memory and provider integrations.

**Avoid it when**

- You must own the loop: custom permission engine, cancellation, exact context assembly, append-only session log, replay. The agent loop is internal and has been replaced once already in 1.15.x.
- You target small local models with a strict budget: the ReAct template, role text and "Begin!" scaffolding cost tokens on every call, and the text path is fragile on weak models.
- You need a non-Python runtime, or Python 3.14 or later.
- You cannot tolerate large dependency trees or daily patch releases in a regulated environment.

**Against writing the loop yourself (about 100 lines).** It buys schema generation, provider adapters, an MCP client, hooks, Flows with SQLite persistence, usage metrics, an event bus and a CLI scaffold. It costs a large dependency tree, hidden prompts, a loop you cannot swap, soft failures and release churn. For "one agent, a handful of tools, a good permission model", write the loop and take only pieces (for example `mcp` directly). For many multi-step automations authored by many people on a hosted platform, CrewAI's conventions are worth something.

## What was verified

| Item | Detail | Label |
|---|---|---|
| Environment | Python 3.12 venv (system Python 3.12); `crewai` 1.15.43; `lancedb` 0.41.0; `mcp` 1.30.0; `openai` 2.54.0; `pydantic` 2.12.5; no `litellm`, no `langchain` | [ran] |
| Python 3.15 | Install fails: only crewai 0.11.2 allowed, `tiktoken` wheel build needed Rust | [ran] |
| Minimal agent | Produced "It is 31 C and clear in Pune."; stub log: 2 requests, tools offered, tool message in the second | [ran] |
| Streaming, structured output (soft failure), hook before tool, usage metrics, two tools registered | As reported above | [ran] |
| Flow persistence | SQLite `@persist`; resumed state restored (`22 22`) | [ran] |
| MCP stdio | FastMCP server tool surfaced and the round trip completed; tool name was opaque | [ran] |
| Call counts | Single agent: 2; two sequential tasks with two agents: 3; hierarchical: not meaningfully measured | [ran] / [unverified] |
| Native versus text tool calling | Native `tools` field seen in the request; text template present in source | [ran] / [source] |
| LangChain history, LiteLLM history | PyPI `requires_dist` for 0.11.2, 0.30.0, 0.100.0, 1.0.0, and 1.15.43 | [source] |
| Release notes 1.15.34 to 1.15.43 | Fetched release page | [docs] |
| AMP and pricing | Docs-platform introduction; pricing page | [docs] / [secondary] |
| Not run | Memory, crew checkpoints, hierarchical process, `human_input`, blocking via hook return, Ollama, Anthropic and Gemini providers, `crewai test` or `train`, Docker code execution, cancellation, AMP itself, telemetry traffic | not verified |
