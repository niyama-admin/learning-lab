# rig (0xPlaygrounds/rig, Rust)

A Rust library for LLM applications: provider clients, an agent runtime with tools, memory, retrieval and vector stores. Since 0.46 the same repository also ships a terminal coding agent called `rig`.

| Field | Value |
|---|---|
| Profile date | 2026-11-19 |
| Covers | crates `rig` / `rig-core` / `rig-agent` at 0.46.0 (2026-10-31); `rmcp` 3.11.0 for MCP |
| Language | Rust (the workspace sets `rust-version = "1.97.1"`) |
| Author's execution status | **Nothing was compiled or run.** No Rust toolchain was installed and none was installed for this profile. |

> **Read this first: every code block below is [docs] or [unverified].** Snippets are transcribed from the `examples/` directory and doc comments of the repository at tag `v0.46.0` and `main` (cloned 2026-11-19), and cross-checked by eye against the type signatures. None was compiled. The minimal program in section 3 is assembled from three examples (`agent_with_durable_approval` for the `Tool` trait, `litellm` for the custom base URL, `agent_with_tools` for the builder), so an import or method name may be off. Version numbers and dates were read live from the crates.io API, and repository facts from the GitHub API and the clone.

## 1. Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version | `0.46.0`, published 2026-10-31 (a `0.46.0-rc.1` appeared 2026-10-23) | [source] crates.io API for `rig-core` and `rig` |
| Licence | MIT (README and `rig-core` crate metadata) | [docs] README "Rig is MIT licensed"; [source] crates.io says MIT for `rig-core` |
| Maintainer | Playgrounds (the README footer "Built by Playgrounds"); an organisation, not a foundation | [docs] README |
| Repository | `https://github.com/0xPlaygrounds/rig` (about 9.2k stars, last push 2026-11-19) | [source] GitHub API |
| Docs | `https://docs.rs/rig`, guides at `https://rig.rs/docs`, in-repo `docs/agent.md`, `MIGRATING.md`, `CHANGELOG.md` | [docs] README |
| Crates | `rig` (facade), `rig-core` (messages, models, tools, providers), `rig-agent` ("classic agent runtime"), `rig-memory`, `rig-cassette` (record/replay), `rig-rmcp`, `rig-candle`, vector-store crates, coding-agent crates (`rig-cli`, `rig-harness`, plugins) | [docs] README |
| History | `rig-core` first published 2024-05-29; about 4.5 million downloads | [source] crates.io |
| Minimum Rust | **1.97.1**, a very recent toolchain; the README repeats it for the coding agent | [source] `Cargo.toml` `rust-version`, crates.io `rust_version` for 0.46.0 |
| Release cadence | 0.38.0 2026-06-02, 0.39.0 06-19, 0.40.0 07-11, 0.41.0 07-28, 0.42.0 08-17, 0.43.0 09-30, 0.44.0 10-07, 0.45.0 10-19, 0.46.0 10-31: a new break-capable minor every one to six weeks. Earlier: 0.1.0 2024-09-16, 0.10.0 2025-03-17, 0.20.0 2025-09-15, 0.30.0 2026-02-03. 67 `rig-core` versions including pre-releases. | [source] crates.io API |
| Stability promise | None. The README states: "Rig is pre-1.0, so releases break APIs. The changelog and migration notes say what changed." | [docs] README |
| Breaking-change history | `MIGRATING.md` (about 3.7k lines) has sections for 0.31 through 0.46. **0.44 to 0.45:** shared message, tool-definition and request types; "one contextual tool trait" (`PortableTool`, `PortableToolEmbedding`, `ErasedTool` removed; `Tool::call` gains `&mut ToolContext`); effect bus replaced by inline handlers; `TurnPolicy`; sans-IO tool answers; MCP connections own their lifetime; storage and HTTP layer changes. **0.45 to 0.46:** serde_json features become the user's choice; message data and reasoning blobs; provider selection and catalog; agent runs, observers; memory and compaction; coding-agent plugin API. The guide calls its examples "source-checked migration sketches, not compiled standalone programs". | [docs] `MIGRATING.md` |
| Status | Active, fast-moving, pre-1.0 | [source] |

