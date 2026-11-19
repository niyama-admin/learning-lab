# Eino (CloudWeGo, Go)

An LLM application framework in Go with typed components, graph orchestration and an Agent Development Kit (ADK) that runs a tool-calling loop and emits events.

| Field | Value |
|---|---|
| Profile date | 2026-11-19 |
| Covers | `github.com/cloudwego/eino` v0.9.23 (core), `eino-ext` component modules at the versions listed below |
| Language | Go (core module declares `go 1.18`; several eino-ext modules need Go 1.23 to 1.25) |
| Author's execution status | **Nothing was compiled or run.** No Go toolchain was installed and none was installed for this profile. |

> **Read this first: every code block below is [docs] or [unverified].** Each snippet was transcribed from the repository source, the README, or the `eino-examples` repository as cloned on 2026-11-19, and checked by eye against the type definitions in the v0.9.23 tree. None was compiled. The minimal program in section 3 is assembled from three separate examples and is the most likely to need a small fix (an import, a field name). Treat it as a map, not as tested code. Facts about versions and dates come from the Go module proxy (`proxy.golang.org`) and the GitHub API, which I did query live.

## 1. Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current stable version | `v0.9.23`, tagged 2026-11-09 | [source] `https://proxy.golang.org/github.com/cloudwego/eino/@latest` |
| Pre-release line | `v0.10.0-alpha.1` (2026-06-11) through `v0.10.0-alpha.35` (2026-09-20); no alpha after 2026-09-20 appeared in the module list | [source] proxy `@v/list` and `.info` |
| Licence | Apache-2.0 | [source] GitHub API `license.spdx_id` |
| Maintainer | CloudWeGo, the open-source organisation of ByteDance. Security reports go to ByteDance Security. | [docs] `README.md` "Security" section |
| Repository | `https://github.com/cloudwego/eino` (about 13.7k GitHub stars on 2026-11-19) | [source] GitHub API |
| Docs | `https://www.cloudwego.io/docs/eino/` (the README links the `/zh/` Chinese path as the manual) | [docs] README |
| Extension repo | `github.com/cloudwego/eino-ext` (model, tool, embedding, callbacks modules, each its own Go module) | [source] clone of the repo |
| Languages | Go only | [docs] |
| Release cadence | 159 tags between v0.3.0 (2024-12-11) and v0.9.23. Minors: v0.4.0 2025-07-25, v0.5.0 2025-09-10, v0.6.0 2025-11-14, v0.7.0 2025-11-20, v0.8.0 2026-03-09, v0.9.0 2026-05-24; patches every one to four weeks. | [source] proxy `.info` queries |
| Major version | Still `0.x`. There has never been a `v1.0.0`. | [source] proxy list |
| Breaking-change history | There is no migration guide that I found. The v0.8.0 release note says "Recommend to upgrade to v0.8.4 and later for checkpoint compatibility reasons", i.e. saved checkpoints from earlier 0.8.x do not necessarily load. In the v0.9.23 source: `ChatModelAgentConfig.Middlewares` is marked deprecated in favour of `Handlers`; `model.ChatModel.BindTools` is deprecated (it mutates a shared instance and races) in favour of `ToolCallingChatModel.WithTools`; `schema.Message.MultiContent` is deprecated in favour of `UserInputMultiContent` and `AssistantGenMultiContent`; agent and event types became generic (`TypedChatModelAgent[M MessageType]`) with aliases such as `type ChatModelAgentConfig = TypedChatModelAgentConfig[*schema.Message]`. | [docs] GitHub release body for v0.8.0; [source] `adk/chatmodel.go`, `components/model/interface.go`, `schema/message.go` |
| Status | Active. Last commit on `main` seen: 2026-11-09. | [source] `git log` of the clone |

eino-ext modules, module proxy, 2026-11-19 [source]:

| Module | Latest | Date | Needs Go |
|---|---|---|---|
| `components/model/openai` | v0.1.13 | 2026-04-16 | not checked |
| `components/model/claude` | v0.1.26 | 2026-09-24 | 1.24 |
| `components/model/ollama` | v0.1.9 | 2026-04-08 | not checked |
| `components/tool/mcp` (wraps `mark3labs/mcp-go`) | v0.0.9 | 2026-08-13 | 1.23.0 (go.mod on main) |
| `components/tool/mcp/officialmcp` (wraps the official `modelcontextprotocol/go-sdk`) | v0.1.1 | 2026-07-24 | 1.25.0 (go.mod on main) |

Plan on Go 1.25 for anything that talks to MCP.

## 2. What it is, in terms of the runtime loop

Eino has two layers. The lower layer is `compose`: typed components (`ChatModel`, `Tool`, `Retriever`, `ChatTemplate`, `Embedding` and others) wired into a directed graph, a chain, or a workflow, compiled into a `Runnable` that supports four call shapes (invoke, stream, collect, transform) and handles stream copying and merging between nodes [docs: README "Stream Processing"]. The upper layer is the ADK in package `adk`: a `ChatModelAgent` runs a ReAct loop (model call, tool calls, model call, until no tool calls), a `Runner` drives the agent and yields an iterator of `AgentEvent`, and an interrupt/resume mechanism stores a checkpoint through a `CheckPointStore` you provide [docs: README "Interrupt/Resume"; source: `adk/runner.go`]. Pre-built multi-agent patterns (`prebuilt/deep`, `prebuilt/supervisor`, `prebuilt/planexecute`) sit on top.

For someone writing a runtime, the ADK is the relevant part. `compose` matters when you want deterministic pipelines; you can expose a graph as a tool (`graphtool.NewInvokableGraphTool`) [docs: README "Composition"].

| # | Duty | Eino | API name and evidence |
|---|---|---|---|
| 1 | Stream from the model | **Provided** | Models implement `Stream(ctx, input, opts...) (*schema.StreamReader[M], error)` [source: `components/model/interface.go`]. `RunnerConfig.EnableStreaming: true` makes the agent emit `MessageStream` events [source: `adk/runner.go`, `adk/interface.go`]. Partial tool-call assembly is inside the provider components (not read). [unverified] |
| 2 | Loop as state machine | **Provided, opaque** | `ChatModelAgent` runs the ReAct loop built from a compiled graph internally; you tune it with `MaxIterations` (default 20; exceeding it ends the run with an error) and `Handlers`. You cannot step it yourself. [source: `adk/chatmodel.go` doc comments] |
| 3 | Validate arguments, generate schemas | **Partly provided** | `utils.InferTool[T, D](name, desc, fn)` infers a JSON Schema from the struct type `T` and unmarshals arguments into `T` [source: `components/tool/utils/invokable_func.go`]. It decodes but does not validate against the schema: a bad argument string yields a Go error `[LocalFunc] failed to unmarshal arguments...`, returned from the tool. [source] |
| 4 | Concurrent tools, cancellation | **Partly provided** | `ToolsNodeConfig.ExecuteSequentially` defaults to false, so tool calls from one model turn **run in parallel**; there is no read/write distinction, so a writing tool races a reading tool unless you set `ExecuteSequentially: true` [source: `compose/tool_node.go`]. Cancellation: `adk.WithCancel()` returns a run option and a cancel function with modes `CancelAfterChatModel` and `CancelAfterToolCalls` (cancel at the next safe point), plus a timeout and a recursive option [source: `adk/cancel.go`]. Context cancellation of the Go `ctx` also applies. |
| 5 | Sandboxed execution | **You build it** | `adk/filesystem` defines a `Backend` interface (in-memory implementation); eino-ext has a local backend and a `commandline` tool; isolation not inspected. No OS sandbox. [source: listings] |
| 6 | Context assembly and compaction | **Partly provided** | `GenModelInput`; `adk/middlewares/summarization` summarizes when a token threshold is passed; `reduction` and `agentsmd` middlewares also exist [source: listing, `summarization.go`]. |
| 7 | Session persistence | **Partly provided** | The Runner takes `[]*schema.Message`; **cross-turn history is yours to store**. Built-in persistence is only interrupt checkpoints (`CheckPointStore`). Per-run values: `adk.AddSessionValue/GetSessionValue`. A `TurnLoop` type (`adk/turn_loop.go`) was not studied. [source] |
| 8 | Permissions | **You build it** | No engine. Approval = a tool wrapper calling `tool.StatefulInterrupt` (3d); policy hooks in `WrapToolCall` or `ToolCallMiddlewares`. [source: `adk/chatmodel.go`, `approval_wrapper.go`] |
| 9 | Extension | **Provided** | MCP via eino-ext `tool/mcp` and `officialmcp` (`GetTools` returns `[]tool.BaseTool`); hooks via `ChatModelAgentMiddleware` (`BeforeModelRewriteState`, `WrapModel`, `WrapToolCall`); `skill` and `dynamictool` middlewares. [source] |
| 10 | Observability | **Provided** | Callbacks (`OnStart`, `OnEnd`, `OnError`, stream variants) on components, graphs, agents; `callbacks.AppendGlobalHandlers`. eino-ext handlers: cozeloop, langfuse, langsmith, apmplus, tls; no OpenTelemetry handler. Usage on `Message.ResponseMeta`. [docs: README; source] |
| 11 | Packaging | **Go gives it** | Static binary; many transitive dependencies (sonic, gonja, ...); size not measured. [source: `go.mod`] |
| 12 | Local models | **Provided via Ollama module and OpenAI-compatible base URL** | `eino-ext/components/model/ollama`; `openai.ChatModelConfig.BaseURL` for any OpenAI-compatible server. No in-process inference. [source] |

