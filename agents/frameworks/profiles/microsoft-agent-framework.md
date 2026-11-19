# Microsoft Agent Framework (MAF)

Microsoft's open-source agent SDK for .NET, Python and (in preview) Go; the stated successor to Semantic Kernel and AutoGen. Profile as of 2026-11-19.

| Field | Value |
|---|---|
| Covers | Python `agent-framework` 1.26.0 (installed and run); .NET and Go from docs and package registries only |
| Docs | https://learn.microsoft.com/en-us/agent-framework/overview/ [docs] |
| Repo | `github.com/microsoft/agent-framework` (named by PyPI metadata). **Both the web page and the GitHub API returned HTTP 404 from this machine on 2026-11-19**, so I could not read source from GitHub, release notes, stars or the license file there. |
| Run in this session | Python 3.15.2, macOS arm64, against the stub server [ran] |
| Not run | .NET (no dotnet toolchain), Go |

## Snapshot

| Item | Finding | Evidence |
|---|---|---|
| Python | Meta-package `agent-framework` **1.26.0**, released 2026-11-12; `agent-framework-core` 1.26.0 same day. Requires Python >=3.11. Core went 1.0.0 betas from 2025-10-01 (date-stamped versions like `1.0.0b251001`), 67 releases in total on PyPI. | [source] PyPI JSON |
| .NET | NuGet `Microsoft.Agents.AI` and siblings (`.Workflows`, `.Harness`, `.OpenAI`, `.Anthropic`) latest **1.28.0**; the list shows 65 versions of `Microsoft.Agents.AI`. Install per docs: `dotnet add package Microsoft.Agents.AI` (Foundry flavour: `dotnet add package Microsoft.Agents.AI.Foundry --prerelease`). | [source] api.nuget.org; [docs] |
| Go | Public preview, `github.com/microsoft/agent-framework-go` v0.3.1 (2026-11-13), needs Go 1.26+; declarative agents, CodeAct and functional workflows not implemented. | [docs] overview page; [source] GitHub API |
| 1.0 GA | **2026-04-03** per Microsoft's devblog (for .NET and Python). Third-party pages variously say April 2 or 3; I use the official post. | [docs] https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/ |
| What "1.0" means | The 1.0 post splits scope: **stable** (single agents and connectors for Foundry, Azure OpenAI, OpenAI, Anthropic, Bedrock, Gemini, Ollama; middleware; memory and context providers; graph workflows with checkpointing; sequential, concurrent, handoff, group chat and Magentic-One orchestration; declarative YAML; MCP; A2A) and **preview** (DevUI, Foundry hosted-agent integration, AG-UI adapters, Skills, GitHub Copilot SDK and Claude Code SDK harnesses, Agent Harness). | [docs] same post |
| Preview today | Many satellite packages are still beta in the Python install I ran: `agent-framework-anthropic`, `-ollama`, `-gemini`, `-bedrock`, `-claude`, `-mem0`, `-redis`, `-devui`, `-a2a`, `-tools` are all `1.0.0b261112` (date-stamped beta, 2026-11-12); `-openai` 1.18.2, `-foundry` 1.16.2, `-orchestrations` 1.4.2, `-declarative` 1.5.1, `-github-copilot` 2.2.0, `-durabletask` 1.0.0, `-azurefunctions` 1.0.0. | [ran] `pip list` |
| License | Not verified: PyPI metadata carries no license field and I could not open the repo. Sibling projects Semantic Kernel (MIT) and the Microsoft docs describe it as open source. Check the LICENSE file before adopting. | [unverified] |
| Maintainer | Microsoft (the same teams as Semantic Kernel and AutoGen, per the docs). Docs authors on Learn are Microsoft engineers. | [docs] |
| Cadence | Python 1.26.0 on 2026-11-12 and .NET 1.28.0 packages in the same period imply releases every one to two weeks for core and weekly date-stamped betas for satellites. | [source] registries |
| Breaking-change history | Pre-1.0 betas renamed things repeatedly; the 1.0 docs consistently say `Agent`, `AgentSession`, `AgentResponse`, `run()`. Python docs also link a "Typed Options Upgrade Guide". I did not diff releases, so no list of breaking changes is claimed. Post-1.0, preview-labelled features (harness file access, background agents, looping, shell tools) are "experimental" and may change. | [docs] harness page: "Background agents, file access, and looping remain experimental" |
| Status | Active; **the successor** to Semantic Kernel and AutoGen (see next section). | [docs] |