Consequence: **sixteen minor versions in about 39 weeks (0.30.0 on 2026-02-03 to 0.46.0 on 2026-10-31)**; code written today targets an API replaced within weeks. Pinning means missing fixes. [source for dates; inference]

Related crates, from crates.io on 2026-11-19 [source]:

| Crate | Version | Date |
|---|---|---|
| `rmcp` (official MCP Rust SDK, repo `modelcontextprotocol/rust-sdk`, Apache-2.0) | 3.11.0 | 2026-11-17 (`1.0.0` was 2026-03-03; 3.0 is after that) |
| `candle-core` (Hugging Face, Apache-2.0 per GitHub) | 0.11.1 | 2026-10-31 |
| `mistralrs` | 0.8.1 on crates.io (2026-04-02), while the GitHub releases show v0.9.5 on 2026-10-19 | the published crate lags the repository by two minors |
| `rig-candle` | 0.46.0 | 2026-10-31 |

## 2. What it is, in terms of the runtime loop

rig is a library of typed pieces: a `Model` per provider (a completion model is one wire format plus one HTTP transport), an `AgentBuilder` that attaches a model, a preamble (system prompt), tools, memory and hooks, and an `AgentRunner` that executes the loop when you `.await` `agent.prompt("...")` or call `.stream()`. In 0.46 the loop has a second, lower form: `AgentRun`, a "sans-IO" state machine you step by hand (`run.next_step()` returns `CallModel`, `CallTools` or `Done`; you perform the I/O and feed results back), and it is serialisable with serde [source: `examples/agent_with_durable_approval/src/main.rs`; `crates/rig-agent/src/run/`]. That is close to the explicit state machine the reference loop wants. Concurrency, retries, hooks and persistence are options on the runner and builder.

