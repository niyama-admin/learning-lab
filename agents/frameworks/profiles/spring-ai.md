# Spring AI

A Spring-idiomatic library for calling language models, tools, vector stores and MCP servers from Spring Boot applications on the JVM. It is a model-and-tool integration layer with an advisor pipeline, not an agent runtime.

| Field | Value |
|---|---|
| Covers | Spring AI 2.0.2 (current stable) and 2.1.0-RC2 (preview), as of 2026-11-19 |
| Language | Java (Kotlin works through Spring) |
| Role in an agent runtime | Provider abstraction, tool-calling loop, memory, MCP, observability. No durable workflow engine |
| Profile status | Written without a Java toolchain. Nothing below was compiled or run |

> **Evidence warning, read first.** No Java toolchain is installed in this environment and none was installed, so **every code snippet in this profile is [docs] or [unverified]**. None is [ran]. Versions, dates and artifact coordinates were checked against Maven Central metadata and the official docs on 2026-11-19. Where a snippet is my assembly of documented pieces it is marked [unverified]. Compile it before trusting it. The stub-server section says exactly what could not be run.

## 1. Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current stable | **2.0.2**, published 2026-10-23 (GitHub release `v2.0.2`; Maven Central last-modified 2026-10-22) | [source] https://api.github.com/repos/spring-projects/spring-ai/releases, https://repo1.maven.org/maven2/org/springframework/ai/spring-ai-bom/maven-metadata.xml |
| Preview | 2.1.0-RC2, 2026-11-05 (also 2.1.0-RC1 2026-10-23, 2.1.0-M1 2026-09-25) | [source] same |
| 2.0 line | 2.0.0 GA 2026-06-12, 2.0.1 2026-08-21, 2.0.2 2026-10-23. Preceded by M1 to M8 and RC1, RC2; 2.0.0-M1 is dated 2025-12-11 on Maven Central | [source] GitHub releases, Maven Central |
| 1.x line still maintained | 1.1.8 (Maven Central 2026-06-12); the docs version selector also lists 1.0.9 as stable | [source] [docs] https://docs.spring.io/spring-ai/reference/getting-started.html |
| 1.0 GA | 1.0.0 on Maven Central 2025-05-19; 1.1.0 2025-11-12 | [source] Maven Central last-modified headers |
| Spring Boot requirement | **2.0.x supports Spring Boot 4.0.x and 4.1.x.** The repository README maps "Spring AI 2.x.x (main branch)" to Spring Boot 4.x and "Spring AI 1.1.x" to Spring Boot 3.5.x. So the reports that 2.0 needs Boot 4 are **correct** | [docs] getting-started page; [docs] https://raw.githubusercontent.com/spring-projects/spring-ai/main/README.md |
| Java baseline | Java 17 bytecode: the `spring-ai-model-2.0.2.jar` manifest says `Build-Jdk-Spec: 17` and `ChatModel.class` has class-file major version 61 (Java 17). The getting-started page states no baseline | [source] downloaded jar from Maven Central and inspected it |
| License | Apache-2.0 | [source] GitHub API `license.spdx_id` |
| Maintainer | The Spring team, `spring-projects` GitHub organisation; community add-ons in `spring-ai-community` | [docs] README |
| Repository, docs | https://github.com/spring-projects/spring-ai , https://docs.spring.io/spring-ai/reference/ | [source] GitHub API |
| Breaking-change history | 1.x to 2.0: Boot 4 and Jackson 3 baseline, `FunctionCallback` to `ToolCallback`, internal tool loop removed from `ChatModel`, `PromptChatMemoryAdvisor` removed, conversation id mandatory, MCP annotations and transports moved into Spring AI (details in section 8) | [docs] https://docs.spring.io/spring-ai/reference/upgrade-notes.html |
| Cadence and status | Minor releases about every 6 months (1.0 May 2025, 1.1 Nov 2025, 2.0 Jun 2026), patches every 2 to 3 months. Active, not deprecated. 1.1.x maintained on Boot 3.5 for people who cannot move | [docs] [source] |