### Status of Semantic Kernel and AutoGen (exact)

- **AutoGen:** `github.com/microsoft/autogen` README begins with a red "Archived" badge and "Project archived and no longer maintained"; "Microsoft is not providing bug fixes, security fixes, new features, or support for this project"; it calls Agent Framework "the enterprise-ready successor to AutoGen" and points to a migration guide. Last release seen: python-v0.7.5 on 2025-09-30; `autogen-agentchat` 0.7.5 on PyPI the same day; `pyautogen` 0.10.0 on 2025-07-15. One oddity: the GitHub API's `archived` flag was still false when I looked, though the README says archived. [source/docs] https://github.com/microsoft/autogen
- **Semantic Kernel:** its README opens with "Semantic Kernel is now Microsoft Agent Framework! ... MAF is the enterprise-ready successor to Semantic Kernel", with a link to a migration guide. It is **not archived** and still ships: Python `semantic-kernel` 1.47.0 (2026-11-05), .NET `Microsoft.SemanticKernel` 1.82.0 (release tag 2026-11-07), repo pushed 2026-11-19. No official "maintenance mode" or end-of-life date is stated on the pages I read; the 1.0 post "does not state end-of-life dates". Some third-party summaries say "maintenance mode, bug fixes and security patches only"; that is [secondary] and I did not find Microsoft saying it. Frequent releases suggest at least ongoing compatibility work. [source/docs]
- **Migration guides** exist for both: https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-semantic-kernel/ and `.../from-autogen/` [docs; read the SK one]. The SK guide maps: `Kernel`-bound `ChatCompletionAgent` to `Agent`/`ChatClientAgent` (the `Kernel` is gone), `[KernelFunction]`/`@kernel_function` plugins to plain functions or `@tool`, threads to `AgentSession` created by `agent.create_session()`, `invoke` to `run`, and offers a compatibility call `KernelFunction.as_agent_framework_tool()` (needs semantic-kernel 1.38+) so existing SK functions and vector-search functions can be reused as MAF tools [docs]. The page I read for Go says "Go support for this feature is coming soon."

## What it is, in terms of the runtime loop

MAF is a layered library: `BaseChatClient` implementations (one per provider) do model calls; an `Agent` (Python) or `ChatClientAgent` (.NET) wraps a client with instructions, tools, middleware, context providers and an `AgentSession`; a function-invocation layer inside the chat client runs the model-tool loop with a configurable iteration limit; `Workflow`s connect executors (functions or agents) with edges and support checkpointing; and a **Harness** composes the above with planning, file memory, compaction and tool approval. The loop is hidden in the chat pipeline (you do not write it), but it is built from public pieces: chat middleware, function middleware, agent middleware and context providers. Docs advice worth quoting: "If you can write a function to handle the task, do that instead of using an AI agent." [docs overview]