| # | Duty | rig | API name and evidence |
|---|---|---|---|
| 1 | Stream from the model | **Provided** | `agent.prompt(p).stream()` yields `MultiTurnStreamItem` values: `StreamAssistantItem` (text and tool-call-argument fragments), `ToolCall`, `ToolResult`, and `FinalResponse` [source: `crates/rig-agent/src/agent/streaming.rs`]. Providers decode SSE or provider streams inside `rig-core`. |
| 2 | Loop as state machine | **Provided, steppable** | `AgentRun::new(prompt).max_turns(n)`, `next_step()`, `model_response(...)`, `answer(...)` [source: durable-approval example]. The convenience `AgentRunner` drives the same machine. `default_max_turns` on the builder, `.max_turns(n)` per prompt. |
| 3 | Validate arguments, schemas | **Provided** | Tools declare `parameters()` as JSON (`serde_json::Value`) by hand in the trait, or via the `#[rig_tool(...)]` attribute macro in `rig-derive`; arguments are validated against that schema before the tool runs (`rig_core::tool::validate`, `arguments_refusal`), and arguments that are not a JSON object are marked `Malformed` and the model is told to call again [source: `crates/rig-core/src/tool/validate.rs`; example]. The validator checks "a subset of JSON Schema" [source: same file]. |
| 4 | Concurrent tools, cancellation | **Partly provided** | `AgentRunner::tool_concurrency(n)`; **defaults to one** (sequential), "concurrent hooks and side effects may interleave" [source: `agent/runner.rs`]. No read/write classification. Cancellation is Rust's: dropping the future cancels the run; hooks can also stop it (`AgentHook` returning stop). [source: `runner.rs` doc comments; the drop semantics are the language's, [unverified] for cleanup details] |
| 5 | Sandboxed execution | **You build it** | None in the library; the coding agent's shell and file tools (`rig-tools`) were not inspected. [source] |
| 6 | Context, compaction | **Partly provided** | `AgentBuilder::context`, `dynamic_context`, `retrieved_tools`; `rig-memory` has `compaction` and `tokens` modules (policies not read). [source] |
| 7 | Session persistence | **Provided** | `AgentBuilder::memory(store)` and `agent.prompt(p).conversation("id")` load and save the conversation; stores: `MemoryStore`, `DirStore` (feature `fs`), Postgres and SQLite crates (feature `memory`). Concurrent runs on the same log: the second to save fails with `SessionError::Changed`. [source: `agent/builder.rs` doc comment; `examples/agent_with_memory`] |
| 8 | Permissions | **Partly provided** | The `AgentHook` trait has a `DispatchEvent` hook returning `DispatchAction::proceed()`, `skip(reason)` or `patch(...)`; the skipped reason is returned to the model as the tool result [source: `examples/agent_with_approval_policy`]. The example's own comment says: "This is a guardrail, not a security boundary, so enforce authorization in the tool." |
| 9 | Extension | **Provided** | `rig-rmcp` (feature `rmcp`), `AgentHook`/`HookStack`; the coding agent has its own plugin system. [source] |
| 10 | Observability | **Provided** | `tracing` spans following the OpenTelemetry GenAI semantic conventions (`rig_core::telemetry`), opt-in content recording (`record_content_telemetry`); examples `otel`, `agent_with_tools_otel`. `rig-cassette` records and replays HTTP traffic or effect logs. [source: `telemetry/mod.rs`, builder] |
| 11 | Packaging | **Rust gives it** | Native binary; but `rig`'s default features include `cli`, so use `default-features = false` (Pitfall 3). `rig-core` and `rig-agent` build for browser WASM [docs: README]. |
| 12 | Local models | **Partly provided** | `rig-candle` runs a few validated checkpoints in process (Llama 3 instruct, SmolLM2-360M Q4_K_M GGUF, Qwen3-4B Q4_K_M GGUF with a "Qwen Hermes tool protocol"); servers via `providers::ollama` and `providers::llamacpp`. No mistral.rs integration was found in the repository (a search for "mistral.rs" in the tree found nothing). [source: `crates/rig-candle/README.md`, provider directory] |

## 3. Implement it

### Install and minimal agent

```bash
# not executed: no Rust toolchain in the authoring environment; needs Rust 1.97.1 or newer
cargo new weather && cd weather
cargo add rig --no-default-features --features reqwest,agent,derive   # see note on features below
cargo add anyhow serde_json thiserror
cargo add serde --features derive
cargo add tokio --features macros,rt-multi-thread
```

Feature note [unverified]: the README's install line is `cargo add rig anyhow` (with defaults), which pulls in the `cli` feature and the coding-agent launcher. I believe `--no-default-features --features reqwest,agent,derive` is enough for a library agent (the default list is `rig-core/default, reqwest, agent, derive, rustls, cli`, so you may also need `rustls` for TLS). I did not resolve the feature graph. If it does not compile, start from the README's default line and prune later.

The program creates one agent with the tool `get_weather(city) -> "31 C and clear"` and prints the final answer. **[docs]/[unverified], not compiled.** The `Tool` trait shape is copied from `examples/agent_with_durable_approval`; the base-URL client from `examples/litellm`; `.tool(...)` and `.default_max_turns(...)` from `agent/builder.rs`.

