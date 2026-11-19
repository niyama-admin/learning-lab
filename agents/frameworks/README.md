# Agent frameworks, for someone who has to implement

Sixteen frameworks compared from an implementer's standpoint: what you write to get an agent running, what you get for free, what you still have to build, and when writing the loop yourself is the better choice. Every figure is dated **2026-11-19**. This field changes weekly; treat anything older than 90 days as a prompt to re-check, not a fact.

Each framework has a [profile](profiles/) written to one [spec](profile-spec.md): a snapshot, a mapping onto the twelve duties of a runtime, a minimal agent, feature checks, local-model notes, what you still build, lock-in, pitfalls, and a choose-or-avoid section. A deterministic [stub model server](stub/server.mjs) lets you try any of them without keys or network.

## 1. The answer first

**If the runtime itself is your product, own the loop and borrow the parts.** Nearly every profile ended there, independently. The loop is about a hundred lines ([reference specification](../languages/README.md#8-a-language-neutral-reference-specification)); what frameworks add is below the loop (provider adapters, schema generation, MCP clients, tracing, some persistence). Take those pieces. Do not take the loop, because the loop is where your permission model, session log, cancellation and context policy live, and none of the sixteen lets you own them cleanly.

**If the agent is a feature inside an application, a framework earns its place**, and the right one is set mostly by your platform, not by feature lists:

| Your situation | Start with | Why, and the main caution |
|---|---|---|
| Python, control flow with branches, human gates and resumable steps | **LangGraph** (with LangChain's `create_agent` if you want the prebuilt loop) | Step checkpoints, interrupts and crash resume worked in our runs. Heavy: 67 installed distributions for LangChain. |
| Python, the hard problem is typed boundaries with the model (validation, retries, typed outputs) | **PydanticAI** | Strongest model boundary; nine durable-execution integrations (docs). V2 (June 2026) removed many V1 names, so most online snippets fail on a fresh install. No sandbox or permission engine. |
| Python, you are on OpenAI models and want a small library | **OpenAI Agents SDK** | Thin loop you could rewrite. Pre-1.0 with frequent breaking minors; the default tracing exporter uploads to OpenAI. |
| A coding or file-editing agent, Claude only | **Claude Agent SDK** | You get Claude Code's tools, permissions, sessions and compaction. You also get a closed-source 354 MB binary per install, Claude models only, and daily releases. It is a build-versus-buy of the harness, not a convenience library. |
| Google Cloud or Gemini, or the same agent model in Go and Java services | **Google ADK** | Five language versions. Non-Gemini models need an extra adapter; the TypeScript version ships only Gemini and Apigee model classes. |
| .NET or Azure | **Microsoft Agent Framework** | Rides `Microsoft.Extensions.AI`; graph workflows with checkpoints. Many satellite packages are still betas, and AutoGen is archived. |
| TypeScript with a web UI | **Vercel AI SDK** as the provider layer, **Mastra** if you also want memory, workflows and evals | AI SDK loop is thin and in-memory; durability is a separate newer package. Mastra's workflow resume survived a real process restart but a basic install is about 191 MB. |
| Documents are the product (retrieval, parsing, indexing) | **LlamaIndex** | The data stack is the value; the TypeScript port is archived. Strongest parsing is a paid hosted service. |
| Many cooperating roles by many authors on a platform | **CrewAI** | Convenient conventions, but the multi-agent layer added model calls in our test (2 became 3) and a plain Flow does the same job with fewer. |
| A Spring Boot 4 service | **Spring AI** | Reuses Spring's operations stack. Not an agent runtime; approval needs you to drive the tool-calling manager yourself. |
| JVM without Spring, or Quarkus or Helidon | **LangChain4j** | Declarative AI Services. Two version tracks (core stable, agentic and MCP modules beta); the agentic module is experimental. |
| Go | Write the loop on the official SDKs; **Eino** only for pipeline-style apps | Eino is 0.x. |
| Rust | Write the loop on `reqwest` and `rmcp`; **rig** as a prototyping tool or source of ideas | rig has shipped 16 minors in nine months and its README says releases break APIs. There is no official Anthropic Rust SDK. |
| Experimenting with code actions | **smolagents** | The local interpreter is not a security boundary (our test: an authorised `os` let `os.system` write a file; a 2 s timeout took 8 s). Use Docker or a hosted sandbox. |

## 2. The sixteen at a glance

Versions are the latest seen on 2026-11-19 from package registries. "Ran" means the profile's author installed it and ran the minimal agent against the stub; the four marked "read" could not be run because no JDK, Go or Rust toolchain was available.

| Framework | Language(s) | Version (date) | Licence | Evidence | One-line character |
|---|---|---|---|---|---|
| [LangChain](profiles/langchain.md) | Python, JS | 1.5.2 py; 1.6.7 js (2026-11-18) | MIT | Ran | Prebuilt agent loop over LangGraph, middleware, many providers |
| [LangGraph](profiles/langgraph.md) | Python, JS | 1.2.23 py; 1.7.5 js | MIT | Ran | State graph with checkpoints, interrupts, subgraphs |
| [OpenAI Agents SDK](profiles/openai-agents-sdk.md) | Python, TS | 0.25.0; 0.22.0 | MIT | Ran | Small loop: agents, tools, handoffs, sessions, tracing |
| [Claude Agent SDK](profiles/claude-agent-sdk.md) | Python, TS | 0.2.185; 0.3.328 | Proprietary binary inside | Ran | Controller for the bundled Claude Code engine |
| [Google ADK](profiles/google-adk.md) | Python, TS, Go, Java, Kotlin | 2.14.1; 2.5.0; v2.8.0; 1.15.0; 1.6.0 | Apache-2.0 | Ran (Python) | Agents, workflows, sessions, evals, dev UI |
| [Microsoft Agent Framework](profiles/microsoft-agent-framework.md) | .NET, Python | 1.28.0; 1.26.0 (GA 2026-04-03) | Not verified (repo unreachable) | Ran (Python) | Agents plus graph workflows with checkpoints |
| [PydanticAI](profiles/pydantic-ai.md) | Python | 2.71.0 | MIT | Ran | Typed agents, validation, durable-engine integrations |
| [smolagents](profiles/smolagents.md) | Python | 1.26.0 (2026-05-29) | Apache-2.0 | Ran | Code-writing agents, Hugging Face models; "experimental API" |
| [CrewAI](profiles/crewai.md) | Python (3.10-3.13) | 1.15.43 | MIT | Ran | Role-based crews and Flows |
| [LlamaIndex](profiles/llamaindex.md) | Python (TS archived) | core 0.14.26 | MIT | Ran | Data and retrieval stack with event-driven agent workflows |
| [Vercel AI SDK](profiles/vercel-ai-sdk.md) | TypeScript | 7.0.177 | Apache-2.0 | Ran | Provider layer, thin tool loop, UI streaming |
| [Mastra](profiles/mastra.md) | TypeScript | 1.85.0 | Apache-2.0 (except `ee/`) | Ran | Agents, memory, workflows, evals, server |
| [Spring AI](profiles/spring-ai.md) | Java | 2.0.2 (2026-10-23) | Apache-2.0 | Read | Chat, tools, memory, MCP for Spring Boot 4 |
| [LangChain4j](profiles/langchain4j.md) | Java | 1.24.0 (2026-11-18) | Apache-2.0 | Read | AI Services, tools, memory, MCP; beta agentic module |
| [Eino](profiles/eino-go.md) | Go | v0.9.23 (2026-11-09) | Apache-2.0 | Read | Graph and ReAct pipelines in Go |
| [rig](profiles/rig-rust.md) | Rust | 0.46.0 (2026-10-31) | MIT | Read | Provider trait, agents, vector stores, steppable run |

The Microsoft Agent Framework licence could not be verified because its repository returned 404 from the research machine; the profile says so.

## 3. What the frameworks give you, and what nobody does

Across the twelve runtime duties in the [languages treatise](../languages/README.md#2-what-a-runtime-layer-actually-does):

- **Everyone provides:** provider adapters and streaming assembly, schema generation from types or functions, and an MCP client.
- **Most provide, unevenly:** tracing (OpenTelemetry in several), a test double for the model (LangChain needs a subclass to work with `create_agent`; PydanticAI, Mastra and the OpenAI SDK ship usable mocks), and session memory.
- **Few provide durability.** What exists is mostly pause-and-resume at an approval, not step-level crash recovery. LangGraph checkpoints each step (node-level crash resume worked in our run; hard-kill behaviour was not tested). Mastra's workflows survived a process restart; its plain agents are not durable. PydanticAI integrates external engines. The OpenAI SDK serialises only at approval pauses. The AI SDK's durable story is a separate package we could not verify end to end.
- **Almost none provide a sandbox or a permission engine.** The exceptions prove the point: the Claude Agent SDK gets its permission system and tools by embedding Claude Code itself, and smolagents' *remote* executors (Docker, E2B, Modal) are the isolation option while its local interpreter is explicitly not a boundary. Everywhere else, permission gating, subprocess cancellation, context compaction and cost control are yours.

This lines up with the repository's evidence that the weight of a production harness is in exactly these surrounding systems ([Dive into Claude Code](../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md), [Harness Engineering](../../llm-learning-repository/tutorials/06-agent-systems/29-harness-engineering.md)): the frameworks help least where the harness is heaviest.

## 4. Churn is the cost nobody puts on the feature list

| Framework | What the profiles recorded |
|---|---|
| LangChain, LangGraph | Both went 1.0 on 2025-10-17; legacy chains and agent executors moved to a `langchain-classic` package; the old prebuilt agent constructor warns "removed in V2.0" |
| OpenAI Agents SDK | Pre-1.0: 14 of 22 minors list a breaking change; releases roughly monthly (Python) |
| Claude Agent SDK | Near-daily releases of both packages |
| PydanticAI | 2.0.0 on 2026-06-23 removed many V1 names and changed defaults; several minors a week; 358 releases |
| Mastra | 1.0.0 on 2026-01-20; a minor every three to four days since; durable agents beta with an explicit "breaking changes may occur without a major version bump" |
| Vercel AI SDK | Majors every few months (v5 July 2025, v6 December 2025, v7 June 2026); patch releases roughly daily |
| CrewAI | Patch releases roughly daily; the agent executor was replaced inside 1.15.x; Python 3.14+ unsupported |
| Google ADK | 2.0 GA 2026-05-19; the sequential-agent class already prints a deprecation warning |
| Microsoft Agent Framework | 1.0 GA 2026-04-03, but many satellite packages are still date-stamped betas |
| Spring AI | 1.x to 2.0 forced Spring Boot 4, Java 17 baseline and Jackson 3 |
| LangChain4j | Two version tracks: core stable, agentic, MCP, test and Spring starters at `-beta` |
| Eino | 0.x with 159 tags since 0.3.0, never 1.0 |
| rig | 16 minor versions since 0.30.0 (2026-02-03); README: "releases break APIs" |
| smolagents | The API reference calls it "an experimental API ... subject to change at any time"; 1.26 removed an executor |

**Implication.** Pin exact versions, keep the framework behind an interface you own (the [seams](../../architecture-evolution/language-and-framework-selection.md#8-reversibility-which-parts-are-cheap-to-change)), and put the review date on the calendar. A framework whose breaking changes arrive faster than your release cycle is a liability for a runtime others depend on.

## 5. Problems that recur across profiles

- **Hidden defaults.** Default tracing to the vendor (OpenAI SDK), model strings that route to a hosted gateway (Vercel AI SDK), hosted-by-default pieces (LlamaParse), a bundled settings load from the user's home directory (Claude Agent SDK unless disabled). Read the defaults before you ship.
- **Footprint.** Claude Agent SDK about 354 MB; Mastra about 191 MB and 144 packages; Microsoft Agent Framework about 198 packages; LangChain 67 distributions; the AI SDK about 47 MB. A local CLI or desktop app cares; a server does not.
- **Open and local models.** Tool-call formats, structured output and retries are where frameworks diverge most, and the stub cannot test it. Several profiles could not verify behaviour on a real small model. This is the gate to prove in your own [spike](../../architecture-evolution/language-and-framework-selection.md#61-the-spike), not to read from a feature list. Two concrete points: the OpenAI Agents SDK needs its chat-completions mode for OpenAI-compatible endpoints, and Microsoft Agent Framework's default OpenAI client calls the Responses API, so use its chat-completions client for Ollama or vLLM.
- **Stale facts in the wild.** Several widely repeated claims were wrong or outdated when checked: AutoGen is **archived** (its README says no fixes or support) while Semantic Kernel is not and still ships; Microsoft's 1.0 announcement lists the Anthropic connector as stable scope while the Anthropic and Claude connector packages are still date-stamped betas on the package index; LangChainGo's last two releases are a year apart; CrewAI's FAQ says it never depended on LangChain but its own PyPI metadata shows LangChain as a hard requirement in 0.11.2 and 0.30.0.

## 6. How to use this folder

1. Decide your deployment shape and gates with the [selection method](../../architecture-evolution/language-and-framework-selection.md).
2. Decide own-loop versus framework **before** language: a framework usually fixes the language.
3. Read the two or three relevant profiles' "What you still build yourself" and "Pitfalls" first.
4. Run the spike: implement the reference task against the stub for each candidate and for an owned loop. Record the measures in the selection method.
5. Write the decision record with the review date.

## 7. What was and was not verified

- **Twelve of sixteen** were installed and run against the stub (all Python and TypeScript frameworks). Each profile's final section lists what ran and what was only read.
- **Four** (Spring AI, LangChain4j, Eino, rig) were researched from official documentation, package registries and source clones. No code was compiled or run, and every snippet in those profiles says so.
- **Nobody tested real model behaviour.** The stub is scripted. No profile can tell you how a framework behaves with a small open model, Ollama, vLLM or a hosted model under load. That is your spike.
- **Facts from vendor pages and registries were read on 2026-11-19.** Download counts, star counts and pricing are indicative and mostly secondary.
- The writers were AI agents working from primary sources, with each claim labelled `ran`, `docs`, `source`, `secondary` or `unverified`. A human spot-check of the claims that drive your decision is worthwhile.