## 2. What it is, in terms of the runtime loop

Spring AI gives you a fluent `ChatClient` that sends a prompt through an ordered chain of **advisors** (interceptors) to a provider-specific `ChatModel`. Tools are plain Java methods annotated `@Tool`; a `ToolCallingAdvisor`, which `ChatClient` now always registers, runs the model-tool-model loop for you [docs]. Memory, retrieval (RAG), structured output and logging are all advisors or output converters. The docs say the agent patterns (chain, parallelisation, routing, orchestrator-workers, evaluator-optimizer) are things you build on top with ordinary Java and `ChatClient`; the example classes live in a separate repository, and the page "Building Effective Agents" does not claim Spring AI is an agent framework [docs https://docs.spring.io/spring-ai/reference/api/effective-agents.html]. In runtime terms: it is a good "model client plus tool loop plus memory plus MCP plus telemetry" and nothing more.

| # | Duty | Status | API and notes |
|---|---|---|---|
| 1 | Stream from the model | **Provided** | `chatClient.prompt()...stream().content()` returns `Flux<String>` (Reactor); also `Flux<ChatResponse>`. Streaming wants the reactive web stack [docs]. No convenience `entity()` on streams [docs] |
| 2 | Loop as state machine | **Partly** | `ToolCallingAdvisor` (auto-registered) loops until no tool calls. It is not an inspectable state machine; you can swap in your own loop using `ToolCallingManager.executeToolCalls` [docs] |
| 3 | Validate tool args, generate schemas | **Provided** | `@Tool`/`@ToolParam` methods get JSON Schema generated from the signature (`jsonschema-generator` dependency [source]). Server-side validation of MCP tool inputs is on by default in 2.0 [docs] |
| 4 | Concurrent tools, cancellation, timeouts | **Partly / not documented** | `ToolCallingManager` is stateless and safe to share across requests; per-tool and total call limits exist (`maxCallsPerTool`, `maxTotalToolCalls`). The tools page does not say whether the calls in one batch run in parallel. Cancellation: via Reactor subscription for streams only; not documented for tool runs [docs] |
| 5 | Sandboxed execution | **You build it** | Nothing provided |
| 6 | Context assembly and compaction | **Partly** | Prompt templates, `defaultSystem`, RAG advisors. `MessageWindowChatMemory` evicts by count (default 20 messages); no summarisation documented [docs] |
| 7 | Session persistence | **Partly** | `ChatMemoryRepository`: in-memory, JDBC, Cassandra, Neo4j, MongoDB, Redis (Cosmos external) [docs]. Intermediate tool-call messages are not stored by ChatClient flows, and the JDBC, Cassandra and Mongo repositories filter tool messages out [docs]. No fork, no replay |
| 8 | Permissions, approval | **You build it** | Not provided. Documented hook: disable auto tool execution and drive the loop yourself [docs]. MCP elicitation annotation exists for MCP clients |
| 9 | Extension (MCP, plugins, hooks) | **Provided (MCP), partly (hooks)** | MCP client and server starters; advisors are the hook system; `ToolCallbackProvider` for dynamic tools |
| 10 | Observability | **Provided** | Micrometer observations: `spring.ai.chat.client`, `spring.ai.advisor`, `gen_ai.client.operation`, `spring.ai.tool`; token metric `gen_ai.client.token.usage` [docs] |
| 11 | Packaging | **Provided by Spring** | Fat JAR; GraalVM native with caveats for `@Tool` classes [docs] |
| 12 | Local-model integration | **Provided** | Ollama starter; OpenAI starter with `base-url` for vLLM and similar [docs] |

## 3. Implement it

### 3.1 Install and minimal agent

Maven BOM (version verified on Central; `2.0.2` is the latest stable; the docs page example still shows `2.0.0`):

```xml
<!-- Maven, [docs] https://docs.spring.io/spring-ai/reference/getting-started.html, version bumped to 2.0.2 by me. NOT executed. -->
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.1.2</version>
</parent>
<dependencyManagement><dependencies><dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-bom</artifactId>
  <version>2.0.2</version>
  <type>pom</type><scope>import</scope>
</dependency></dependencies></dependencyManagement>
<dependencies><dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency></dependencies>
```

`org.springframework.ai:spring-ai-starter-model-openai` is verified on Central at 2.1.0-RC2 and listed in the docs [source] [docs]. Boot `4.1.2` exists on Central; the docs say 2.0.x supports 4.0.x and 4.1.x [source] [docs].

`src/main/resources/application.properties`, pointed at the OpenAI-compatible stub (section 3.2 explains why `/v1` is in the URL):

```properties
# [unverified] property names from the docs; values are mine
spring.ai.openai.api-key=dummy
spring.ai.openai.base-url=http://127.0.0.1:8099/v1
spring.ai.openai.chat.model=stub
```

Program, Java 17+, Boot 4 (imports from the docs' package names; **[unverified], not compiled**):

```java
// [unverified] assembled from docs snippets (chatclient.html, tools.html). Not compiled, not run.
package demo;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class Demo {

    static class WeatherTools {
        @Tool(name = "get_weather", description = "Get the weather for a city")
        public String getWeather(@ToolParam(description = "City name") String city) {
            return "31 C and clear";
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(Demo.class, args);
    }

    @Bean
    CommandLineRunner run(ChatClient.Builder builder) {
        return args -> {
            ChatClient chat = builder.build();
            String answer = chat.prompt()
                .user("What is the weather in Pune?")
                .tools(new WeatherTools())      // ToolCallingAdvisor is auto-registered in 2.0
                .call()
                .content();
            System.out.println(answer);
        };
    }
}
```

That is the whole agent: no loop code, because `.call()` runs the tool loop [docs].

### 3.2 Run it against the stub

Not run. Reasons: no JDK or Maven on this machine, and I was told not to install system software. The snippet above is therefore **[unverified]**.

How a developer would point it at the stub (`node server.mjs 8099 &`):
- The stub speaks OpenAI Chat Completions at `http://127.0.0.1:<port>/v1`.
- Spring AI 2.0 uses the official `openai-java` SDK for all OpenAI models [docs https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html]. In the source of `OpenAiSetup`, the default base URL constant is `https://api.openai.com/v1` [source: `spring-ai-openai-2.0.2-sources.jar`], so a custom base URL very likely needs the `/v1` suffix too. The docs' own vLLM example omits `/v1` and the Docker Model Runner example includes it, so this is a [source]-based inference, not a tested fact. `OPENAI_BASE_URL` is also read from the environment when no base URL is set [source].
- Expected, not observed: first request returns a `get_weather` call, Spring AI runs the tool, the second request carries the result and the stub answers "It is 31 C and clear in Pune."; `GET /_log` should show two requests. Check that the stub accepts the model name and any extra fields the OpenAI SDK sends.

### 3.3 The nine capabilities

(a) **Streaming output.** `Flux<String> out = chatClient.prompt().user(q).stream().content();` [docs chatclient.html]. Needs the reactive stack (`spring-boot-starter-webflux`); the docs state non-streaming wants the servlet stack. A known telemetry limit: OpenAI streaming HTTP spans are not parented under the chat-model span because the SDK's async path hops to `ForkJoinPool.commonPool()` [docs observability].

(b) **Memory across turns.** Add an advisor and a conversation id; the id is mandatory in 2.0:
```java
// [docs] chat-memory.html / chatclient.html; not run
chatClient.prompt().user(text)
    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
    .call().content();
// builder side: .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
```
`MessageWindowChatMemory` keeps the last 20 messages by default and always keeps the system message [docs]. Without the id you get `IllegalArgumentException` [docs].

(c) **Durable state: pause, resume, crash restart.** **Not provided.** The only persistence is the chat-memory repository (JDBC and others), which stores conversation messages, not loop state, and for JDBC, Cassandra and Mongo drops tool-call messages [docs]. If the process dies mid-tool-loop, you restart from the last user turn. What I would build: persist each loop step (assistant message with tool calls, each tool result) in your own table and drive the loop yourself with `ToolCallingManager` (see (d)), or put the whole call inside a durable workflow engine.

(d) **Human approval before a tool runs.** No built-in approval. Documented route: switch off auto-registration and run the loop yourself, so you can interpose between model response and execution:
```java
// [docs] tools.html "user-controlled tool execution"; abridged by me; not run
chatClient.prompt().user(q).options(chatOptions)
    .advisors(AdvisorParams.toolCallingAdvisorAutoRegister(false))
    .call().chatClientResponse();
// while (response.chatResponse().hasToolCalls()) {
//     /* ask the human here */
//     ToolExecutionResult r = toolCallingManager.executeToolCalls(prompt, response.chatResponse());
//     ... re-call with r.conversationHistory() ... }
```
The docs warn this "bypasses observability, advisor composition, and the single-ToolAdvisor invariant" [docs]. 

(e) **Second tool and parallel calls.** Add another `@Tool` method or object to `.tools(...)`; per-call `.tools(...)` appends to defaults, and duplicate names throw `IllegalStateException` [docs]. Whether several calls in one model response run in parallel is **not documented** [docs]; test it. Safety limits exist: `ToolCallingManager.builder().maxCallsPerTool(40).maxTotalToolCalls(150).onLimitExceeded(RETURN_ERROR_RESPONSE)` and are on by default [docs].

(f) **MCP client.** Add `org.springframework.ai:spring-ai-starter-mcp-client` (STDIO, servlet streamable-HTTP, stateless streamable-HTTP, SSE) or `...-client-webflux`; configure connections under `spring.ai.mcp.client.stdio.connections.*` or `spring.ai.mcp.client.streamable-http.connections.*`; give the tools to the client with `builder.defaultToolCallbacks(syncMcpToolCallbackProvider)` [docs https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html; the ChatClient line is the page's own "standard API" suggestion, not a tested example]. `McpToolFilter` bean filters tools; duplicate tool names across servers get a generated prefix such as `alt_1_search` [docs]. Server side: `@McpTool`, `@McpResource`, `@McpPrompt` with `spring-ai-starter-mcp-server*` [docs].

(g) **Structured output.** `chatClient.prompt().user(q).call().entity(ActorFilms.class)` with a Java record [docs]. Reliability switches: `.entity(Type.class, spec -> spec.useProviderStructuredOutput().validateSchema())`. `validateSchema()` validates the JSON and retries with error feedback; `useProviderStructuredOutput()` sends the schema as an API-level constraint, and is silently ignored if the model's options do not implement `StructuredOutputChatOptions` [docs https://docs.spring.io/spring-ai/reference/api/structured-output/native.html]. Documented limits: `$ref`, `allOf/anyOf/oneOf` and recursive types often fail; OpenAI rejects top-level arrays [docs].

(h) **Tracing and observability.** Add Actuator and a Micrometer tracing bridge. Observation names: `spring.ai.chat.client`, `spring.ai.advisor`, `gen_ai.client.operation`, `spring.ai.tool`, `db.vector.client.operation`; metric `gen_ai.client.token.usage` with `input|output|total` [docs https://docs.spring.io/spring-ai/reference/observability/index.html]. Prompt and completion logging is off by default: `spring.ai.chat.observations.log-prompt=true`, `...log-completion=true`, `spring.ai.tools.observations.include-content=true` [docs]. Observability applies only to the autoconfigured `ChatClient.Builder`; `ChatClient.create(model)` bypasses it [docs]. The ChatClient page also says that because tool calling is blocking, the ChatClient and tool-calling spans are not connected [docs].

(i) **Test without a real model.** The Spring AI testing page covers only LLM-based evaluators (`RelevancyEvaluator`, `FactCheckingEvaluator`), which need a live model [docs https://docs.spring.io/spring-ai/reference/api/testing.html]. I found no scripted fake model in the docs. Options: (1) run a stub OpenAI-compatible server like the one in this repository and point `base-url` at it; (2) implement or mock the `ChatModel` interface with Mockito and construct `ChatClient.create(mock)` [unverified; the interface exists, but I did not confirm that mocking leaves the tool loop testable].

## 4. Models and local models

- **Providers.** Starters named `spring-ai-starter-model-<provider>`; the README lists Anthropic, OpenAI, Bedrock, Google, Ollama, Mistral, DeepSeek and more [docs]. In 2.0, OpenAI uses the official `openai-java` SDK and Anthropic `com.anthropic:anthropic-java`; some modules (`spring-ai-azure-openai`, OCI GenAI) were removed or moved [docs].
- **OpenAI-compatible endpoint.** `spring.ai.openai.base-url` or `spring.ai.openai.chat.base-url`; the page shows vLLM and Docker Model Runner. Server-specific fields go in `spring.ai.openai.chat.extra-body.<key>` (real OpenAI returns 400 on unknown fields) [docs]. llama.cpp is not mentioned there; I did not verify it.
- **Ollama native.** `spring-ai-starter-model-ollama`, `spring.ai.ollama.base-url` (default `http://localhost:11434`). Tool calling needs Ollama 0.2.8+, and 0.4.6+ to stream with tools; structured output via `format` or `outputSchema` [docs ollama-chat.html].
- **Small or open model problems, documented.** Native structured output for Ollama "is model-specific", and a reasoning model such as `qwen3:8b` may emit reasoning text that breaks JSON parsing (`Unrecognized token 'The'`) [docs native.html]. Both Ollama and OpenAI pages say nothing about small-model tool-call reliability [docs]. Retries: the OpenAI client has `spring.ai.openai.max-retries` (default 3) and `timeout` 60 s [docs], which are silent unless you log them. The `validateSchema()` retry loop exists for malformed JSON [docs].
## 5. State, durability and concurrency

- **Where state lives.** The conversation is a list of `Message` objects. Your options are a `ChatMemory` bean (window policy) over a `ChatMemoryRepository` (storage). Default storage is an in-process `ConcurrentHashMap`, lost on restart [docs]. Persistent stores: JDBC (PostgreSQL, MySQL/MariaDB, SQL Server, HSQLDB, Oracle), Cassandra, Neo4j, MongoDB, Redis Stack 7+ [docs]. 2.0 JDBC adds a `sequence_id BIGINT` column and needs a migration of existing tables [docs].
- **What survives a crash.** Only what a repository stored. Tool-call messages are filtered by JDBC, Cassandra and Mongo, so a resumed conversation does not know which tools ran [docs]. Side effects of a half-finished tool loop are your problem.
- **Threading model.** `.call()` is blocking; `.stream()` is Reactor. Spring MVC (servlet) for blocking, WebFlux for streaming [docs]. `ToolCallingManager` is documented as safe to share across concurrent requests; counts are recomputed from the prompt each call [docs].
- **Virtual threads.** The Spring AI tool-calling page does not mention virtual threads [docs, fetched and checked]. A web search returned only general Spring Boot material: `spring.threads.virtual.enabled=true` (Boot 3.2+) puts Tomcat and `@Async` on virtual threads [secondary]. My inference, labelled [unverified]: because `.call()` is blocking I/O, a Boot 4 servlet app with that property on should get the usual virtual-thread benefit for many concurrent slow model calls; I did not find Spring AI documentation that confirms or qualifies this, and the streaming path's use of `ForkJoinPool.commonPool()` [docs] sits outside it. Watch for context loss (MDC, security context) at executor hops [secondary].




## 6. What you still build yourself

| Need | What Spring AI gives | What you build |
|---|---|---|
| Permissions and approval | Disable auto tool loop; `ToolCallback` wrapper point; MCP tool filter; `@McpElicitation` | A policy engine and approval flow |
| Sandboxing | Nothing | Process or container isolation for any command-running tool |
| Context compaction | Count-based window; `VectorStoreChatMemoryAdvisor` for retrieval | Summarisation, token-aware trimming |
| Cost and budget control | Token metric; per-tool call limits (`maxTotalToolCalls`) | Per-session budget enforcement and stop reason |
| Durable loop and resume | Chat-memory repositories | Step-level journal, idempotent tools, a workflow engine if needed |
| Evaluation | LLM-judge evaluators | Deterministic stub-model tests and your own scenarios |
| Agent patterns | `ChatClient` and structured output | The workflow classes. The docs example classes are in an external examples repository; the page shows only snippets and skeletons for orchestrator and evaluator [docs] |



## 7. Lock-in and escape hatches

- Your code touches `ChatClient`, `@Tool`, advisors, `ChatMemory` and property names; provider swaps are a starter and property change [docs].
- Leaving Spring AI is moderate, not trivial: tool schema generation, the loop, memory and MCP wiring are all framework features that you must replace. A plain-loop reimplementation of what a minimal agent uses (loop plus 2 tools plus window memory) is about 100 to 200 lines plus an HTTP client and a JSON Schema generator [unverified estimate]. MCP, vector stores and observability are the large parts.
- Boot coupling is the real lock-in: 2.x needs Boot 4 and Jackson 3. [docs].
- Migration stories: none found.

## 8. Pitfalls

1. **Major-version churn.** 1.x to 2.0 removed or renamed core types within a year: `FunctionCallback`/`functions()` gone for `ToolCallback`/`tools()`; `internalToolExecutionEnabled` removed; `ChatModel` no longer runs the tool loop (only `ChatClient` does); `PromptChatMemoryAdvisor` removed; `ChatMemory.DEFAULT_CONVERSATION_ID` removed; options builders must be passed as builders; `ToolCallAdvisor` renamed `ToolCallingAdvisor`; MCP annotation packages moved from `org.springaicommunity.mcp.*` to `org.springframework.ai.mcp.annotation.*`; MCP Spring transports moved to `org.springframework.ai:mcp-spring-*` [docs upgrade notes]. Pin the BOM.
2. **Patch releases change behaviour.** 2.0.1: `@McpTool` exceptions now mirror `@Tool` and checked exceptions surface as `UndeclaredThrowableException`; tool-name fallback resolution off by default [docs].
3. **Hidden defaults.** 20-message window; OpenAI client retries 3 times with a 60 s timeout; tool-call limits on by default; `ChatClient` always injects a `ToolCallingAdvisor` unless disabled [docs].
4. **Silent fallbacks.** `useProviderStructuredOutput()` silently falls back to prompt-based parsing when the model options do not support it [docs].
5. **Tool-call errors go to the model by default.** The default exception processor sends the message of any `RuntimeException` back to the model, and re-throws checked exceptions and `Error` [docs]. That can leak internal text to the model; set `spring.ai.tools.throw-exception-on-error=true` for strictness.
6. **Observability gaps.** Tool-call and ChatClient spans are not connected; OpenAI streaming spans lose parent context [docs].
7. **Memory silently loses tool context.** JDBC, Cassandra and Mongo repositories filter tool messages [docs]; ChatClient does not store intermediate tool messages [docs].
8. **Documentation gaps.** Parallel tools, cancellation, virtual threads and model-free testing are not covered in the pages I read [docs].

## 9. Choose it when / avoid it when

**Choose Spring AI when**
- The runtime lives inside a Spring Boot 4 service, so you reuse Actuator, Micrometer, Security, data sources and deployment.
- You want provider portability, MCP client/server starters and chat memory in JDBC with little code.
- Your agent is a bounded tool loop in a request-response service and durability is "the conversation, not the loop".

**Avoid it when**
- You need a durable, resumable loop with approvals as first-class features: you will build them anyway and the framework adds layers.
- You are stuck on Boot 3.x and want 2.x features (use 1.1.x or another library).
- Your core is a coding-agent style CLI: startup, footprint and a fast iteration loop favour a plain loop in another language.

**Versus writing the loop yourself** (roughly 100 lines, languages treatise section 8): the framework buys schema generation from annotated methods, provider adapters, streaming assembly, MCP transports and the Micrometer wiring. It costs a mandatory Spring dependency graph (Boot 4, Jackson 3, Reactor), a loop you cannot inspect as a state machine, default behaviours that are easy to miss, and 1.x-to-2.0-style churn. Of the reference loop's eight invariants, the default exception processor plausibly covers "malformed argument becomes an error result" [docs, not tested]; permission gating, tool cancellation, log replay and budget stops are yours.

## 10. What was verified

| Item | How | Result |
|---|---|---|
| Versions and dates | Maven Central `maven-metadata.xml` and POM `Last-Modified` headers; GitHub releases API | 2.0.2 (2026-10-23), 2.1.0-RC2 (2026-11-05), 1.1.8; 2.0.0 on 2026-06-12 |
| Boot 4 requirement | Getting-started page, repo README | Confirmed: 2.0.x on Boot 4.0.x/4.1.x; 1.1.x on Boot 3.5.x |
| Java baseline | Downloaded `spring-ai-model-2.0.2.jar`, read `MANIFEST.MF` and a class header | Java 17 |
| Base URL behaviour | Read `OpenAiSetup.java` in `spring-ai-openai-2.0.2-sources.jar` | Default `https://api.openai.com/v1`; inference that custom URL needs `/v1` |
| Docs pages read | getting-started, upgrade-notes (first 100k of 175k chars), chatclient, tools, chat-memory, effective-agents, testing, ollama-chat, openai-chat, structured-output native, MCP overview and client starter, observability | See labelled claims |
| Not read | Advisors, RAG, vector-store and most provider pages; rest of upgrade notes; 2.1 notes | Not checked |
| Java compile and run | Not possible, no JDK | **Nothing executed. All code is [docs] or [unverified]** |
| Stub server | Not started | Instructions in 3.2 are untested expectations |
| Virtual threads | Searched; Spring AI docs silent | Only general Spring Boot [secondary] |


## Secondary notes (labelled secondary, outside the required sections)

**Java MCP SDK (secondary to this profile).** The repository's languages treatise says Java is MCP Tier 2. Verified: https://modelcontextprotocol.io/docs/sdk.md lists Java (`modelcontextprotocol/java-sdk`) as **Tier 2**, with TypeScript, Python, C#, Go, Rust and Ruby as Tier 1 and Swift, PHP and Kotlin as Tier 3 [docs]. Central's `io.modelcontextprotocol.sdk:mcp` shows 2.2.0 as release (last-modified 2026-11-13) [source]. Spring AI 2.0 requires "MCP Java SDK 1.0.0 (RC1 or later)" per the Spring MCP page [docs], so Spring AI's MCP support is only as current as that SDK's tier; the page also says MCP Spring transport classes are now maintained inside Spring AI [docs].

**Google ADK for Java (secondary).** Maven `com.google.adk:google-adk`, latest on Central 1.15.0 (last-modified 2026-11-18); the getting-started page still shows 1.14.0 and requires Java 17+ [source] [docs https://adk.dev/get-started/java/]. It has `LlmAgent.builder()`, `FunctionTool`, `InMemoryRunner`, and returns an RxJava `Flowable<Event>`. The page does not label stability. It does have agents, sessions and runners, unlike Spring AI. Not evaluated further.