```rust
// language: Rust. NOT EXECUTED. Assembled from rig 0.46.0 examples; may need small fixes.
use rig::prelude::*;
use rig::providers::openai::OpenAIConfig;
use rig::tool::{Tool, ToolContext};
use serde::Deserialize;
use serde_json::json;

#[derive(Debug, thiserror::Error)]
#[error("tool failed: {0}")]
struct WeatherError(String);

#[derive(Deserialize)]
struct WeatherArgs {
    city: String,
}

struct GetWeather;

impl Tool for GetWeather {
    const NAME: &'static str = "get_weather";
    type Error = WeatherError;
    type Args = WeatherArgs;
    type Output = String;

    fn description(&self) -> String {
        "Get the weather for a city.".to_string()
    }

    fn parameters(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": { "city": { "type": "string", "description": "City name" } },
            "required": ["city"]
        })
    }

    async fn call(&self, _context: &mut ToolContext, _args: Self::Args) -> Result<Self::Output, Self::Error> {
        Ok("31 C and clear".to_string())
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let base_url = std::env::var("OPENAI_BASE_URL").unwrap_or_else(|_| "https://api.openai.com/v1".into());
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "unused".into());
    let model = std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o".into());

    // `.chat()` selects Chat Completions. The default `.completion()` route of the OpenAI
    // client is the Responses API (see the comment in examples/litellm).
    let client = OpenAIConfig::new(api_key).with_base_url(base_url).client();
    let agent = AgentBuilder::new(client.chat(model))
        .preamble("Use the get_weather tool, then answer in one sentence.")
        .tool(GetWeather)
        .default_max_turns(4)
        .build();

    let answer = agent.prompt("What is the weather in Pune?").await?.output().to_string();
    println!("{answer}");
    Ok(())
}
```

Uncertainties in the snippet: the exact trait that supplies `.chat` and `.tool` (the examples import `rig::prelude::*` and it is assumed to cover it); whether `output()` returns `&str`; the `.client()` return type. All three are copied from working examples in the repo but combined by me. [unverified]

### Run it against the stub

Not run (no toolchain). How a developer would do it [unverified]: start `node server.mjs 8788 &` from `agents/frameworks/stub/`, then `OPENAI_BASE_URL=http://127.0.0.1:8788/v1 OPENAI_API_KEY=x OPENAI_MODEL=stub cargo run`. Then `curl http://127.0.0.1:8788/_log` should show two requests, the second with a tool-role message, and the program should print `It is 31 C and clear in Pune.` Using `.chat()` matters: the stub speaks Chat Completions and a non-streaming Responses API, while rig's default OpenAI route is Responses [source: `examples/litellm` comment]; both would probably work against the stub, but I did not test either. The rig Anthropic provider could be pointed at the stub's Anthropic route; the base-URL setter's name was not checked. [unverified]

### Features

**(a) Streaming.** `let mut s = agent.prompt("...").stream();` then `while let Some(item) = s.next().await` and match `MultiTurnStreamItem::StreamAssistantItem(...)` for text and `FinalResponse(r)` for the end [source: `examples/agent_stream_chat/src/main.rs`; item enum in `agent/streaming.rs`]. Marked [docs].

**(b) Memory across turns.** Two ways. Explicit: pass `.history(vec_of_messages)` to a prompt, extend your conversation with `reply.messages`, and persist with `rig::memory::save(&store, "id", &mut conversation)` [source: `examples/agent_with_memory`]. Automatic: `AgentBuilder::memory(store)` and `.conversation("id")` per prompt [source: builder doc comment, a doctest-style example]. Marked [docs].

**(c) Durable state, pause, resume, crash restart.** The strongest part of the design. `AgentRun` is serde-serialisable; the example writes it to JSON at `CallTools` and rebuilds it, and the resumed run "re-emits the pending tool calls purely from serialized state" [source: `examples/agent_with_durable_approval`]. Crash recovery means persisting the run after each step yourself, reloading, and calling `next_step()`. The `.memory(...)` store only saves the conversation after a run finishes; "a run that fails or is cancelled saves nothing" [source: builder doc]. [docs] A tool that ran but whose result was not recorded will run again on replay: your idempotency problem.

**(d) Human approval before a tool runs.** Two forms. (1) Inline hook: implement `AgentHook::on_dispatch` returning `DispatchAction::proceed()` or `DispatchAction::skip(reason)`, add with `AgentBuilder::add_hook(...)` [source: `examples/agent_with_approval_policy`; method names as listed in `agent/hook.rs`: `DispatchEvent`, `DispatchAction`]. (2) Durable approval: step `AgentRun` manually, write it out at `CallTools`, ask a human, answer with `ToolResult::skipped(reason)` for a denial, or run `tools.execute(&name, edited_args, &mut ToolContext::new())` for approve or edit [source: `examples/agent_with_durable_approval`]. The example's header says the gate "is a UX step, not a security boundary". Marked [docs].

