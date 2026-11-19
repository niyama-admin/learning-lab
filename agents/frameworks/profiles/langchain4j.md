# LangChain4j

An open-source Java library that wraps LLM providers, tools, memory, retrieval, MCP and a young agent-workflow module behind one API, centred on declarative "AI Services" interfaces.

| Field | Value |
|---|---|
| Covers | LangChain4j 1.24.0 (core) and 1.24.0-beta34 (beta modules), as of 2026-11-19 |
| Language | Java 17+, with Quarkus, Spring Boot and Helidon integrations |
| Role in an agent runtime | Provider abstraction, tool loop, memory, MCP client, guardrails, listeners; an experimental agentic module for workflows |
| Profile status | Written without a Java toolchain. Nothing below was compiled or run |

> **Evidence warning, read first.** No Java toolchain is installed in this environment and none was installed, so **every code snippet in this profile is [docs] or [unverified]; none is [ran]**. Versions, dates and artifact names were checked against Maven Central metadata and the official docs on 2026-11-19. Snippets that I assembled from documented pieces are marked [unverified]. Compile before trusting them.

## 1. Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current release | **1.24.0**, GitHub release 2026-11-18. The release is titled "1.24.0 and 1.24.0-beta34" | [source] https://api.github.com/repos/langchain4j/langchain4j/releases |
| Two version tracks | Core and most provider modules at `1.24.0` (`langchain4j`, `langchain4j-core`, `langchain4j-open-ai`, `langchain4j-ollama`, `langchain4j-anthropic`, `langchain4j-bom`). Others still `1.24.0-beta34`: `langchain4j-agentic`, `langchain4j-agentic-a2a`, `langchain4j-mcp`, `langchain4j-test`, `langchain4j-observation`, `langchain4j-micrometer-metrics`, `langchain4j-reactor`, `langchain4j-open-ai-official`, and the Spring Boot starters. The docs say "many of the modules still have version `1.24.0-beta34`", so they may see breaking changes | [source] Maven Central `maven-metadata.xml` per artifact; [docs] https://docs.langchain4j.dev/get-started |
| 1.0 GA | `1.0.0` on Maven Central 2025-05-14 | [source] POM Last-Modified |
| Recent history | 1.20.0, 1.21.0, 1.22.0, 1.23.0 (2026-10-28), 1.24.0 (2026-11-18) all exist on Central; patch lines such as 1.19.6 (2026-11-17) continue in parallel | [source] metadata and GitHub releases |
| License | Apache-2.0 | [source] GitHub API |
| Maintainer | Community project under the `langchain4j` GitHub organisation, with contributors from several vendors (the release notes credit many authors); no single corporate owner confirmed | [source] GitHub release notes; ownership claim [unverified] |
| Repository, docs | https://github.com/langchain4j/langchain4j (about 13.4k stars at fetch time), https://docs.langchain4j.dev/ | [source] GitHub API |
| Java baseline | "The minimum supported JDK version is 17"; Spring Boot integration needs Java 17 and Spring Boot 3.5+ or 4.0+ | [docs] get-started, spring-boot-integration |
| Cadence | A minor release roughly every 3 weeks to a month (1.23.0 to 1.24.0 was 21 days) | [source] derived from the dates above |
| Breaking-change history | 1.0 GA in May 2025 after alpha, beta and rc builds (`1.0.0-alpha1`, `-beta1..3`, `-rc1` on Central). Inside the 1.x line, breaking changes are listed in release notes: 1.24.0 removed `OpenAiChatModelName` constants for models OpenAI shut down, changed Milvus filter semantics, and changed two beta agentic behaviours (async agents became fire-and-forget; evicting an agentic scope evicts agent chat memories). `AiServices.maxSequentialToolsInvocations` is deprecated in favour of `maxToolCallingRoundTrips` | [source] GitHub release notes for 1.24.0; Javadoc; Maven metadata. I did not read the 0.x to 1.0 migration notes |
| Status | Active (last push on the day of fetch). No successor | [source] GitHub API `pushed_at` 2026-11-19 |
| Integrations | 20+ LLM providers and 30+ embedding stores claimed by the README. Quarkus extension `io.quarkiverse.langchain4j:quarkus-langchain4j-core` at `2.0.0.Beta4` (2026-11-19); Spring Boot starters; Helidon is named by the docs | [docs] README, docs home; [source] Central for Quarkus. I did not read the Helidon integration |