| # | Duty | MAF | API / note |
|---|---|---|---|
| 1 | Stream from the model | **Provided** | `agent.run(prompt, stream=True)` yields `AgentResponseUpdate`; .NET `RunStreamingAsync` [ran Python, docs .NET] |
| 2 | Loop as state machine | **Partly** | Function-invocation layer with `FunctionInvocationConfiguration`, harness bounded looping (`AgentLoopMiddleware`), workflow supersteps; the inner state machine is not user-visible [source: exported names; docs] |
| 3 | Validate args, schema | **Provided** | `@tool` generates schema from signature, `Annotated[str, "desc"]` descriptions; validation errors returned to the model [docs; schema seen in stub request] |
| 4 | Concurrent tools, cancellation | **Partly** | Async everywhere; parallel tool calls handled by the function layer [docs, not observed]; workflow fan-out/fan-in edge groups (`FanOutEdgeGroup`, `FanInEdgeGroup`) [source]; subprocess-tree cancellation is yours |
| 5 | Sandboxed execution | **Partly** | `agent-framework-tools` (shell tools, pre-release), `agent-framework-monty` package exists; provider-hosted code interpreter on OpenAI, Foundry, Anthropic, Gemini [docs] |
| 6 | Context assembly and compaction | **Provided (several strategies)** | `CompactionProvider`, `ContextWindowCompactionStrategy`, `AgentTriggeredCompactionStrategy`; harness enables compaction when token limits are set [source/docs] |
| 7 | Session persistence | **Provided** | `AgentSession`, `FileSessionStore`, `InMemoryCheckpointStorage`, `FileCheckpointStorage`; Cosmos, Redis and Mem0 packages [source/ran] |
| 8 | Permissions | **Partly, better than most** | `@tool(approval_mode="always_require")`, `ToolApprovalMiddleware`, `ToolApprovalRule`, harness "don't-ask-again" standing approvals [ran request/resume] |
| 9 | Extension | **Provided** | `MCPStdioTool`, `MCPStreamableHTTPTool`, `MCPWebsocketTool`; middleware (agent, chat, function); Skills; A2A client agent (`A2AAgent`) [source/docs] |
| 10 | Observability | **Provided** | OpenTelemetry GenAI via `configure_otel_providers(...)`; harness enables it by default; DevUI (preview) [source: signature read; docs] |
| 11 | Packaging | **You build it** | Libraries. Hosting options: Foundry hosted agents, Azure Functions, Durable Task packages (`agent-framework-azurefunctions`, `-durabletask` 1.0.0) [source] |
| 12 | Local models | **Provided** | `OllamaChatClient`, any OpenAI-compatible server via `OpenAIChatCompletionClient(base_url=...)`, Foundry Local, ONNX (.NET) [ran for the OpenAI-compatible path] |

## Implement it

### Install and minimal agent

```bash
python3 -m venv maf && maf/bin/pip install agent-framework   # executed: ok
```

`pip install agent-framework` is a **fat meta-package**: it installed 198 distributions in total including core, OpenAI, Foundry, Anthropic, Ollama, Bedrock, Gemini, Mistral, Mem0, Redis, Azure Cosmos, Azure AI Search, Copilot Studio, Claude, GitHub Copilot, DevUI, A2A, AG-UI, ChatKit, Purview, `openai`, `anthropic`, `claude-agent-sdk` (152 MB wheel), `mcp` 2.3.0 and `a2a-sdk` 1.3.1 [ran: `pip list`]. The docs say you can install only what you need: core plus a provider, for example `pip install agent-framework-core agent-framework-openai` [docs: SK migration guide].

Executed Python program:

```python
import asyncio
from agent_framework import Agent, tool
from agent_framework.openai import OpenAIChatClient

@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return "31 C and clear"

client = OpenAIChatClient(model="stub-model", api_key="stub", base_url="http://127.0.0.1:8103/v1")
agent = Agent(client=client, name="weather", instructions="Answer weather questions using tools.", tools=[get_weather])

async def main():
    r = await agent.run("What is the weather in Pune?")
    print("FINAL:", r.text)
asyncio.run(main())
```

### Run against the stub [ran]

Output: `FINAL: It is 31 C and clear in Pune.` **Important detail:** `OpenAIChatClient` in this release calls the OpenAI **Responses** API: `/_log` showed two `POST /v1/responses` requests (tool `get_weather`), not chat completions. The stub supports both, so it worked, but most local servers (Ollama before recent versions, vLLM chat setups, llama.cpp server) speak Chat Completions. For those use `OpenAIChatCompletionClient` (same constructor, `base_url=`), which I ran against the stub on `/v1/chat/completions` with the same result and two requests (2 and 4 messages) [ran]. With `from agent_framework.anthropic import AnthropicClient`, `AnthropicClient(model=..., api_key="stub", base_url="http://127.0.0.1:8103")` hit `POST /v1/messages` twice with tool `get_weather` and returned the same final text [ran]. MAF does not load `.env` automatically; call `load_dotenv()` yourself [docs].