**(e) Second tool and parallel tool calls.** `.tool(A).tool(B)`, or `.dynamic_tools(vec![...])` for runtime-defined `DynamicTool`s with a JSON schema and a closure [source: `examples/agent_with_tools`]. Parallel execution: `agent.prompt(p).tool_concurrency(4)` on the runner; default 1 [source: `runner.rs`]. Streams report results "in call order only after the whole batch succeeds" [source: same doc comment]. Marked [docs].

**(f) Calling an MCP server.** Enable feature `rmcp`. Connect an `rmcp` client, wrap it: `McpConnection::new(client_config("rig", env!("CARGO_PKG_VERSION")).serve(transport).await?)`, then `connection.tools().await?` mapped through `DynamicTool::try_from` into `.dynamic_tools(...)`; or `McpClientHandler::new(config, tool_server.clone()).connect(transport)`, which re-registers tools on `notifications/tools/list_changed` [source: `examples/rmcp/src/main.rs`]. MCP resources can feed context with `dynamic_context_handler(1, connection.resource_context([URI]))`. The workspace pins `rmcp = "3.9"` (the facade at `main`; `3.5` at the 0.46.0 tag) [source: `Cargo.toml` at both refs]. MCP support is "native-only" (not WASM) [source: `rig-rmcp/Cargo.toml` comment]. Marked [docs].

**(g) Structured output.** Two routes. `ExtractorBuilder::<T>::new(model).build()` then `extractor.extract(text).await?.output` where `T: Deserialize + JsonSchema` [source: `examples/extractor`]; and on the agent `AgentBuilder::output_schema::<T>()` plus `output_mode(...)` [source: `agent/builder.rs`]. Marked [docs].

**(h) Tracing.** Install `tracing-subscriber` (with an OpenTelemetry layer from the `opentelemetry-*` crates, which appear as dev-dependencies of `rig-core`) and rig emits GenAI-convention spans; content recording is opt-in [source: `rig-core/Cargo.toml`, `telemetry/mod.rs`, `examples/otel`]. Marked [docs].

**(i) Test without a real model.** Feature `test-utils`; `MockCompletionModel::from_turns([MockTurn::tool_call(id, "get_weather", args), MockTurn::text("...")])` as the model, then `model.requests()` and `request_count()` [source: `rig-core/src/test_utils/completion.rs`; a builder doc example uses `MockTurn::text`]. The full `tool_call` parameter list was not read. `rig-agent` also ships `test_utils::model_conformance` scenarios (parallel tools, invalid-tool recovery, cancellation, max turns), and `rig-cassette` replays recorded HTTP. [docs] existence, [unverified] usage.

## 4. Models and local models