## 2. What it is, in terms of the runtime loop

The central idea is the **AI Service**: you write a Java interface, optionally annotated with prompts, and `AiServices.builder(Assistant.class)` returns a proxy implementing it. The proxy assembles messages, calls the `ChatModel`, executes `@Tool` methods the model requests, applies memory and guardrails, and parses the output into the return type [docs https://docs.langchain4j.dev/tutorials/ai-services]. Under that sits a low-level API (`ChatModel`, `ChatRequest`, `ToolSpecification`, `ChatMessage`). Above it sits an experimental `langchain4j-agentic` module for agents composed into sequences, loops, parallel groups, conditionals and supervisors, sharing state in an `AgenticScope` [docs https://docs.langchain4j.dev/tutorials/agents]. The tool loop is internal to the proxy; you tune it (`maxToolCallingRoundTrips`, error handlers, callbacks) rather than write it.

| # | Duty | Status | API and notes |
|---|---|---|---|
| 1 | Stream from the model | **Provided** | `StreamingChatModel`; AI Service returning `TokenStream` with `onPartialResponse`, `onCompleteResponse`, `onError`, `.start()`; `Flux<String>` needs `langchain4j-reactor` [docs] |
| 2 | Loop as state machine | **Partly** | Internal loop in the AI Service proxy; limit via `maxToolCallingRoundTrips(int)` [source Javadoc]; callbacks `beforeToolExecution`, `afterToolExecution` [source Javadoc]. Not an inspectable state machine |
| 3 | Validate tool args, generate schemas | **Provided** | `@Tool` and `@P`; generates a `ToolSpecification`; `ToolArgumentsErrorHandler` decides whether argument errors go to the model or fail the call [docs] |
| 4 | Concurrent tools, cancellation, timeouts | **Partly** | `executeToolsConcurrently()` or `executeToolsConcurrently(executor)`; sequential by default [docs]. Streaming cancel via `context.streamingHandle().cancel()` [docs]. Tool-run cancellation and timeouts: not documented |
| 5 | Sandbox | **You build it** | Not provided; `langchain4j-mcp-docker` can run an MCP server in a Docker container [docs], which is a way to isolate a tool, not a runtime sandbox |
| 6 | Context assembly and compaction | **Partly** | `MessageWindowChatMemory`, `TokenWindowChatMemory` (needs `TokenCountEstimator`); RAG via `ContentRetriever` and `RetrievalAugmentor`. No summarisation [docs] |
| 7 | Session persistence | **Partly** | `ChatMemoryStore` interface (`getMessages`, `updateMessages`, `deleteMessages`); you implement it; JSON helpers `ChatMessageSerializer` and `ChatMessageDeserializer` [docs]. A release note mentions an Infinispan store [source] |
| 8 | Permissions and approval | **You build it** | No policy engine. Hooks: `beforeToolExecution`, `ToolProvider` (decides which tools are visible), input and output guardrails [Javadoc, docs]. Agentic module has a human-in-the-loop step that can suspend [docs] |
| 9 | Extension (MCP, plugins) | **Provided** | `langchain4j-mcp`: `McpClient`, `McpToolProvider`, resources and prompts [docs] |
| 10 | Observability | **Provided** | `ChatModelListener`; AI Service event listeners (experimental); `langchain4j-micrometer-metrics`; `langchain4j-observation` [docs] |
| 11 | Packaging | **Provided by host** | Plain JAR; Quarkus gives native image through its own extension [unverified for the native details] |
| 12 | Local models | **Provided** | `langchain4j-ollama`, OpenAI-compatible via `baseUrl` [docs] |

## 3. Implement it

### 3.1 Install and minimal agent

Maven (versions verified on Central; the BOM and `langchain4j-open-ai` and `langchain4j` are `1.24.0`):

```xml
<!-- [docs] https://docs.langchain4j.dev/get-started ; coordinates verified on Maven Central; NOT executed -->
<dependencyManagement><dependencies><dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j-bom</artifactId>
  <version>1.24.0</version>
  <type>pom</type><scope>import</scope>
</dependency></dependencies></dependencyManagement>
<dependencies>
  <dependency><groupId>dev.langchain4j</groupId><artifactId>langchain4j</artifactId></dependency>
  <dependency><groupId>dev.langchain4j</groupId><artifactId>langchain4j-open-ai</artifactId></dependency>
</dependencies>
```

(`langchain4j` is the module with `AiServices`; `langchain4j-open-ai` has `OpenAiChatModel` [docs get-started].) Whether the BOM manages the beta modules (`-agentic`, `-mcp`) at their beta numbers, or whether you must set them explicitly, I did not check.

Program, Java 17+. **[unverified]: assembled from docs snippets (ai-services, tools, openai pages); not compiled, not run.**

```java
// [unverified] Not compiled, not run.
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;

public class Demo {

    interface Assistant {
        String chat(String userMessage);
    }

    static class WeatherTools {
        @Tool(name = "get_weather", value = "Get the weather for a city")
        String getWeather(@P("City name") String city) {
            return "31 C and clear";
        }
    }

    public static void main(String[] args) {
        ChatModel model = OpenAiChatModel.builder()
            .baseUrl(System.getenv().getOrDefault("LLM_BASE_URL", "https://api.openai.com/v1"))
            .apiKey(System.getenv().getOrDefault("OPENAI_API_KEY", "dummy"))
            .modelName(System.getenv().getOrDefault("LLM_MODEL", "gpt-4o-mini"))
            .build();

        Assistant assistant = AiServices.builder(Assistant.class)
            .chatModel(model)
            .tools(new WeatherTools())
            .build();

        System.out.println(assistant.chat("What is the weather in Pune?"));
    }
}
```

The docs state that `@Tool` takes the description as its value and can also set `name`; `.tools(Object...)` registers tool objects; the framework executes tool requests automatically [docs tools page]. `OpenAiChatModel` uses the Chat Completions API; the Responses API variants are marked experimental [docs openai page].

### 3.2 Run it against the stub

**Not run**: no JDK or Maven here, and I was told not to install system software. The snippet is therefore **[unverified]**.

How a developer would do it: start `node server.mjs 8099 &`, then run with `LLM_BASE_URL=http://127.0.0.1:8099/v1 OPENAI_API_KEY=dummy LLM_MODEL=stub`. `baseUrl` is a documented builder option (the docs show it for DeepSeek at `https://api.deepseek.com/v1`, so `/v1` is included in the URL) [docs]. Expected, not observed: two requests in `GET /_log` (first with tools, second with the tool result), and the printed answer "It is 31 C and clear in Pune." Things to check if it fails: whether the stub accepts the model name, and whether the OpenAI client sends extra fields.

### 3.3 The nine capabilities

(a) **Streaming.** Give the model `OpenAiStreamingChatModel` and declare the service method as `TokenStream chat(String msg)`:
```java
// [docs] ai-services page; not run
tokenStream.onPartialResponse(System.out::print)
           .onCompleteResponse(r -> done.complete(r))
           .onError(done::completeExceptionally)
           .start();
```
`Flux<String>` requires `langchain4j-reactor`. Tool executions during streaming surface as `onToolExecuted` [docs]. Cancel with `context.streamingHandle().cancel()` inside `onPartialResponseWithContext` [docs].

(b) **Memory across turns.** One shared memory: `.chatMemory(MessageWindowChatMemory.withMaxMessages(10))`. Per user or session: `.chatMemoryProvider(id -> MessageWindowChatMemory.withMaxMessages(10))` plus a `@MemoryId` parameter on the service method; without it, the id is `"default"` [docs]. The docs warn against concurrent calls with the same memory id [docs].

(c) **Durable state.** Two levels. Conversation: implement `ChatMemoryStore` and attach it (`.chatMemoryStore(...)` on the memory builder) so messages survive a restart [docs]. Workflow: the agentic module has a persistent `AgenticScope` saved at the end of the root call and reusable under the same memory id, and a human-in-the-loop step can return a `SuspendedResponse`, with the root agent re-invoked to resume [docs, partial read: the agents page text I read was truncated at 100k of 189k characters]. 1.24.0 release notes add "support suspensions in AgentMonitor" [source]. Mid-call crash recovery of a plain AI Service tool loop: not provided; the loop is in-process.

(d) **Human approval before a tool.** No built-in prompt in AI Services. Hooks: `beforeToolExecution(Consumer<BeforeToolExecution>)` on the builder [source Javadoc, `AiServices` API page]. Whether that callback can veto a call (for example by throwing) I did not verify. Other options: a custom `ToolProvider` that hides dangerous tools until the user opts in [docs]; or a `ToolExecutor` that blocks on your approval service [unverified]; or agentic human-in-the-loop, which suspends the workflow [docs, partial]. For a request-response approval flow I would use the suspend path or build the tool wrapper.

(e) **Second tool and parallel tool calls.** Add more `@Tool` methods or objects. `.executeToolsConcurrently()` or `.executeToolsConcurrently(executor)` runs multiple tool calls from one model response concurrently; by default they run sequentially, and a single call runs on the caller's thread [docs tools page]. Pass a single-threaded executor to serialise [docs non-blocking page].

(f) **MCP client.**
```java
// [docs] https://docs.langchain4j.dev/tutorials/mcp ; not run
McpTransport transport = StdioMcpTransport.builder().command(List.of("npx","-y","@modelcontextprotocol/server-everything")).build();
McpClient mcp = DefaultMcpClient.builder().key("MyMCPClient").transport(transport).build();
ToolProvider tp = McpToolProvider.builder().mcpClients(mcp).build();
Assistant a = AiServices.builder(Assistant.class).chatModel(model).toolProvider(tp).build();
```
Transports: stdio, Streamable HTTP, a non-standard WebSocket (only guaranteed with the Quarkus MCP Server extension), Docker stdio. No separate SSE transport: Streamable HTTP can open an SSE side channel with `.subsidiaryChannel(true)`. Tool filter: `.filterToolNames(...)`. Resources and prompts are supported; sampling, elicitation and roots are not mentioned on the page. The docs name MCP protocol versions `2025-11-25` (legacy) and `2026-07-28` (modern stateless), and say the client auto-detects, preferring `2026-07-28` [docs]. The artifact `langchain4j-mcp` is still beta (`1.24.0-beta34`) [source].

(g) **Structured output.** Return a Java type (POJO, enum, boolean, `List`) from the service method. For reliability enable JSON Schema on the model: `OpenAiChatModel.builder()...supportedCapabilities(RESPONSE_FORMAT_JSON_SCHEMA).strictJsonSchema(true)`; Ollama: `.supportedCapabilities(RESPONSE_FORMAT_JSON_SCHEMA)`. When the model, setting or type does not support it, AI Services falls back to prompting; fields are optional unless marked `@JsonProperty(required = true)`; streaming is not supported with JSON Schema output. Supported providers named: Bedrock, Azure OpenAI, Google AI Gemini, Mistral, Ollama, OpenAI [docs structured-outputs]. What happens on a parse failure is not documented there.

(h) **Tracing and observability.** `ChatModelListener` with `onRequest`, `onResponse`, `onError`, registered on the model builder with `.listeners(...)`; per-call metadata via `ChatRequestOptions.builder().addListenerAttribute(...)` [docs]. AI Service level events (`AiServiceStartedEvent`, `ToolExecutedEvent`, guardrail events and others) registered with `.registerListener(...)`; the docs mark them experimental [docs]. Metrics: `langchain4j-micrometer-metrics` (`MicrometerMetricsChatModelListener`, records `gen_ai.client.token.usage` and `gen_ai.client.operation.duration`, OpenTelemetry GenAI conventions v1.39.0); traces: `langchain4j-observation` (`ObservationChatModelListener`) [docs]. Listener callbacks must not block [docs].

(i) **Test without a real model.** The `langchain4j-test` artifact (`1.24.0-beta34`) contains `dev.langchain4j.test.mock.MockChatModel`, `MockStreamingChatModel`, `MockEmbeddingModel`, `MockScoringModel`, `MockModerationModel`, `ScriptedResponses`, `Script` and `RecordedRequests` (class names read from the jar listing; I did not read their APIs) [source]. The 1.24.0 release notes credit "public model mocks in langchain4j-test" and "capture what AI Services do in a test" [source]. The tutorial page for testing 404s, and the AI Services page says you can mock an AI Service (it is an interface) and integration-test each in isolation [docs]. Alternative: run the stub server and point `baseUrl` at it.

## 4. Models and local models

- **Providers.** README claims 20+ LLM providers and 30+ embedding stores [docs]. One module per provider, versioned independently of the core in practice: `langchain4j-open-ai`, `-ollama`, `-anthropic` at `1.24.0`; `langchain4j-open-ai-official` (a module built on the official OpenAI Java SDK) at beta [source]. I did not rank providers by quality; OpenAI, Azure OpenAI, Ollama, Gemini, Bedrock and Mistral are the ones the structured-output page names as supporting JSON Schema [docs].
- **OpenAI-compatible endpoints.** `OpenAiChatModel.builder().baseUrl(...)`; a separate docs page "OpenAI-Compatible Language Models" exists and I did not read it [docs]. Extras on the OpenAI model: `strictTools(true)` (makes all tool parameters required and sets `additionalProperties=false`), `returnThinking(true)` for DeepSeek `reasoning_content`, `logRequests(true)` [docs].
- **Ollama native.** `dev.langchain4j:langchain4j-ollama:1.24.0`, `OllamaChatModel.builder().baseUrl("http://localhost:11434").modelName("llama3.1")`; options include `numCtx`, `think`, `returnThinking`, `responseFormat` [docs ollama page]. That page does not mention tool calling or give small-model guidance [docs].
- **Small and open model problems.** Not documented in the pages I read. Structured output via JSON Schema depends on the provider (Ollama listed as supported); prompt-based fallback is described as unreliable ("This approach is quite unreliable") [docs]. Guardrails with `reprompt` and `retry` (default `maxRetries` 2, counting the first response) can recover from bad output [docs].

## 5. State, durability and concurrency

- **Where state lives.** Chat memory is a list of `ChatMessage` in a `ChatMemory`, keyed by memory id, optionally backed by your `ChatMemoryStore`. In-memory by default. Eviction of an `AiMessage` with tool requests also evicts its orphan tool results, to avoid provider errors [docs]. Agentic: an `AgenticScope` holds shared agent state and the invocation sequence; it can be ephemeral or persistent [docs].
- **What survives a crash.** Only what your `ChatMemoryStore` (and persistent scope store) wrote. A 1.24.0 release note warns that evicting an agentic scope also evicts agent chat memories unless they have a `ChatMemoryStore` [source].
- **Threading and async.** The AI Service call is blocking by default. On Java 21+ the default executor is a virtual-thread-per-task executor; on Java 17 to 20 it is an unbounded platform-thread pool, and the docs recommend supplying a bounded `Executor` if that matters [docs https://docs.langchain4j.dev/tutorials/non-blocking/]. A blocking tool "parks" a virtual thread, which unmounts from its carrier [docs]. In the async and reactive modes tools run on the executor and so can run concurrently; a hand-written `ToolExecutor` that does not override `executeAsync` fails with `AsyncNotSupportedException` rather than blocking silently [docs]. `CompletableFuture`, `CompletionStage` and `Flow.Publisher` return types are marked experimental [docs]. Spring integration: `langchain4j.executor.use-spring-task-executor=true` routes offloaded work through Spring's executor so tracing, MDC and security context propagate [docs]. The Spring Boot page itself does not mention virtual threads [docs].

- **Cancellation.** Streaming: `StreamingHandle.cancel()`. An `AiServiceCancelledEvent` exists [docs]. Cancelling a running tool is not documented.

## 6. What you still build yourself

| Need | What LangChain4j gives | What you build |
|---|---|---|
| Permissions | Tool visibility (`ToolProvider`), `beforeToolExecution` callback, guardrails | Policy engine, deny and ask flow, audit |
| Sandboxing | Docker-hosted MCP servers | Command and file isolation |
| Compaction | Message and token windows | Summarisation and token-aware trimming |
| Cost control | Token usage on `Result<T>` and metrics; round-trip cap `maxToolCallingRoundTrips` | Budgets and stop reasons |
| Durable loop | `ChatMemoryStore`, agentic persistent scope (beta) | Step journal, idempotent tools, resume |
| Evaluation | Mock models in `langchain4j-test` (beta) | Scenarios and invariants (the eight in the languages treatise) |
| Multi-agent | `langchain4j-agentic` workflows, supervisor, A2A client agents, all explicitly experimental [docs] | Anything production-hardened |

The agentic page's own warning: "the whole module has to be considered experimental and is subject to change in future releases" [docs]. Workflow builders: `sequenceBuilder()`, `loopBuilder()` (with `maxIterations` and `exitCondition`), `parallelBuilder()`, `parallelMapperBuilder()`, `conditionalBuilder()`; agents declared with `@Agent(outputKey=..., description=...)`; observability via `AgentListener` and `AgentMonitor` with an HTML report [docs, partial read]. A "Decision Scheduler" pattern was added in 1.24.0 [source release notes].

## 7. Lock-in and escape hatches

- Your code carries LangChain4j annotations (`@Tool`, `@P`, `@SystemMessage`, `@UserMessage`, `@MemoryId`) and builder types, and the AI Service proxy hides the loop. Replacing it means rewriting the loop, schema generation and memory; for a minimal tool agent that is about 100 to 200 lines plus HTTP and JSON Schema code [unverified estimate].
- Escape hatches: the low-level `ChatModel.chat(ChatRequest)` with `ToolSpecification` and `ToolExecutionRequest` lets you run your own loop; the docs show executing the tool yourself and replying with `ToolExecutionResultMessage` [docs]. `AiServices` is optional.
- Independence from Spring: the library works without any container; Quarkus and Spring are add-ons [docs]. That is a difference from Spring AI, which assumes Spring.
- Migration stories: none verified.

## 8. Pitfalls

1. **Mixed version numbers.** Core `1.24.0`, many modules `1.24.0-beta34`; the docs warn the beta ones may break [docs]. Pin each coordinate; `maxSequentialToolsInvocations` is already deprecated [Javadoc].
2. **Agentic module is experimental** and its beta releases changed behaviour (async agents fire-and-forget, scope eviction) [source release notes].
3. **Tool-name hallucination throws by default.** Unknown tool names raise an exception unless you set `hallucinatedToolNameStrategy` [docs]. `ToolArgumentsErrorHandler.sendExceptionMessageToLlm()` sends exception messages to the model, which the docs warn may expose sensitive data [docs].
4. **JSON Schema output is off by default** for AI Services; without `supportedCapabilities(...)` you get prompt-based parsing [docs].
5. **Silent concurrency semantics.** Tools are sequential unless you enable concurrency; with concurrency, your tools must be thread-safe and concurrent calls with the same memory id are discouraged [docs].
6. **Java 17 vs 21 behaviour.** The default async executor differs by JVM version [docs].
7. **Docs gaps.** The testing tutorial URL returns 404; `maxToolCallingRoundTrips` and `beforeToolExecution` appear only in Javadoc, not in the tutorials I read; the Ollama page is silent on tool calling and small models [docs, source].
8. **Fast release rate.** A release roughly every three weeks, with removal of provider model constants in minor releases (1.24.0) [source].
9. **Immediate return bypasses guardrails.** `ReturnBehavior.IMMEDIATE` skips output guardrails and needs a `Result<T>` return type [docs].

## 9. Choose it when / avoid it when

**Choose LangChain4j when**
- You are on the JVM but not committed to Spring, or you use Quarkus or Helidon.
- You want declarative service interfaces, typed returns, guardrails and an MCP client with little code, and your agent loop is internal to one request.
- You want mock models for tests and can accept beta test artifacts.

**Avoid it when**
- You must have a durable, resumable, inspectable loop: you will build it around the proxy, and the agentic module that comes closest is marked experimental.
- You need the most conservative API stability: two version tracks and weekly-to-monthly releases are the opposite.
- You need MCP features beyond tools, resources and prompts: sampling, elicitation and roots are not mentioned in the docs I read [docs].

**Versus writing the loop yourself** (roughly 100 lines, languages treatise section 8): the library buys schema generation, provider clients, streaming assembly, memory eviction that keeps tool messages consistent, guardrails with retry, MCP transports and listeners. It costs a proxy-based loop you cannot step through, the beta-module churn, and framework-shaped state. Of the eight reference invariants, concurrent tools with a caller-chosen executor and error-to-model handling exist; permission denial results, cancellation of tool runs, log replay and a budget stop are yours.

## 10. What was verified

| Item | How | Result |
|---|---|---|
| Versions and dates | Maven Central metadata for 15 `dev.langchain4j` artifacts; GitHub releases API | 1.24.0 on 2026-11-18; beta modules `1.24.0-beta34`; 1.0.0 on 2025-05-14 |
| Docs pages read | docs home; get-started; ai-services; tools; agents (first 100k of 189k chars); mcp; chat-memory; structured-outputs; guardrails; observability; non-blocking; spring-boot-integration; openai and ollama integration pages; `AiServices` Javadoc | Labelled in text |
| Jar inspection | Listed classes in `langchain4j-test-1.24.0-beta34.jar` | Mock class names only |
| Not read | Quarkus and Helidon integration pages, RAG and embedding-store pages, OpenAI-compatible page, remaining half of the agents page, the 0.x to 1.0 migration | Not checked |
| Java compile and run | Impossible without a JDK | **Nothing executed. All code is [docs] or [unverified]** |
| Stub server | Not started | Instructions in 3.2 are untested expectations |

## Secondary notes (labelled secondary, outside the required sections)

**Java MCP SDK.** Verified: https://modelcontextprotocol.io/docs/sdk.md lists Java (`modelcontextprotocol/java-sdk`) as **Tier 2**; TypeScript, Python, C#, Go, Rust and Ruby are Tier 1; Swift, PHP and Kotlin are Tier 3 [docs]. Central shows `io.modelcontextprotocol.sdk:mcp` with 2.2.0 as release (last-modified 2026-11-13) [source]. The page also says SDKs adopt new protocol revisions on their own schedules [docs]. Spring AI builds its MCP support on this SDK [docs, see the Spring AI profile]; LangChain4j ships its own `langchain4j-mcp` client [source], so its MCP coverage tracks its own roadmap.

**Google ADK for Java.** `com.google.adk:google-adk`, latest on Central 1.15.0 (last-modified 2026-11-18); the getting-started page still shows 1.14.0, requires Java 17+ and Maven 3.9+, builds agents with `LlmAgent.builder()` and `FunctionTool.create`, runs them with `InMemoryRunner` and returns an RxJava `Flowable<Event>`; examples are Gemini-first and the page does not label the Java SDK's stability [source] [docs https://adk.dev/get-started/java/]. It is an agent framework (agents, sessions, runners) rather than a model library. Not evaluated further.
