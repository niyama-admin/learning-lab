# LlamaIndex

Data and retrieval-augmented generation (RAG, answering from your documents) framework, with a workflow-based agent layer (`FunctionAgent`, `AgentWorkflow`) and a separate hosted document platform (LlamaParse, formerly LlamaCloud).

| Item | Value |
|---|---|
| Covers version | `llama-index-core` 0.14.26 (2026-11-13), `llama-index-workflows` 2.26.1 (2026-10-21) |
| Profile date | 2026-11-19 |
| Primary language | Python (core needs 3.11 or later). The TypeScript port is archived (see Snapshot) |
| Verified by | Installed on Python 3.15.2 and ran against the stub model server; read package source and metadata; read docs pages |
| Related reading | [runtime duties](../../languages/README.md#2-what-a-runtime-layer-actually-does), [reference loop](../../languages/README.md#8-a-language-neutral-reference-specification) |

## Snapshot

| Row | Finding | Evidence |
|---|---|---|
| Current version | `llama-index-core` 0.14.26 uploaded 2026-11-13; the `llama-index` meta-package is also 0.14.26. Workflows engine `llama-index-workflows` 2.26.1 (2026-10-21), a separate package with its own version line. | [source] PyPI JSON |
| License | MIT (Python repo and TypeScript repo, GitHub licence field). LlamaParse hosted service is commercial. | [source] GitHub API; [secondary] https://www.llamaindex.ai/pricing ("LlamaParse is commercial, not open source") |
| Maintainer | LlamaIndex Inc. (GitHub org `run-llama`), venture-backed company; the open-source core sits next to a commercial cloud. No foundation governance seen. | [docs] https://developers.llamaindex.ai ; governance details not verified |
| Languages | Python: primary, core 0.14.26, requires Python >=3.11 (`llama-index-workflows` >=3.10). TypeScript (`llamaindex` on npm 0.12.1, 2025-12-02): deprecated. Its README says "This project is deprecated and no longer maintained" and the repository was archived on 2026-04-30. A separate package `@llamaindex/workflow-core` (npm 1.3.4, last modified 2026-06-05) exists; I did not examine it. | [source] PyPI and npm registries; [docs] https://github.com/run-llama/LlamaIndexTS (README notice) |
| Repository | https://github.com/run-llama/llama_index (about 53,000 stars when checked; popularity only) | [source] GitHub API |
| Docs | https://developers.llamaindex.ai/python/framework/ and https://developers.llamaindex.ai/python/llamaagents/workflows/ | [docs] |
| Release cadence | `llama-index-core`: 0.14.23 (2026-06-24), 0.14.24 (2026-08-19), 0.14.25 (2026-09-21), 0.14.26 (2026-11-13): roughly one release every one to two months. Integration packages (about 300 per the docs; not counted) release independently. | [source] PyPI JSON |
| Breaking-change history | 0.9.48 (2024-02-06) to 0.10.0 (2024-02-10): the package split into `llama-index-core` plus per-integration packages (`llama-index-llms-openai` and so on), and old imports moved. 0.13.0 (2025-07-30) and 0.14.0 (2025-09-08) are the last two minor lines; the old agent classes (`AgentRunner`, worker-based agents) no longer exist in 0.14.26 (the `llama_index.core.agent` namespace now holds only the workflow-based agent classes and message types). The Python Cloud SDKs also moved: `llama-cloud-services` and `llama-parse` carry a deprecation notice ("maintained until May 1, 2026") pointing to `llama-cloud>=1.0` (now 2.19.0). The detailed 0.13 and 0.14 changelogs were not read, so exactly which APIs broke at each boundary is not verified. | [ran] `dir(llama_index.core.agent)`; [source] PyPI JSON and package READMEs |
| Status | Active (Python). TypeScript archived. | [source] |

## What it is, in terms of the runtime loop

LlamaIndex began as a library for connecting a language model to your own data: load documents with readers, split them into nodes, embed and index them, then retrieve and synthesise an answer. That is still its centre of gravity (readers, node parsers, indices, retrievers, query engines, ingestion pipelines, evaluation). On top of it the project built **Workflows**: an event-driven engine where `@step` methods consume and emit typed `Event` objects. The current **agents** are workflows too: `FunctionAgent` (native tool calling), `ReActAgent` (text-format reasoning), `CodeActAgent` (the model writes code), and `AgentWorkflow` (several agents with handoff between them). [ran] `dir(llama_index.core.agent.workflow)` lists exactly those classes plus `AgentInput`, `AgentStream`, `AgentOutput`, `ToolCall`, `ToolCallResult`; [docs] https://developers.llamaindex.ai/python/framework/understanding/agent/ .

The consequence for an implementer is that an agent is a small workflow you can read: one step takes the user message and chat memory, another calls the model, another runs tools and loops back. It is far less opaque than the older runner-and-worker design, and the same engine runs your own multi-step pipelines.

| # | Runtime duty | LlamaIndex | API name and note |
|---|---|---|---|
| 1 | Stream from the model | Provided | `handler.stream_events()` yields `AgentStream` deltas. [ran] events seen: `AgentInput, AgentStream, AgentStream, AgentOutput, ToolCall, ToolCallResult, AgentInput, AgentStream, AgentStream, AgentOutput, StopEvent`. Streaming is on by default; `streaming=False` for models that lack it ([docs]) |
| 2 | Loop as a state machine | Provided | The agent is a `Workflow` whose steps loop on events; `max_iterations` and `early_stopping_method` on `run()` [source] `agent/workflow/base_agent.py` |
| 3 | Validate tool arguments, generate schemas | Provided | `FunctionTool.from_defaults` is applied automatically to plain Python functions; schema from type hints and docstring. [ran] stub received a valid schema |
| 4 | Concurrent tools, cancellation | Partly | Async tools (sync functions are wrapped, `_ensure_tools_are_async` [source]); workflow steps can fan out and gather; `handler.cancel_run()` exists [ran: called once in the pause test]. No read-only-parallel and writers-serial policy: you decide inside tools |
| 5 | Sandboxed execution | You build it | `CodeActAgent` executes model-written code through an executor function you supply [source: agent class exists; not run]. No sandbox shipped |
| 6 | Context assembly and compaction | Partly | `ChatMemoryBuffer` (token limit) and the newer `Memory` class with a session id and token limit [ran: both accepted by `agent.run(memory=...)`]; long-term memory blocks exist [docs-level knowledge, not run]. Retrieval for context is the core strength |
| 7 | Session persistence | Partly | Workflow `Context.to_dict()` / `Context.from_dict()` [ran]; memory is not serialised with it (below); `Memory` can be backed by a SQL URI [unverified for this release] |
| 8 | Permissions | Partly | Human-in-the-loop events (`InputRequiredEvent`, `HumanResponseEvent`) [ran]; no rule engine |
| 9 | Extension: MCP, plugins, hooks | Provided | `llama-index-tools-mcp` 0.7.0: `BasicMCPClient`, `McpToolSpec` [ran]; instrumentation event handlers [ran] |
| 10 | Observability | Provided | `llama_index.core.instrumentation` dispatcher with typed events [ran: 33 events for one RAG query and one multi-agent run]; many third-party callbacks (Arize, Langfuse and others) [unverified list] |
| 11 | Packaging | Partly | A plain Python library; `llamactl` CLI serves and deploys workflows, with a hosted deploy path [docs] https://developers.llamaindex.ai/python/llamaagents/workflows/ |
| 12 | Local models | Provided | `OpenAILike`, `llama-index-llms-ollama`, `llama-index-llms-llama-cpp`, Hugging Face integrations; local embeddings similarly [docs-level; only OpenAILike was run] |

## Implement it

### Install and minimal agent

Install (this ran on the machine's default Python 3.15.2):

```bash
# executed
python3 -m venv li
li/bin/pip install llama-index-core llama-index-llms-openai-like
# resolved: llama-index-core 0.14.26, llama-index-llms-openai-like 0.9.0,
# llama-index-llms-openai 0.9.0, llama-index-workflows 2.26.1, openai 3.55.1, pydantic 2.14.3
```

Core pulls in NLTK, NumPy, Pillow, SQLAlchemy, tiktoken and others, but no vector database or provider client; those are integration packages you add as needed. [source] `llama_index_core-0.14.26` METADATA.

Minimal agent (Python, executed against the stub):

```python
import asyncio
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai_like import OpenAILike

def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return "31 C and clear"

llm = OpenAILike(model="stub-model", api_base="http://127.0.0.1:8105/v1",
                 api_key="stub", is_chat_model=True, is_function_calling_model=True)
agent = FunctionAgent(tools=[get_weather], llm=llm,
                      system_prompt="You are a weather assistant.")

async def main():
    resp = await agent.run("What is the weather in Pune?")
    print("FINAL:", resp)
asyncio.run(main())
```

Two settings are easy to miss: `is_chat_model=True` and `is_function_calling_model=True` on `OpenAILike`. Without the second flag the generic wrapper does not claim tool support; I did not test the failure message. [unverified] consequence; [ran] with both flags.

### Run against the stub

[ran] Output:

```text
FINAL: It is 31 C and clear in Pune.
```

Stub `/_log` showed two `POST /v1/chat/completions` requests: the first had `tools: ["get_weather"]` and 2 messages (system, user); the second had 4 messages (assistant tool call and tool result appended). The tool round trip happened. No warnings were printed for this run on Python 3.15.

### Feature checks

| Feature | How and result | Status |
|---|---|---|
| (a) Streaming | `h = agent.run(...); async for ev in h.stream_events(): ...; await h`. Event types seen are in the table above. `AgentStream` carries `.delta`. | [ran] |
| (b) Memory across turns | Surprise: reusing the same `Context` object across two `agent.run(msg, ctx=ctx)` calls did not carry history in this version. The stub saw 1 message on each of three consecutive turns. Passing a memory object explicitly did work: `agent.run(q, memory=ChatMemoryBuffer.from_defaults(llm=llm))` produced requests with 1, 3 and 5 messages on three turns (a tool-free agent adds a user and an assistant message per turn), and `Memory.from_defaults(session_id=..., token_limit=3000)` also carried history (1 then 3 messages). Always pass `memory=` and keep that object. | [ran] |
| (c) Durable state: pause, resume, restart | `ctx.to_dict(serializer=JsonSerializer())` then `Context.from_dict(workflow, snapshot, serializer=JsonSerializer())`. Tested on a custom workflow: paused at an `InputRequiredEvent`, cancelled the run, serialised, restored into a new context, sent `HumanResponseEvent(response="yes")`, result "approved". The agent's `memory` key is not serialised: a warning says "Skipping serialization of known unserializable key: memory ... will require this item to be set manually after deserialization", and a restored agent context lost its history. The docs describe checkpointing on every `StepStateChanged` event with `NOT_RUNNING`, say resume is at-least-once (steps mid-execution are re-run), and mention a DBOS plugin that journals step transitions to a database. | [ran] snapshot and restore; [docs] https://developers.llamaindex.ai/python/llamaagents/workflows/durable_workflows/ for checkpoint loop and DBOS (not run) |
| (d) Human approval before a tool | Workflow pattern: a step returns `InputRequiredEvent(prefix=...)`; the caller reads it from `stream_events()` and replies with `ctx.send_event(HumanResponseEvent(response=...))`. [ran] on a two-step workflow. `FunctionAgent` has no built-in approval flag found in this read; you wrap a tool so it emits an input-required event first (the docs list a "Human in the Loop" guide that I only saw in the sidebar). | [ran] workflow; agent wiring [unverified] |
| (e) Second tool and parallel calls | `tools=[get_weather, get_time]`; the stub received both tool names. Parallel calls: the stub emits one call per turn, so not observed. | [ran] two tools; parallel [unverified] |
| (f) MCP server | `from llama_index.tools.mcp import BasicMCPClient, McpToolSpec`; `tools = await McpToolSpec(client=BasicMCPClient(cmd, args=[...])).to_tool_list_async()`; pass `tools` to the agent. Round trip completed against a FastMCP stdio server, tool name preserved as `get_weather`. | [ran] |
| (g) Structured output | `FunctionAgent(output_cls=PydanticModel)`; result in `resp.structured_response` and `resp.get_pydantic_model(Model)`. The framework made an extra model request whose only tool was named `Out` (the target class), so structured output costs one more call. Against the stub (scripted) the model returned an empty call and the result was `{'city': '?'}`, the model's default, so I could not test a failing parse. | [ran] |
| (h) Tracing | `from llama_index.core.instrumentation import get_dispatcher`; register a `BaseEventHandler`. Events seen: `EmbeddingStartEvent/EndEvent`, `LLMChatStartEvent/EndEvent`, `LLMPredictStartEvent/EndEvent`, `GetResponseStart/End`, `QueryStart/End`, `RetrievalEnd`. Third-party exporters (OpenTelemetry-based and vendors) are available as integration packages [unverified list]. | [ran] handler |
| (i) Test without a real model | The stub server (done). In-process: `MockLLM` and `MockEmbedding` in core (`llama_index.core.llms.mock`, `llama_index.core.embeddings.MockEmbedding`) [ran: `MockEmbedding` used]; `workflows.testing.WorkflowTestRunner` exists in the workflows package [source, not run]. | [ran] / [source] |

### The data side, briefly (this is why you would pick it)

[ran] Index and query with no model: `SimpleDirectoryReader(...).load_data()` read one text file; `VectorStoreIndex.from_documents(docs)` built an in-memory index (1 document, 1 node) using `MockEmbedding(embed_dim=8)`; `index.as_query_engine().query(...)` made exactly one chat request to the stub. A `QueryEngineTool.from_defaults(query_engine, name=..., description=...)` turns a query engine into an agent tool.

One gotcha: `SimpleDirectoryReader` found no files when the path contained a hidden directory (here `.claude`), raising "No files found". Pass `exclude_hidden=False`. [ran]

Multi-agent: `AgentWorkflow(agents=[a, b], root_agent="a")` with `can_handoff_to=["b"]` on `a`. [ran] The agent saw an extra tool named `handoff` alongside `get_weather`, so handoff is a tool call. Handoff itself was not exercised (the stub never picks it).

## Models and local models

- **Setting a model.** Either set globally (`Settings.llm = ...`, `Settings.embed_model = ...`) or pass `llm=` to the agent. [ran] both.
- **OpenAI-compatible endpoint** (vLLM, llama.cpp server, LM Studio, gateways, Ollama's `/v1` route): `OpenAILike(model=..., api_base=..., api_key=..., is_chat_model=True, is_function_calling_model=True)` from `llama-index-llms-openai-like`. [ran] against the stub.
- **Native integrations** exist as separate packages for OpenAI, Anthropic, Gemini, Bedrock, Mistral, Ollama, llama.cpp and Hugging Face (`llama-index-llms-<name>`). Their relative quality was not measured; the OpenAI package is the most used reference. [docs-level, unverified for quality]
- **Embeddings** default to OpenAI unless you set `Settings.embed_model` (HuggingFace, Ollama and others are integration packages). With no key the first index build fails; that is why `MockEmbedding` is useful in tests. [unverified: default behaviour recalled]
- **Small and open models.** `FunctionAgent` needs native tool calling from the model and endpoint; models without it should use `ReActAgent` (text protocol) or `CodeActAgent`. Structured output via `output_cls` relies on the model's tool-call or JSON support; I could not test failure behaviour. The `dirtyjson` dependency suggests lenient JSON parsing for model output. [source] METADATA; [unverified] effects
- **Retries.** `tenacity` is a core dependency, used for model call retries in integrations [source for the dependency; retry counts per integration not verified]. Workflows have a `RetryPolicy` protocol for steps (`workflows/retry_policy.py`). [source]

## State, durability and concurrency

- **Representation.** A running workflow keeps an in-process `Context`: a typed or dict state store (`ctx.store`), pending events, and per-step bookkeeping. `ctx.to_dict()` of a finished agent run was 1,612 bytes of JSON with keys including `state`, `workers`, `deliveries`, `streams`, `journal_seq`. [ran] Memory, tools, LLM clients and other non-serialisable objects stay out; the `Resource` mechanism injects such objects at run time. [docs]
- **What survives a crash.** Nothing unless you write snapshots: the docs show a loop that saves `ctx.to_dict()` on each completed step. Resume is at-least-once, so tools with side effects must be idempotent, and anything stored on the workflow instance (not in events or the store) is lost. [docs] durable-workflows page. DBOS integration gives journaling without a hand-written loop; not run. The `workflows/server` package has a SQLite store, which I saw only as a directory listing. [source]
- **Concurrency.** Fully `asyncio`. Steps run concurrently when events allow; a step may return a list of events to fan out and another step can gather them with `ctx.collect_events`. Synchronous tools are wrapped for async use. [docs]
- **Cancellation.** `handler.cancel_run()`. [ran] called once. Does it stop an in-flight model stream or a subprocess in a tool? Not tested.
- **Validation.** Workflows check the event graph before running (missing producers or consumers, missing `StopEvent`). [docs]

## What you still build yourself

| Need | What LlamaIndex gives | What remains |
|---|---|---|
| Permission policy | Input-required events | Rules, modes, audit; wiring approval into tools |
| Sandbox | `CodeActAgent` hook for an executor | The sandbox itself |
| Context compaction | Token-limited memory, retrieval, summarising memory blocks (docs-level) | Policy for long runs; verify what is dropped |
| Cost control | `max_iterations`; instrumentation events carry usage on LLM end events [unverified] | Token budget and hard stop |
| Durable runs | Context snapshot, DBOS option | Snapshot loop, idempotent tools, memory serialisation (not covered by `to_dict`) |
| Evaluation | Evaluators for retrieval and response in core (docs-level) | Your task suites |
| Document parsing quality | Many readers, plus hosted LlamaParse | See next section |

### Parsing and indexing strengths, and what is hosted

- **Open source readers.** `SimpleDirectoryReader` handles text, Markdown, PDF (through a PDF reader integration), images, e-mail and more through per-extension readers; hundreds of connectors live on LlamaHub. Node parsers include sentence, token, Markdown and semantic splitters; `IngestionPipeline` adds caching and deduplication. [docs-level; only `SimpleDirectoryReader` on a text file and `VectorStoreIndex` were run]
- **Local parsers.** LiteParse is an Apache-2.0, local-only PDF text extractor with bounding boxes (PDFium, optional Tesseract OCR; Rust, Node, Python, WebAssembly). Its README itself recommends LlamaParse for complex layouts, charts and handwriting. [docs] https://github.com/run-llama/liteparse
- **Hosted: LlamaParse (formerly LlamaCloud).** Products named by the vendor: Parse (to Markdown or JSON), Extract (JSON to your schema with citations), Index (managed ingestion and retrieval), Classify and Split. Pricing is credit-based per page; the pricing page lists a free monthly allowance of 10,000 credits, $1.50 per 1,000 credits beyond, tiers from about 1 credit per page (fast) to 25 (agentic plus), a $500 per month Pro plan and a custom Enterprise plan with single-tenant or on-premises deployment. Prices drift; re-check. [secondary] https://www.llamaindex.ai/pricing ; [docs] https://developers.llamaindex.ai
- **Which side is open.** OSS: framework, Workflows engine, agents, readers, LiteParse. Hosted and commercial: LlamaParse and its Extract, Index, Classify and Split services, the deploy path for workflows (`llamactl` plus a hosted "click to deploy"). The OSS framework can call the hosted service through `llama-cloud` (the SDK, v2.19.0) with `LLAMA_CLOUD_API_KEY`. This was not run. Sending your documents to the hosted service is a privacy and residency decision; the vendor lists SOC 2 Type II, an EU region and HIPAA for Enterprise. [secondary]

## Lock-in and escape hatches

- **Your code is framework types** at the edges that matter: `Workflow`, `Event`, `Context`, `FunctionAgent`, `Settings`, `Document` and `Node`. Plain Python tool functions are portable.
- **Removal difficulty.** Replacing the agent with a plain loop is small (the agent is a few steps, per the reference loop). Replacing the data layer (readers, node parsers, indices, retrievers) is a real project, and that is where the framework earns its place; a common exit is to keep LlamaIndex only for ingestion and retrieval and call it from your own loop as a tool. [unverified: recommended pattern, not a recorded migration]
- **Integration package sprawl.** About 300 integration packages with independent versions; core upgrades can orphan them. [docs-level]
- **Migration stories.** In this profile the history itself is the evidence: the 0.10 package split, replacement of the runner-based agents by workflow agents, and Python SDK renames for the cloud product. Third-party stories were not collected.

## Pitfalls

1. **Memory is not what you expect.** Reusing a `Context` did not carry history, and `to_dict()` drops memory by design (warning printed). Pass and persist the `memory=` object yourself. [ran]
2. **Default extras and models.** Document readers for each format, vector stores and embedding models are separate packages; the first query without them fails or reaches for OpenAI. [source] METADATA; [unverified] failure text
3. **Hidden prompts.** Query engines carry default QA and refine templates (via the `banks` prompt library, a core dependency); agents add handoff tools and a system prompt. Inspect them with `get_prompts()` (docs-level) before tuning. [ran] a query engine issued one chat request with a system and user message; the content was not read.
4. **Structured output costs an extra call** and uses a synthetic tool named after your class. [ran]
5. **Event-driven debugging.** Control flow lives in event types; a wrong return annotation silently changes the route. Graph validation catches missing producers or consumers before running. [docs]
6. **Hidden-directory paths.** `SimpleDirectoryReader` skips paths under hidden directories unless `exclude_hidden=False`. [ran]
7. **At-least-once resume.** Side-effecting tools will repeat after a restore. [docs]
8. **Churn.** Two renames in the cloud SDKs, a 2024 package split and replacement of the agent classes mean older tutorials and Stack Overflow answers often show APIs that no longer exist (for example the old runner classes). [ran] absence of `AgentRunner` in 0.14.26; [secondary] tutorial drift is general experience, [unverified] for specific pages
9. **TypeScript is a dead end.** The port is archived. [docs] README notice
10. **Warnings on Python 3.15.** None in the minimal run; one `UnserializableKeyWarning` from snapshotting. Python 3.15 worked for the core, workflows and MCP packages; I did not test every integration. [ran]

## Choose it when / avoid it when

**Choose LlamaIndex when**

- Your agent's main job is answering from or extracting from large, messy document sets and you want readers, chunking, indexing, retrieval and evaluation in one place.
- You want a small, readable event-driven workflow engine (`@step`, typed events, serialisable context) for multi-step pipelines that mix retrieval, tools and approvals.
- You need a quick way to put a query engine or an MCP server behind an agent, with a multi-agent handoff already implemented.
- You might later buy the hosted parser for hard documents (scans, tables, charts) and want a drop-in path.

**Avoid it when**

- The product is a tool-using coding or operations agent with no document corpus: you would use the agent layer only, and it gives you a loop you can write in about 100 lines, minus memory serialisation, permissions and sandbox, which you still build.
- You need TypeScript (archived) or want a single package with stable APIs; you will pin versions across core, workflows and many integrations.
- You must run fully offline or on small local models with structured output and tool calling guarantees you have not tested; the tool-calling and structured-output paths assume capable models.
- Your documents cannot leave your environment and the open-source readers (or LiteParse) are not good enough on your files: the strongest parsing is hosted.

**Against writing the loop yourself.** The framework buys: schema generation, provider adapters, streaming events, MCP tools, workflow engine with snapshots, handoff, and above all the data stack (readers, node parsers, indices, retrievers). It costs: a large integration surface, API churn, a memory model that needs care, and a workflow idiom you must learn. A reasonable plan for a runtime builder: write your own loop, and borrow LlamaIndex only for ingestion and retrieval, exposed to the loop as tools.

## What was verified

| Item | Detail | Label |
|---|---|---|
| Environment | Python 3.15.2 venv; `llama-index-core` 0.14.26; `llama-index-workflows` 2.26.1; `llama-index-llms-openai-like` 0.9.0; `llama-index-tools-mcp` 0.7.0; `openai` 3.55.1; `pydantic` 2.14.3 | [ran] |
| Minimal `FunctionAgent` | Final answer "It is 31 C and clear in Pune."; stub log: 2 requests, tools offered, tool message in the second | [ran] |
| Streaming events, two tools, structured output (extra `Out` call), instrumentation handler, `MockEmbedding` | As reported above | [ran] |
| Memory behaviour | Context reuse: no history; explicit `ChatMemoryBuffer` and `Memory`: history carried | [ran] |
| Workflow pause, snapshot, restore, human response | Custom two-step workflow | [ran] |
| MCP | FastMCP stdio server via `McpToolSpec`; round trip completed | [ran] |
| RAG | `SimpleDirectoryReader`, `VectorStoreIndex`, `as_query_engine().query` (one request), `QueryEngineTool` | [ran] |
| `AgentWorkflow` with `can_handoff_to` | Constructed and run; saw extra `handoff` tool; handoff not triggered | [ran] |
| Versions, release dates, TS archive status, LlamaParse deprecations | PyPI and npm registries, GitHub README notices | [source] / [docs] |
| LlamaParse product list, pricing, LiteParse, durable workflow guide | Fetched docs and pricing pages | [docs] / [secondary] |
| Not run | `ReActAgent`, `CodeActAgent`, parallel tool calls, handoff, DBOS plugin, `llamactl`, LlamaParse or any hosted call, PDF or OCR parsing, real embeddings, Ollama, cancellation of an in-flight call, `WorkflowTestRunner`, `@llamaindex/workflow-core` | not verified |