- **Providers** under `rig_core::providers`: `anthropic`, `openai` (with Chat Completions and Responses routes), `gemini`, `cohere`, `mistral`, `ollama`, `llamacpp`, `deepseek`, `groq`, `together`, `openrouter`, `perplexity`, `xai`, `azure`, `huggingface`, `moonshot`, `zai`, `minimax`, `hyperbolic`, `venice`, `copilot`, `chatgpt`, and more; Bedrock, Vertex AI and Gemini over gRPC are separate crates. The README says "over 20 model providers and a dozen vector stores". [source: directory listing, README]
- **OpenAI-compatible endpoint.** `OpenAIConfig::new(key).with_base_url(url).client()` then `.chat(model)` (Chat Completions) [source: `examples/litellm`]; `OpenAI::from_env()` reads `OPENAI_API_KEY` and `OPENAI_BASE_URL` [source: `client/openai.rs`]. The Ollama provider uses Ollama's own OpenAI-compatible `/v1/chat/completions` route by default and offers `native_completion` for `/api/chat`, "the only route that sends model `options` such as `num_ctx`"; `from_env` reads `OLLAMA_API_BASE_URL` [source: `providers/ollama.rs` doc]. Default `OpenAI::completion(..)` uses the Responses API, which many local servers do not implement, so pick `.chat()` for vLLM and llama.cpp. [source for the default; my inference for the consequence]
- **In-process local models.** `rig-candle` (feature `candle`): `CandleModel::from_gguf(ModelData { config, tokenizer, weights })` or `from_safetensors_async`, then `model.completion()` as the agent's model; `examples/candle_local` streams from a GGUF file [source]. It receives byte buffers and "performs no filesystem or network access itself". Only three profiles are "validated" (Llama 3 instruct safetensors, SmolLM2-360M Q4_K_M, Qwen3-4B Q4_K_M with a Hermes-style tool protocol, native only) [source: `crates/rig-candle/README.md`]. That is a short supported list compared with what an Ollama server runs.
- **candle versus mistral.rs.** candle is Hugging Face's Rust tensor and inference library (`candle-core` 0.11.1, Apache-2.0, about 21k stars) and is rig's in-process engine, pinned at 0.11.1 [source: workspace `Cargo.toml`, GitHub API]. mistral.rs (MIT, about 7.8k stars; repo says v0.9.5 on 2026-10-19) is a separate inference engine that builds its own server and Rust and Python SDKs; its README says `mistralrs serve` exposes OpenAI-compatible `/v1` endpoints, Anthropic-compatible `/v1/messages`, Prometheus metrics and its own built-in agentic loop [docs: its README, fetched 2026-11-19; whether it is built on candle is not stated in what I read, [unverified]]. rig has **no mistral.rs integration** (nothing in the tree); to use mistral.rs from rig, run `mistralrs serve` and point rig's OpenAI `.chat()` at it. The crates.io `mistralrs` crate (0.8.1) lags the repository. [source]
- **Small and open models.** rig has per-provider "dialects" and a catalog; it decodes provider tool-call formats and validates arguments against the schema before running, which helps with small models that emit bad JSON: malformed arguments are reported back to the model for another try [source: durable-approval example comments; `validate.rs`]. `accept_unknown_finish_reasons` exists because some providers return finish reasons rig does not recognise [source: builder doc]. Structured output depends on the provider; a "Tool-mode output-tool" is used when native schema mode is unavailable [source: `agent/streaming.rs` doc]. I did not test any small model.

## 5. State, durability and concurrency

- **Representation.** Messages and tool calls are rig-core types (`Message`, `ToolCall`). The run is the `AgentRun` value (serde-serialisable): history, pending tool calls, turn counters, policy. Conversations are `rig::memory` logs with `load`/`save`, an append-only session format with compaction, fork and listing modules in `rig-memory` [source: `crates/rig-memory/src/` file names].
- **Where it lives.** In memory unless you supply a store: `MemoryStore`, `DirStore` for files, `rig-sqlite` and `rig-postgres` with feature `memory`, or any `AsyncStore` implementation [source].
- **What survives a crash.** Conversation saves happen at the end of a run; a failed or cancelled run saves nothing [source: builder docs]. To survive a mid-run crash you drive `AgentRun` yourself and write it after each step, as the durable example does. [docs]
- **Concurrency.** Tokio async. `tool_concurrency` defaults to 1. Two runs on the same conversation log conflict on save with `SessionError::Changed` (optimistic concurrency) [source].
- **Cancellation.** Drop the future or stop from a hook; no cancellation token API is exposed in the minimal path. Subprocess tools need their own handling. [unverified]
- **Threads.** Multi-threaded Tokio by default; the example `agent_no_tokio` shows a run without Tokio [source: directory name only].

## 6. What you still build yourself