.NET equivalent shape [docs, not run]: `AIAgent agent = chatClient.AsAIAgent(instructions: "...", tools: [AIFunctionFactory.Create(GetWeather)]); Console.WriteLine(await agent.RunAsync("What is the weather in Pune?"));` where `chatClient` is any `Microsoft.Extensions.AI.IChatClient`. Evidence: the SK migration guide shows `chatClient.AsAIAgent(tools: [AIFunctionFactory.Create(GetWeather)])` and `agent.RunAsync`. I could not compile or run it.

### Feature checks

| Feature | How | Status |
|---|---|---|
| (a) Streaming | `async for u in agent.run(prompt, stream=True): print(u.text)`. Against the stub I got 6 updates, most with empty `text` (tool-call and bookkeeping updates) and one carrying the final sentence; filter on non-empty text. .NET: `agent.RunStreamingAsync`. | [ran] |
| (b) Session memory | `s = agent.create_session(); await agent.run(p, session=s)`. In-memory history lives in `s.state["in_memory"]`. Service-managed history for Responses-based providers via `agent.get_session(service_session_id=...)`. Chat Completions and Anthropic: local history only. | [ran] two turns on one session; key list read |
| (c) Durable state | Two layers. Sessions: `FileSessionStore` and custom `SessionStore`. Workflows: `WorkflowBuilder(start_executor=..., checkpoint_storage=FileCheckpointStorage(dir))`; I ran a two-executor workflow and got output `['HI!']` with **3 checkpoint files** written. Resume from `WorkflowCheckpoint` by checkpoint id; Durable Task and Azure Functions packages for hosted replay. A plain `Agent.run` loop has no automatic crash-resume. | checkpoint write [ran]; resume API and hosting [docs/source], not run |
| (d) Human approval | `@tool(approval_mode="always_require")`. Run 1 returned no text, with message contents `function_call` and `function_approval_request`, and `r.user_input_requests` had length 1. Run 2: `await agent.run(Message("user", [req.to_function_approval_response(True)]), session=s)` executed the tool and returned the final text. Harness adds standing and automatic approval rules. | [ran] full round trip |
| (e) Second tool and parallel | `tools=[a, b]`; harness default exposes 14 tools. Parallel calls: the function layer handles multiple calls in one model turn [docs]; stub cannot emit two. | list [ran]; parallel [unverified] |
| (f) MCP | `MCPStdioTool(...)`, `MCPStreamableHTTPTool(...)`, `MCPWebsocketTool(...)` passed in `tools=[...]` (all exported). `mcp` 2.3.0 installed. I only imported the class; I did not start a server. | [source] import only |
| (g) Structured output | `await agent.run(p, options={"response_format": MyPydanticModel})`, then `r.value`. With the stub's plain-text reply it raised a Pydantic `ValidationError: Invalid JSON ... input_value='It is 31 C and clear in Pune.'`. So MAF **does** validate; a model that ignores the schema produces an exception, not a silent bad value. Provider table in docs: Ollama yes, Foundry Local no. | [ran] error path; success path [docs] |
| (h) Tracing | `from agent_framework.observability import configure_otel_providers`; arguments include `otlp_endpoint`, `enable_console_exporters`, `enable_sensitive_data`, `exporters`. Spans follow OpenTelemetry GenAI conventions. Not run (signature read only). | [source] |
| (i) Test without a real model | Run the real agent against a stub server (as here) [ran]; or implement a `BaseChatClient` returning canned `ChatResponse` [source: class exported, not tested]; `LocalEvaluator` and an `Evaluator` interface exist for scoring [source: names exported]. | stub [ran] |