## 3. Implement it

### Install and minimal agent

```bash
# not executed: no Go toolchain in the authoring environment
mkdir weather && cd weather
go mod init example.com/weather
go get github.com/cloudwego/eino@v0.9.23
go get github.com/cloudwego/eino-ext/components/model/openai@v0.1.13
```

The program below creates one agent with the tool `get_weather(city) -> "31 C and clear"`, asks "What is the weather in Pune?", and prints the final answer. **Status: [docs]/[unverified], not compiled.** It follows the README Quick Start, `eino-examples/adk/intro/session`, and the `utils.InferTool` signature in `components/tool/utils/invokable_func.go`.

```go
// language: Go. NOT EXECUTED. Assembled from README and eino-examples; may need small fixes.
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/components/tool/utils"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/schema"
)

type WeatherArgs struct {
	City string `json:"city" jsonschema_description:"city name"`
}

func getWeather(ctx context.Context, in *WeatherArgs) (string, error) {
	return "31 C and clear", nil
}

func main() {
	ctx := context.Background()

	weather, err := utils.InferTool("get_weather", "Get the weather for a city", getWeather)
	if err != nil {
		log.Fatal(err)
	}

	chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
		APIKey:  os.Getenv("OPENAI_API_KEY"),
		Model:   os.Getenv("OPENAI_MODEL"),
		BaseURL: os.Getenv("OPENAI_BASE_URL"), // empty means the default OpenAI endpoint
	})
	if err != nil {
		log.Fatal(err)
	}

	agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:        "weather_agent",
		Description: "answers weather questions",
		Instruction: "Use the get_weather tool, then answer in one sentence.",
		Model:       chatModel,
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{Tools: []tool.BaseTool{weather}},
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent})
	iter := runner.Query(ctx, "What is the weather in Pune?")
	var answer string
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}
		if event.Err != nil {
			log.Fatal(event.Err)
		}
		if mo := event.Output; mo != nil && mo.MessageOutput != nil && mo.MessageOutput.Message != nil {
			m := mo.MessageOutput.Message
			if m.Role == schema.Assistant && len(m.ToolCalls) == 0 && m.Content != "" {
				answer = m.Content
			}
		}
	}
	fmt.Println(answer)
}
```

Notes. The `jsonschema_description` tag comes from `eino-examples/adk/intro/session` [source]. The final-answer extraction is my own [unverified]. `MessageOutput.Message` is set when streaming is off; with `EnableStreaming: true` read `MessageStream` [source: `adk/interface.go`].

### Run it against the stub