| Need | What rig gives | You build |
|---|---|---|
| Permissions | `AgentHook::on_dispatch` allow/skip/patch; the examples' own warning says enforce in the tool | The policy engine, modes, persistent grants, audit |
| Sandboxing | Nothing in the library | Process control, OS sandbox, network policy |
| Context compaction | `rig-memory` compaction and token helpers | Policy and thresholds you trust |
| Read/write scheduling | A concurrency limit | Classification of tools; read-parallel, write-serial |
| Cost control | `usage` on responses; catalog with prices (`MockScript::priced_as` suggests a price catalog) | Budget accounting and stop |
| Evaluation | `rig-cassette` record/replay, conformance scenarios, an `agent_evaluator_optimizer` example | Your own test suite and benchmarks |
| Cross-version stability | Migration guide | Adapter layer around rig types |

## 7. Lock-in and escape hatches

Your code touches rig in these places: the `Tool` trait with associated types and the `ToolContext` parameter, the `AgentBuilder`/hook types, `Message` and history types, and `AgentRun` if you store it. The `Tool` trait changed in 0.45 (contextual tool trait) and `PortableTool`/`ErasedTool` were removed [source: `MIGRATING.md`], so even tool code is not stable across minors. Removing rig means rewriting provider clients and streaming decoders, which is the largest part of the library (twenty-plus providers). A plain-loop Rust implementation of the reference loop on `reqwest` plus `serde_json` plus `rmcp` is a few hundred lines for one or two providers; I estimate that, I did not write it. The sans-IO `AgentRun` design is itself an argument: its shape is the shape you would write. If you want an escape hatch, keep a thin `trait Model { async fn complete(&self, ...) -> ... }` of your own and implement it once over rig. [unverified, judgment]

## 8. Pitfalls

1. **Churn is the main risk.** One minor release about every two to three weeks in 2026, each with a migration section, some very long (the 0.42-to-0.43 and 0.43-to-0.44 sections together run about 1,300 lines of the 3.7k-line guide) [source: `MIGRATING.md` line numbers, my count]. Budget a migration per upgrade or freeze.
2. **Toolchain.** Rust 1.97.1 minimum [source]. A pinned CI image is mandatory; distribution package managers will not have it.
3. **Default features pull the coding agent.** `rig`'s default feature list is `rig-core/default, reqwest, agent, derive, rustls, cli`; `cli` brings the `rig-cli` launcher crate, whose workspace pins the Bevy game engine `=0.20.0` for its plugin system [source: `Cargo.toml`; `MIGRATING.md` line "Rust 1.97.1 and Bevy =0.20.0 are unchanged"]. For a library, set `default-features = false` and enable what you need, or depend on `rig-core` and `rig-agent` directly. Compile-time and dependency-tree effects were not measured.
4. **Project scope drift.** Since 0.46 the repository is both an LLM library and a terminal coding agent with a plugin ABI (new crates `rig-mcp-client`, `rig-acp`, `rig-traffic`, `rig-claude-cloak`). Attention and release notes are split. "Mostly a coding-agent release" is how the migration guide describes 0.46. [source] A crate called `rig-claude-cloak` exists; I did not inspect what it does. Treat it as an unreviewed dependency if you ever enable it.
5. **Default OpenAI route is Responses**, not Chat Completions. Local servers may not implement it [source: `examples/litellm` comment].
6. **Tool concurrency defaults to one.** Parallel tool calls in one model turn run in sequence unless you opt in [source: `runner.rs`].
7. **Hooks and policy are not security.** The repository's own examples say so [source].
8. **Hidden behaviours.** Tool errors from arbitrary source errors receive "safe model feedback by default" (the model sees a generic message, not your error text) [source: `rig-agent/src/tool/mod.rs` header comment]; retry-on-transient-failure is a separate example (`retry_transient_failures`), suggesting it is opt-in; I did not check default retry counts. [unverified]
9. **docs.rs and docs drift.** The README for the coding agent says "Until the next release it is 0.46.0"; its guide link points at the tag, meaning `main` documentation describes unreleased behaviour. Read docs at your pinned tag. [docs: README]
10. **No official Anthropic Rust SDK.** Anthropic's client SDK page lists Python, TypeScript, C#, Go, Java, PHP and Ruby; Rust is not among them [docs: `https://platform.claude.com/docs/en/api/client-sdks.md`]. rig's `anthropic` provider is therefore a third-party client, not one from Anthropic. Compare the MCP SDK page, where Rust is Tier 1 [docs: `https://modelcontextprotocol.io/docs/sdk.md`].