Other runs: function middleware (`async def mw(ctx: FunctionInvocationContext, nxt): ...; await nxt()`) passed to `Agent(middleware=[mw])` observed `['get_weather']` [ran]. Harness: `create_harness_agent(client=..., disable_web_search=True)` ran and sent 14 tools to the model (`todos_add`, `todos_complete`, `todos_remove`, `todos_get_remaining`, `todos_get_all`, `mode_set`, `mode_get`, `file_memory_write`, `_read`, `_delete`, `_ls`, `_grep`, `_replace`, `_replace_lines`) [ran, from `/_log`]. It emitted `ExperimentalWarning: [HARNESS] FileSystemAgentFileStore is experimental and may change or be removed` [ran].

## The Agent Harness and the Copilot and Claude connectors (verified)

- **Agent Harness (MAF's own):** docs page https://learn.microsoft.com/en-us/agent-framework/concepts/harness (updated 2026-11-01). It is "an opinionated, batteries-included" configuration of normal MAF pieces, **not a separate runtime**: chat client, function-invocation pipeline with per-service-call history persistence, optional compaction, todo tracking, plan and execute agent modes, file memory, tool approval with standing rules, OpenTelemetry on by default, skills, optional background agents, shell and looping. It exists in .NET (`HarnessAgent`, `AsHarnessAgent()`, package `Microsoft.Agents.AI.Harness`), Python (`create_harness_agent`) and Go (`harness.AgentConfig`). Python status line: "`create_harness_agent` is released. Background agents, file access, and looping remain experimental, and shell tooling comes from the pre-release `agent-framework-tools` package." [docs] The 1.0 post (April) listed the harness as preview; later reports (InfoQ, August 2026, and dev.to/daily.dev items) say the harness and hosted agents reached general availability around Build (June 2026): I could not retrieve a primary announcement, so that GA date is [secondary].
- **GitHub Copilot SDK connector:** Python package `agent-framework-github-copilot` **2.2.0** exists on PyPI ("GitHub Copilot integration for Microsoft Agent Framework"); GitHub's own docs have a "Microsoft agent framework integration" page for the Copilot SDK (https://docs.github.com/en/copilot/how-tos/copilot-sdk/integrations/microsoft-agent-framework, surfaced by search; I did not open it) [source/secondary]. It wraps a Copilot agent so a workflow can delegate to it; the wrapped agent runs its own loop. Not run (needs GitHub auth).
- **Claude connector:** Python package `agent-framework-claude` **1.0.0b261112** (beta) "Claude Agent SDK integration for Microsoft Agent Framework"; it pulled in `claude-agent-sdk` 0.2.185 [ran: installed, not exercised]. Announced in a Microsoft devblog post dated 2026-01-30, "Build AI agents with Claude Agent SDK and Microsoft Agent Framework" [secondary: found by search, URL listed, not opened]. Needs Claude Code or API credentials; not run.
- **Do not confuse** the Claude connector (wraps the Claude Agent SDK, a full agent with its own tools) with `AnthropicClient` (plain Messages API chat client). The latter I ran against the stub.
- Claims I did not verify: that these connectors are "stable" (the Claude package is a date-stamped beta as of 2026-11-12, which contradicts "stable").

## Models and local models

- **First-class (most capabilities per the provider matrix):** Azure OpenAI, OpenAI, Microsoft Foundry (function tools, structured outputs, code interpreter, file search, MCP tools, background responses all ticked). **Anthropic:** function tools, structured outputs, code interpreter and MCP yes; file search and background responses no. **Ollama:** function tools and structured outputs yes, MCP and code interpreter no. **Foundry Local:** function tools only. Bedrock, Gemini, Mistral, ONNX (.NET), Dapr also exist [docs https://learn.microsoft.com/en-us/agent-framework/integrations/by-component/model-providers/].
- **OpenAI-compatible endpoint (Ollama's `/v1`, vLLM, llama.cpp):** `OpenAIChatCompletionClient(model="name", api_key="x", base_url="http://host:port/v1")` [ran against stub]. Avoid `OpenAIChatClient` (Responses API) unless the server implements Responses. .NET: use the OpenAI SDK with a custom endpoint, then `AsAIAgent` [docs, not run].
- **Ollama native:** `from agent_framework.ollama import OllamaChatClient` (beta package `agent-framework-ollama` 1.0.0b261112) [source: class present].
- **Anthropic:** `AnthropicClient`, plus Foundry, Bedrock and Vertex variants (`AnthropicFoundryClient`, `AnthropicBedrockClient`, `AnthropicVertexClient`) [source: class names]; ran Messages API path against stub.
- **Small and open models:** the docs matrix marks Foundry Local without structured output; structured output errors out on non-JSON replies as I saw. No documented tool-call repair; retry is through middleware you write, plus provider-level retries (`openai`/`anthropic` SDK defaults, which can retry silently) [unverified for specifics].

## State, durability and concurrency

State objects: `AgentSession` (holds `state` dict, optional service session id); history and memory held by context providers and history providers; `WorkflowCheckpoint` for graph state, saved per superstep to `CheckpointStorage` (in-memory, file, Cosmos in the Cosmos package). Python is async-first (`await agent.run`); .NET uses `Task`/`IAsyncEnumerable`. Workflows are executor graphs; supersteps run executors in parallel and checkpoint between them [docs; I saw 3 checkpoint files for a 2-node run]. Agent-level crash recovery: you persist the session yourself (`FileSessionStore`) and re-run; I found no exactly-once tool semantics. Durable hosting: `agent-framework-durabletask` and `-azurefunctions` (1.0.0) give replay-based durability on those platforms [source: package names and versions only]. Per-service-call history persistence in the harness means a crash mid-tool-loop loses at most one model call [docs].

## What you still build yourself

| Need | Given | Left |
|---|---|---|
| Permissions | Approval flag on tools, middleware, standing approvals in harness | Policy language, path rules, deny lists, audit trail |
| Sandboxing | Hosted code interpreter (some providers), pre-release shell tools package | OS-level confinement for local shell and file tools |
| Compaction | Several strategies, harness default when limits set | Tuning per model, summarisation quality tests |
| Cost control | Usage on responses, OTel metrics | Budgets, ceilings, per-user quotas |
| Evaluation | `Evaluator`, `LocalEvaluator`; Foundry evaluations (preview) | Task suites, judges, regression runs |
| Packaging | Libraries only | Installer, binary, updater |
| Local-model hardening | Ollama and OpenAI-compatible clients | Tool-call repair, grammar-constrained output |

## Lock-in and escape hatches

.NET code leans on `Microsoft.Extensions.AI` types (`IChatClient`, `AIFunction`), which are a Microsoft-defined abstraction used beyond MAF and so lower lock-in than MAF's own. Python code leans on `Agent`, `AgentSession`, `Message`, `Content`, `@tool`, `WorkflowBuilder`: MAF's own types. Plain Python functions with docstrings are portable. Workflows are the sticky part (executors, edges, checkpoint formats). The chat clients wrap the official `openai` and `anthropic` SDKs, so dropping to those is easy; a plain-loop replacement of just the function-calling layer is small (about the 100-line loop), while sessions, checkpoints, middleware and the harness are large. Migration stories: the official SK and AutoGen guides show **into** MAF with a compatibility shim for SK functions [docs]; no outbound migration stories found. Python and .NET are not API-identical: names and optional features differ (for example `create_harness_agent` vs `AsHarnessAgent`; shell tools Python-only pre-release) [docs].

## Pitfalls

1. **Meta-package weight:** 198 packages and a 152 MB Claude SDK wheel for the default install [ran]. Install core plus one provider.
2. **Responses vs Chat Completions:** `OpenAIChatClient` talks Responses; pointing it at an Ollama or vLLM Chat Completions server may fail [ran: confirmed which endpoint it hits].
3. **Version-label mismatch:** "1.0" applies to core, yet satellites you want (Anthropic, Ollama, Claude, DevUI, A2A, Redis) were still date-stamped betas at 2026-11-12 [ran: `pip list`]. Pin versions; expect breaks in betas.
4. **Fast moving docs:** the harness page updated 2026-11-01; experimental labels inside "released" features (harness file access, background agents, looping) [docs].
5. **Source repo inaccessible here:** `github.com/microsoft/agent-framework` returned 404 to unauthenticated requests on 2026-11-19, so issue history and licence are unchecked [unverified]. Maybe a transient or access problem; retry before relying on it.
6. **Approval resume shape:** the run returns empty `text` and puts the approval request in `user_input_requests`; naive code prints an empty answer [ran].
7. **Teardown noise:** running several `asyncio.run` calls in one script printed `RuntimeError: Event loop is closed` tracebacks from the HTTP client's close path under Python 3.15 [ran]; use one event loop and `async with client`, as the docs advise.
8. **Harness defaults are many tools:** 14 tools and the harness instructions go into every request [ran], with token cost on small-context models.
9. **Legal notice:** the docs state that third-party and non-Azure models are used at your own risk and with your own data-flow review [docs].
10. **Two Microsoft predecessors still ship:** searching finds Semantic Kernel and AutoGen tutorials that no longer apply; AutoGen is archived [docs].

## Choose it when / avoid it when

Choose MAF when: you are a .NET shop (it rides `Microsoft.Extensions.AI`, so DI and logging fit), or Azure/Foundry is your platform; you want graph workflows with checkpoints, approvals and middleware in one supported library; you are migrating Semantic Kernel or AutoGen code (there is a guide and a shim); you want one orchestration layer that can delegate to Copilot or Claude agents as workflow nodes.

Avoid it when: you need a small install or single binary; your models are local and you need Chat Completions plus tight control of tool-call parsing (use the thin client yourself); you want stable Anthropic, Ollama or A2A packages today (they were beta); you cannot verify the licence and repo state (see Pitfall 5).

Against writing the loop yourself: MAF buys duties 1, 3, 7 (partly), 8 (approvals), 9, 10 and 12, and workflow checkpointing. It costs hidden loop state (you cannot own the state machine), a large dependency tree, version churn in satellite packages and a harness whose defaults you must read. For a runtime that is the product, own the loop and borrow clients, MCP and OpenTelemetry; for an application on Azure or .NET, use MAF.

## What was verified

| Item | Detail | Result |
|---|---|---|
| Install | `pip install agent-framework` 1.26.0 into a venv, Python 3.15.2 | [ran] ok, 198 distributions |
| Minimal agent | `OpenAIChatClient` to stub on 8103 | [ran] `FINAL: It is 31 C and clear in Pune.`; `/_log`: 2 requests to `/v1/responses` with tool `get_weather` |
| Chat Completions | `OpenAIChatCompletionClient` | [ran] 2 requests to `/v1/chat/completions` |
| Anthropic | `AnthropicClient`, base URL without `/v1` | [ran] 2 requests to `/v1/messages` |
| Streaming, sessions | `stream=True`, `create_session` | [ran] |
| Approval | `approval_mode="always_require"` request, then approve and resume | [ran] |
| Structured output | `response_format` with stub | [ran] ValidationError on non-JSON |
| Middleware | function middleware | [ran] saw `get_weather` |
| Workflow checkpoint | `WorkflowBuilder` with `FileCheckpointStorage` | [ran] output `['HI!']`, 3 checkpoint files; resume not run |
| Harness | `create_harness_agent` | [ran] 14 tools in request; experimental warning |
| MCP, OTel | class and signature inspection only | [source] |
| .NET and Go | NuGet versions 1.28.0 and Go tag v0.3.1; code from docs | [docs/source]; not run |
| SK and AutoGen status | READMEs, PyPI, NuGet, GitHub releases, official 1.0 post | [docs/source] |
| Copilot and Claude connectors | PyPI packages and metadata; `claude-agent-sdk` installed | existence [source]; behaviour [unverified]; "stable" claims [secondary] and contradicted for the Claude package |
| Could not check | Source repo (404), licence, stars, release notes, Go and .NET behaviour, the 2026-06 GA reports for the harness and connectors from a primary source | none |