Not run (no toolchain). How a developer would do it [unverified]: start `node server.mjs 8787 &` from `agents/frameworks/stub/`, then run the program above with `OPENAI_API_KEY=x OPENAI_BASE_URL=http://127.0.0.1:8787/v1 OPENAI_MODEL=stub go run .`. The openai component exposes `BaseURL` [source: `eino-ext/components/model/openai/chatmodel.go`]. After the run, `curl http://127.0.0.1:8787/_log` should show two requests, the second containing a tool message. Expected final output from the stub's scripted second turn: `It is 31 C and clear in Pune.` I have not seen it. I did not check whether that module can use the Responses API. [unverified]

### Features

**(a) Streaming.** `RunnerConfig.EnableStreaming: true`; events carry `MessageOutput.MessageStream`; call `Recv()` until `io.EOF` [source: `adk/interface.go`, `prints/util.go`]. [docs]

**(b) Memory across turns.** Not provided as a store. Pass the prior history to `runner.Run(ctx, messages)` and append the new messages yourself [source: `adk/runner.go`]. Build a log keyed by session id plus the summarization middleware.

**(c) Durable state: pause, resume, restart after a crash.** Provided for interrupts. Supply `RunnerConfig.CheckPointStore` (an interface with `Get(ctx, id) ([]byte, bool, error)` and `Set(ctx, id, []byte) error` [source: `internal/core/interrupt.go`, aliased as `compose.CheckPointStore`]) and start a run with `adk.WithCheckPointID("1")`. An interrupt writes a checkpoint; `runner.Resume(ctx, "1")` or `runner.ResumeWithParams(ctx, "1", &adk.ResumeParams{Targets: map[string]any{interruptID: data}})` continues it, possibly in another process if the store is shared (the example comment suggests Redis) [source: `eino-examples/adk/human-in-the-loop/1_approval/main.go`]. The checkpoint is gob-encoded: custom types you put in interrupt info or state must be registered with `schema.Register[T]()` [source: example `init()`; v0.7.0 release note "register missing types for gob serialization in checkpoint"]. I found no evidence of per-step checkpoints (so a mid-run crash is not resumable); assume only interrupts and safe-point cancellations write them. [unverified] Do not keep checkpoints across upgrades (v0.8.0 note).

**(d) Human approval before a tool runs.** Wrap the tool: on first call `return "", tool.StatefulInterrupt(ctx, &ApprovalInfo{...}, argumentsInJSON)`; on resume read `tool.GetInterruptState[string](ctx)` and `tool.GetResumeContext[*ApprovalResult](ctx)`, then run the wrapped tool or return a denial string. The runner's last event has `Action.Interrupted.InterruptContexts[0].ID`, which is the key for `ResumeWithParams` [source: `eino-examples/adk/common/tool/approval_wrapper.go` and `1_approval/main.go`; the helper lives in the examples repo, you copy it]. Marked [docs]. Several parallel interrupts give several `InterruptContexts` (`CompositeInterrupt` exists) [source: `components/tool/interrupt.go`].

**(e) A second tool and parallel tool calls.** Add another `tool.BaseTool` to `ToolsNodeConfig.Tools`. Parallel by default; `ExecuteSequentially: true` serialises [source: `compose/tool_node.go` field comment].  `UnknownToolsHandler` turns a hallucinated tool name into a result string; `ToolArgumentsHandler` rewrites arguments [source: same file]. [docs]