## 9. Choose it when / avoid it when

**Choose rig when** your product is already Rust, you want one trait over many providers (including Bedrock and Vertex), vector-store integrations, a serialisable steppable run (`AgentRun`), OpenTelemetry GenAI spans, and you accept migrating every few weeks or pinning a version and staying on it. The durable-approval design is a good reference even if you do not adopt the crate.

**Avoid it when** you need a stable API, an older toolchain, minimal compile time and dependency count, or a mature permission and sandbox layer (none). Also avoid it as the base of a long-lived runtime without a wrapper layer.

**Versus writing the loop yourself (about 100 lines).** What rig buys: provider wire formats and streaming decoders for 20+ providers, argument validation, memory stores, tracing spans, record-and-replay test tooling, a serialisable run. What it costs: weekly-scale API churn, a 1.97.1 toolchain floor, a large feature matrix, and a project whose attention is now partly a coding-agent product. **Recommendation, as judgment:** for a runtime you must own and maintain for years, write the loop in Rust over `reqwest` and `serde_json` for your one or two providers (OpenAI-compatible endpoints cover Ollama, vLLM and llama.cpp), and use the official MCP crate `rmcp` (3.11.0, Tier 1) directly. There is no official Anthropic Rust SDK, so the Messages API is a thin hand-written client: one request type, one SSE decoder. Keep rig in view as a source of design ideas (sans-IO `AgentRun`, schema validation before dispatch, optimistic concurrency on session saves) or as a prototyping tool. If you want rig anyway, depend on `rig-core` plus `rig-agent` with defaults off and pin the exact version. This is not measured; I wrote no code in either approach.

## 10. What was verified

| Item | Status |
|---|---|
| Rust toolchain installed | No. Nothing compiled or run. |
| Crates installed | None. |
| Version histories | Read live from the crates.io API: `rig-core` (all stable versions and dates), `rig`, `rig-rmcp`, `rig-candle`, `rmcp`, `candle-core`, `mistralrs`; dependencies of `rig-core` 0.46.0; GitHub releases for mistral.rs; GitHub API for stars and licences. |
| Sources read | Shallow clone of `0xPlaygrounds/rig` main (HEAD of 2026-11-19; workspace version still 0.46.0) and the raw files at tag `v0.46.0` for two examples: `README.md`, `MIGRATING.md` headings and the 0.45-to-0.46 and 0.44-to-0.45 intros, root `Cargo.toml`, `crates/rig-agent/src/agent/{builder,runner,hook,streaming}.rs`, `crates/rig-core/src/tool/validate.rs`, `crates/rig-core/src/test_utils/completion.rs`, provider module headers for OpenAI, Ollama and the litellm example, `crates/rig-candle/README.md`, `crates/rig-cassette/README.md`, and these examples: `agent_with_tools`, `agent_with_durable_approval`, `agent_with_approval_policy`, `agent_with_memory`, `agent_stream_chat`, `extractor`, `rmcp`, `candle_local`, `litellm`, `agent`. |
| Docs pages fetched | `https://modelcontextprotocol.io/docs/sdk.md` (Rust is Tier 1), `https://platform.claude.com/docs/en/api/client-sdks.md` (no Rust SDK listed), mistral.rs README. `docs.rs/crate/rig-core/0.46.0` returned HTTP 200; its content was not read. |
| Stub server | Not started; the stub steps in section 3 are untested. |
| Could not check | Whether the minimal program compiles; the minimal feature set for `rig`; cancellation cleanup; default retry behaviour; mid-tool crash safety of `AgentRun`; compile times and binary size; behaviour with any small or open model; whether mistral.rs is built on candle; the Bevy dependency's presence in a library build (only the workspace pin was read); the changelog contents; the third-party provider-quality ranking. |