**(f) Calling an MCP server.** Two adapters. (1) `github.com/cloudwego/eino-ext/components/tool/mcp`: `mcpp.GetTools(ctx, &mcpp.Config{Cli: cli})` where `cli` is a `mark3labs/mcp-go` client that you started and initialised; it returns `[]tool.BaseTool` to drop into `ToolsNodeConfig.Tools`. It depends on `github.com/mark3labs/mcp-go v0.43.0` and `eino v0.6.0` in its `go.mod` (Go's minimum-version selection will lift eino to your version) [source: its README and `go.mod` on main; latest tag v0.0.9, 2026-08-13]. (2) `.../components/tool/mcp/officialmcp` wraps the official `modelcontextprotocol/go-sdk` v1.6.1, has typed connection errors (`IsConnectionError`) and a reconnecting-session option, tag v0.1.1 [source: `officialmcp/go.mod`, `mcp.go`, git log]. Prefer (2) for new work, since the official SDK is Tier 1 and (1) rests on a community library. Neither was run. [docs]

**(g) Structured (typed) output.** No agent-level typed-output feature that I found in `ChatModelAgentConfig`. Options: `model.WithToolChoice` to force a tool whose argument struct is your output type (the same trick `InferTool` makes easy), or the provider's response-format setting (the openai component re-exports `ChatCompletionResponseFormatTypeJSONSchema`), then unmarshal yourself. [source: `components/model/option.go`, `eino-ext/components/model/openai/chatmodel.go`] Marked [unverified] as a recipe.

**(h) Tracing or observability.** `callbacks.AppendGlobalHandlers(handler...)`, with ready handlers for CozeLoop, Langfuse, LangSmith and APMPlus in `eino-ext/callbacks`. For OpenTelemetry you write a `callbacks.Handler`; none ships. [docs: README; source: `ext/callbacks` listing, `1_approval/main.go`]

**(i) Test without a real model.** Implement `model.ToolCallingChatModel` (three methods: `Generate`, `Stream`, `WithTools`) as a scripted fake that returns an assistant `*schema.Message` with `ToolCalls`, then a text message once it sees a tool message. The framework's own mock is under `internal/mock`, so it is not importable. The agent loop is then testable with `runner.Query` and no network [source: interface definitions in `components/model/interface.go`]. Marked [unverified] as a recipe; also note that the stub server can serve the same purpose over HTTP.

## 4. Models and local models

- **Provider selection.** Each provider is a separate Go module in `eino-ext/components/model/`: `openai`, `claude`, `gemini`, `ollama`, `deepseek`, `qwen`, `qianfan`, `ark` (ByteDance Volcano Engine), `openrouter`, plus `agentic*` variants for providers that run tools server-side [source: directory listing]. The README names OpenAI, Claude, Gemini, Ark and Ollama as official implementations [docs].
- **First versus second class.** By tag dates, `ark` (v0.1.73, 2026-11-19), `gemini` and `claude` are most active; `openai` (2026-04-16) and `ollama` (2026-04-08) are older. This is inference from tags, not a maintainer statement.
- **OpenAI-compatible endpoint (vLLM, llama.cpp server, Ollama's `/v1`).** `openai.ChatModelConfig{BaseURL: "http://host:port/v1", APIKey: "x", Model: "..."}` [source: `chatmodel.go` field comments; the same struct also offers Azure fields `ByAzure`, `APIVersion`]. The `ollama` module speaks Ollama's native API [source: module exists; protocol detail not read, [unverified]].
- **Anthropic.** The `claude` module uses `github.com/anthropics/anthropic-sdk-go v1.56.0` per its `go.mod` on main, with a `BaseURL *string` option [source]. Anthropic's current official Go SDK is the **v2** module `github.com/anthropics/anthropic-sdk-go/v2`, version 2.11.0 on 2026-11-17, with a stated API version of `2026-10-21` [docs: `https://platform.claude.com/docs/en/api/client-sdks.md`; source: proxy `@latest`]. So the Eino Claude module sits on the previous major version of the SDK. Whether that matters depends on which API features you need. [unverified]
- **Local, in-process.** Not provided. You would run llama.cpp, Ollama or vLLM as a server.
- **Small or open models.** Tool schemas go to the provider in its native format; I found no parsing of tool calls out of text and no repair of malformed JSON (`InferTool` errors, duty 3). `ModelRetryConfig` and `ModelFailoverConfig` retry or switch model on error; defaults not read. [source: `adk/chatmodel.go`]

## 5. State, durability and concurrency

- **Representation.** `*schema.Message` structs [source: `schema/message.go`]. Run state, session values and interrupt info live in memory and are gob-encoded only into a checkpoint at an interrupt [source: `adk/turn_loop.go` imports gob; example comments].
- **Where it lives.** Your `CheckPointStore` (two methods; the examples use an in-memory store, production needs Redis or a table). An optional `CheckPointDeleter` exists [source: `internal/core/interrupt.go`].
- **Crash behaviour.** Anything between interrupts is lost unless you persist the history yourself and restart the turn. [unverified, see 3c]
- **Concurrency and cancellation.** Goroutines; tool calls run in parallel unless `ExecuteSequentially`; `AsyncIterator.Next()` is a blocking pull. How an abandoned `StreamReader` is cleaned up was not verified. Cancellation as in section 2, duty 4; subprocess-tree kill is your tool's job.

## 6. What you still build yourself

| Need | What Eino gives | You build |
|---|---|---|
| Permissions | Interrupt/resume, `WrapToolCall` hooks | Rule engine, modes, allowlists, audit log |
| Sandboxing | A filesystem `Backend` interface, a local backend in eino-ext | OS sandbox, process-tree kill, network policy |
| Session log | Checkpoints for interrupts only | Append-only message log, resume, fork |
| Context compaction | Summarization and reduction middlewares | Tuned thresholds, token counting for your models |
| Read/write tool scheduling | Parallel or fully sequential | Read-only parallel, writers serial |
| Argument validation | Struct unmarshal | Schema validation, error-to-model feedback for bad arguments (otherwise the tool error propagates as a Go error) |
| Cost control | `ResponseMeta` usage on messages | Budget accounting and stop |
| Evaluation | evaluators in eino-ext (README mention) | A real harness |

## 7. Lock-in and escape hatches

Your code touches four framework types: `schema.Message` (also what you persist), `tool.BaseTool`/`InferTool`, `model.ToolCallingChatModel`, and the `adk` event stream. A plain-loop reimplementation of the minimal agent is about 100 lines of Go plus an HTTP client; what is hard to rewrite is the interrupt/resume machinery over gob checkpoints and the multi-agent presets, which the reference loop does not need if you persist your own log [docs: languages treatise, section 8]. No migration stories were found. [unverified]

## 8. Pitfalls

1. **0.x with deprecations in flight.** `Middlewares` versus `Handlers`, `BindTools` versus `WithTools`, `MultiContent` versus the two new fields [source above]. Pin exact versions in `go.mod`. A v0.10 alpha line (35 tags, 2026-06 to 2026-09) went quiet while v0.9.x patch releases continued; which line becomes the next stable is not stated anywhere I found. [source: proxy list; inference]
2. **Checkpoint compatibility across versions.** v0.8.0's release note says so explicitly. Do not rely on a checkpoint outliving an upgrade.
3. **Module sprawl and mixed Go versions.** Each eino-ext component is its own module with its own dependency set (`mcp` needs Go 1.23, `officialmcp` 1.25) [source: go.mod files]. The MCP module pins `mark3labs/mcp-go v0.43.0` while the same library's latest is v1.5.0 (2026-10-30) [source: proxy], so you will carry an old community MCP client unless you use `officialmcp`.
4. **Documentation language.** The README links the Chinese-language manual; read the English source comments, which are detailed. [docs]
5. **Parallel tools and no read/write split.** Easy to get races with writing tools. [source]
6. **Tool errors end the run by default.** `InferTool` returns an error for malformed arguments; I did not find a default conversion into a tool-result message for the model, so use `ToolCallMiddlewares` or `WrapToolCall` to convert errors. [source for the error return; the absence of conversion is [unverified]]
7. **Agent transfer is discouraged by the project itself**: source comments say it "has not proven to be more effective empirically" and recommend agent-as-tool or DeepAgent [source: `adk/chatmodel.go`].
8. **Hidden prompts.** The prebuilt `deep`, `planexecute` and `summarization` packages ship default prompts (v0.7.0 notes mention fixing a "default summary prompt"); read them. Token overhead was not measured. [docs]

## 9. Choose it when / avoid it when

**Choose Eino when** you write Go services and want graph-shaped pipelines (retrieval, routing) plus a ReAct agent with human-in-the-loop interrupts and Langfuse or LangSmith callbacks, and accept 0.x churn and pinning.

**Avoid it when** you need a coding-agent-grade runtime (permission modes, OS sandbox, session fork, read/write tool partitioning): you rebuild all of that, and the loop is sealed beyond the middleware hooks. Also avoid it for a minimal dependency set or a stable API.

**Versus writing the loop yourself (about 100 lines).** What Eino buys: provider adapters with streaming and tool-call assembly, schema inference from Go structs, the interrupt/resume protocol, callbacks integrations, summarization middleware. What it costs: a large API surface, generics in public types, 0.x churn, an opaque loop. In Go specifically, the pieces you most want a library for are cheap to get without a framework: the official Anthropic SDK (`github.com/anthropics/anthropic-sdk-go/v2` v2.11.0 and the Messages API with streaming) and the official MCP client (`github.com/modelcontextprotocol/go-sdk` v1.8.0, 2026-09-04, Tier 1 per `https://modelcontextprotocol.io/docs/sdk.md`) [docs/source]. **My recommendation: for an agent runtime where you own the permission and session model, write the loop on those two SDKs plus `net/http` for OpenAI-compatible endpoints, and borrow ideas from Eino's approval wrapper and checkpoint design rather than adopting the framework.** Use Eino if the product is a pipeline or workflow application rather than a general agent runtime. This is judgment, not measurement.

### Secondary: other Go options (labelled; only versions and dates verified)

| Option | Facts verified from the module proxy on 2026-11-19 | What I did not verify |
|---|---|---|
| Google ADK for Go (`google.golang.org/adk`) | `v1.0.0` tagged 2026-03-20; latest `v1.9.0` on 2026-10-15; 18 stable tags. This confirms "1.0 in March 2026". | Features, MCP support, model providers beyond Gemini, checkpointing. |
| Genkit Go (`github.com/firebase/genkit/go`) | latest `v1.14.0` on 2026-10-19; 42 stable tags | Everything else. |
| LangChainGo (`github.com/tmc/langchaingo`) | `v0.1.14` on 2025-10-20, then `v0.1.15` on 2026-10-05: a gap of about a year between releases, which supports "stale" as a description of 2025-10 to 2026-10, though a release did land in October 2026 | Activity of the repo; API quality. |
| MCP Go SDK (official, Tier 1) | `v1.0.0` 2025-09-30; `v1.8.0` 2026-09-04 [source]; Tier 1 per the MCP SDK page [docs] | Feature coverage of the latest spec revision. |
| Anthropic Go SDK (official) | module `.../anthropic-sdk-go/v2`; `v2.0.0` 2026-10-21; `v2.11.0` 2026-11-17 [source]; listed among Anthropic's client SDKs [docs] | Not run. The `v1` module continued to 1.84.0 (2026-10-20). |

## 10. What was verified

| Item | Status |
|---|---|
| Go or Rust toolchain installed | No. Nothing compiled or run. |
| Packages installed | None. |
| Module versions and dates | Queried live from `proxy.golang.org` for eino, eino-ext modules, go-sdk, anthropic-sdk-go v1 and v2, google.golang.org/adk, genkit go, langchaingo, mark3labs/mcp-go. |
| Sources read | Shallow clones of `eino` (main and tag v0.9.23), `eino-ext`, `eino-examples`: README, `adk/{runner,chatmodel,interface,interrupt,cancel}.go`, `compose/tool_node.go`, `components/tool/utils/invokable_func.go`, `components/model/interface.go`, `schema/message.go`, the approval and session examples, eino-ext `tool/mcp`, `officialmcp`, and `model/openai`, `model/claude` fields. |
| Docs pages fetched | `modelcontextprotocol.io/docs/sdk.md` (Go and Rust Tier 1), `platform.claude.com/docs/en/api/client-sdks.md` (Go SDK is the v2 module, 2.11.0). The cloudwego.io docs site was not fetched. |
| Stub server | Not started; section 3 stub steps are untested. |
| Could not check | Tool-error feedback to the model; per-step checkpointing; `TurnLoop`; stream cleanup; token overhead; the Responses API in the openai module; MCP behaviour at runtime; features of Google ADK, Genkit, LangChainGo. |
