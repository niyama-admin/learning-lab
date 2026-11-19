# Claude Agent SDK

A Python and TypeScript library that runs Claude Code's own agent loop as a bundled native subprocess and lets your program drive it: send prompts, receive streamed messages, supply custom tools, hooks and permission callbacks.

| Field | Value |
|---|---|
| Covers | `claude-agent-sdk` 0.2.185 (Python, bundles Claude Code CLI 2.1.328) and `@anthropic-ai/claude-agent-sdk` 0.3.328 (TypeScript) |
| Profile date | 2026-11-19 |
| Verified by | Installed both, ran the minimal agent through the real bundled binary against the stub server (Python and TypeScript), plus hook, permission-deny and session-resume checks in Python |
| Related reading | [Dive into Claude Code](../../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md) studies the architecture this SDK embeds |

Evidence labels: **[ran]**, **[docs]**, **[source]**, **[secondary]**, **[unverified]** as defined in the profile spec.

## Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version, Python | 0.2.185, uploaded 2026-11-19 (a few hours before this profile). Prior: 0.2.184 (11-18), 0.2.183 (11-16), 0.2.182 (11-13), 0.2.181 (11-12), 0.2.180 (11-09). 157 releases on PyPI | [ran] pip install; dates from `https://pypi.org/pypi/claude-agent-sdk/json` |
| Current version, TypeScript | 0.3.328, published 2026-11-18. Prior: 0.3.327 (11-17), 0.3.326 (11-16), 0.3.325 and 0.3.324 (11-13) | [ran] npm install; dates from `npm view @anthropic-ai/claude-agent-sdk time` |
| Bundled engine | Both packages ship the same native Claude Code binary: Python wheel `_bundled/claude` is 354,630,016 bytes, reports `2.1.328 (Claude Code)`; TS gets it from an optional dependency `@anthropic-ai/claude-agent-sdk-darwin-arm64` | [ran] `claude --version`, file listing |
| License | Python metadata says MIT, but the wheel contains the proprietary binary. TypeScript says `SEE LICENSE IN README.md`, which says "All rights reserved. Use is subject to the Legal Agreements". The docs say use is governed by Anthropic's Commercial Terms of Service, "except to the extent a specific component or dependency is covered by a different license". Treat it as source-available vendor software, not open source | [source] package metadata; [docs] `https://code.claude.com/docs/en/agent-sdk/overview` |
| Maintainer and governance | Anthropic, single vendor. Repositories `anthropics/claude-agent-sdk-python` and `anthropics/claude-agent-sdk-typescript` host issues and changelogs; the engine itself is not open source | [docs] overview page |
| Languages | Python (>=3.10) and TypeScript (Node >=18.14). Any other language: run the CLI as a subprocess with `-p` and `--output-format json` | [docs] overview; [source] `package.json` |
| Docs | `https://code.claude.com/docs/en/agent-sdk/overview` (the old `platform.claude.com/docs/en/agent-sdk` URL redirects there) | [ran] 307 redirect observed |
| Cadence | Near daily releases, mostly tracking Claude Code CLI releases (SDK minor and the bundled CLI version move together) | [ran] release dates above |
| Breaking-change history | Renamed from "Claude Code SDK" at v0.1.0: package `claude-code-sdk` to `claude-agent-sdk`, `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`, `ClaudeCodeOptions` to `ClaudeAgentOptions`; the Claude Code system prompt stopped being the default (must request preset `claude_code`); a change to not load filesystem settings by default was made and then reverted, so omitting `settingSources` loads user, project and local settings again. Python 0.1.59 and earlier treated `setting_sources=[]` like omitting it. No 1.0 yet, so there are no "major versions" to compare | [docs] `https://code.claude.com/docs/en/agent-sdk/migration-guide` |
| Status | Active, vendor's primary agent-embedding product. Anthropic also sells hosted "Managed Agents" and a lower-level Client SDK with tool runner as alternatives | [docs] overview comparison table |

## What it is, in terms of the runtime loop

The SDK is not a loop implementation. It is a process controller around the Claude Code binary, which contains the loop, the built-in tools, the permission system, the session store, compaction, hooks, skills and MCP client. [ran] and [source]: the Python transport builds `[<path-to-claude>, "--output-format", "stream-json", "--verbose", ..., "--input-format", "stream-json"]` and talks newline-delimited JSON over the child's stdin and stdout (`_internal/transport/subprocess_cli.py` lines 523 and 742). Your `query()` call spawns that child, forwards your options as flags and environment, and yields the messages it prints. Custom tools you define in your process (`create_sdk_mcp_server`) are exposed to the child as an in-process MCP server over the same pipe; hook and permission callbacks are control requests the child sends back to you [source] `_internal/query.py`, `sdk_mcp_bridge.py`. Compared with the loop in the repository's reference ([languages treatise, section 8](../../languages/README.md#8-a-language-neutral-reference-specification)) and the architecture studied in [Dive into Claude Code](../../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md), this is the same system: the SDK gives you the studied harness as a black box with a control channel, not a toolkit of loop parts.

| # | Runtime duty | Status | API name |
|---|---|---|---|
| 1 | Stream from the model | Provided | `query()` yields typed messages; `include_partial_messages=True` / `includePartialMessages` adds token stream events [source] `types.py` line 2653 |
| 2 | Loop as state machine | Provided, opaque | Inside the binary. You observe `AssistantMessage`, `UserMessage` (tool results), `SystemMessage`, `ResultMessage` (subtype, `num_turns`, cost, `session_id`) and bound it with `max_turns`, `max_budget_usd` [source] `types.py` |
| 3 | Validate args, generate schemas | Provided | `@tool(name, description, schema)` takes a dict of Python types or a full JSON Schema; TS takes a Zod shape. Built-in tools are validated in the binary [ran] |
| 4 | Concurrent tools, cancellation | Provided | Inside the binary (read-only tools in parallel per the studied design); interrupt via `ClaudeSDKClient.interrupt()` / `query.interrupt()` [docs]; not stress-tested [unverified] |
| 5 | Sandboxed execution | Partly | `sandbox` option for the Bash tool (macOS and Linux, default off, network and path allow lists) [source] `types.py` lines 1152-1240; not run. Your own custom tools are unsandboxed in your process |
| 6 | Context assembly, compaction | Provided | Automatic compaction, CLAUDE.md and `.claude/` loading via `setting_sources`, `system_prompt` preset or string [docs]; not exercised here |
| 7 | Session persistence | Provided | JSONL transcripts under `$CLAUDE_CONFIG_DIR/projects/<cwd-slug>/<session-id>.jsonl`; `resume=`, `fork_session`, `continue_conversation`; pluggable `SessionStore` protocol with an in-memory reference store [ran] files; [source] `types.py` line 2066 |
| 8 | Permissions | Provided | `permission_mode` (`default`, `acceptEdits`, `plan`, `bypassPermissions`, `dontAsk`, `auto`), `allowed_tools`, `disallowed_tools`, `can_use_tool` callback, hooks [source] `types.py` line 25; callback and hooks [ran] |
| 9 | Extension | Provided | MCP (stdio, HTTP, SSE and in-process SDK servers), hooks, subagents (`agents={...}`), skills, slash commands, plugins by local path [docs] overview; MCP in-process [ran] |
| 10 | Observability | Partly | Cost and duration on `ResultMessage` and per-session `cost-state` records in the transcript [ran]; OpenTelemetry trace context passthrough mentioned in `types.py` line 2591 [source]. No hosted trace UI |
| 11 | Packaging | Heavy | 354 MB binary in each install: `cl-py` site-packages 393 MB, `cl-ts` node_modules 415 MB [ran]; one subprocess per query |
| 12 | Local models | Not supported | Needs an Anthropic Messages-compatible endpoint; see Models |

## Implement it

### Install and minimal agent

```bash
# Python (executed): resolved to claude-agent-sdk 0.2.185, bundled CLI 2.1.328, on Python 3.15.2
python3 -m venv .venv && .venv/bin/pip install claude-agent-sdk
# TypeScript (executed): resolved to @anthropic-ai/claude-agent-sdk 0.3.328, zod 4.6.7, Node 26
npm install @anthropic-ai/claude-agent-sdk zod
```

No separate Claude Code installation is needed: the wheel and the npm optional dependency carry the binary. The exceptions the docs name are source-distribution pip installs (for example ARM64 Windows) and `npm ci --omit=optional` [docs] quickstart page.

Python, executed against the stub with the real bundled binary (language: Python, [ran]). The agent is 25 lines; the environment variables are shown below it.

```python
import asyncio
from claude_agent_sdk import (query, tool, create_sdk_mcp_server, ClaudeAgentOptions,
                              AssistantMessage, ResultMessage, ToolUseBlock)

# The stub sends {} for a tool whose name is not exactly "get_weather" (SDK names it
# mcp__wx__get_weather), so "city" is declared optional. A real model would send it.
@tool("get_weather", "Return the current weather for a city.",
      {"type": "object", "properties": {"city": {"type": "string"}}})
async def get_weather(args):
    return {"content": [{"type": "text", "text": "31 C and clear"}]}

server = create_sdk_mcp_server(name="wx", tools=[get_weather])
opts = ClaudeAgentOptions(
    mcp_servers={"wx": server},
    allowed_tools=["mcp__wx__get_weather"],   # pre-approve this tool
    tools=[],                                  # no built-in tools (Read, Bash, ... removed)
    setting_sources=[],                        # do not read ~/.claude or project settings
    system_prompt="Use tools to answer.",
    max_turns=4,
    model="stub-model",
)

async def main():
    async for m in query(prompt="What is the weather in Pune?", options=opts):
        if isinstance(m, AssistantMessage):
            for b in m.content:
                if isinstance(b, ToolUseBlock): print("tool_use:", b.name)
        if isinstance(m, ResultMessage): print("final:", m.result, "| turns:", m.num_turns)

asyncio.run(main())
```

Environment used for the run (all of these are real variables the binary reads; I used a throwaway config directory so nothing touched a real account):

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8102      # the stub (no /v1: the binary appends /v1/messages)
export ANTHROPIC_API_KEY=stub-key                    # fake
export CLAUDE_CONFIG_DIR=$PWD/cfg                    # isolated config and session store
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 DISABLE_AUTOUPDATER=1
export ENABLE_TOOL_SEARCH=false                      # see note below
```

TypeScript, executed (language: JavaScript ES module, [ran]):

```javascript
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const getWeather = tool('get_weather', 'Return the current weather for a city.',
  { city: z.string().optional() },            // optional only because the stub sends {}
  async () => ({ content: [{ type: 'text', text: '31 C and clear' }] }));
const wx = createSdkMcpServer({ name: 'wx', tools: [getWeather] });

for await (const m of query({
  prompt: 'What is the weather in Pune?',
  options: { mcpServers: { wx }, allowedTools: ['mcp__wx__get_weather'], tools: [],
             settingSources: [], systemPrompt: 'Use tools to answer.', maxTurns: 4, model: 'stub-model' },
})) {
  if (m.type === 'assistant') for (const b of m.message.content) if (b.type === 'tool_use') console.log('tool_use:', b.name);
  if (m.type === 'result') console.log('final:', m.result, '| turns:', m.num_turns);
}
```

### Run it against the stub

Both programs ran with the real 354 MB binary talking to the stub's Anthropic Messages endpoint [ran].

- Python output: `tool_use: mcp__wx__get_weather` then `final: It is 31 C and clear in Pune. | turns: 2`. A stderr line `[claude-code:unrecognized_model] {"model":"stub-model",...}` appears because the model name is not a Claude model; it is a warning, not a failure [ran].
- TypeScript output: identical two lines [ran].
- `GET /_log` showed two requests to `/v1/messages?beta=true`, model `stub-model`, tool list `['mcp__wx__get_weather']`, with 2 then 4 messages (the second includes the tool result): the tool round trip [ran]. The tool handler really ran in my process: I had it append to a file and the file was created with `{}` as arguments (the stub sends `{}` for tool names it does not recognise) [ran].
- Note on first attempt: without `ENABLE_TOOL_SEARCH=false` the binary sent a `DeferredToolPlaceholder` tool in front of mine (its deferred tool loading), the stub picked that, and the run finished without calling my tool. Real models handle this; with a minimal stub, disable it [ran].

### Feature checks

**(a) Streaming [docs; partially ran].** The default iteration already streams complete messages as each assistant turn and tool result arrives [ran]. Token deltas: `ClaudeAgentOptions(include_partial_messages=True)` / TS `includePartialMessages: true` emits stream events [source] `types.py` line 2653; not run.

**(b) Memory across turns [ran for the id, docs for the rest].** Every `ResultMessage` carries `session_id`. Pass `resume=session_id` to continue; I did so and got the same id back [ran]. For interactive multi-turn use, `ClaudeSDKClient` (Python) holds one session open and takes `query()` repeatedly [docs] `https://code.claude.com/docs/en/agent-sdk/sessions`. The transcript is a 30-line JSONL file per session, with record types `user`, `assistant`, `attachment`, `api-request`, `tools-used`, `cost-state`, `last-prompt`, `mode` [ran]. I did not inspect the content of the resumed turn's reply.

**(c) Durable state [partly ran].** Sessions persist to JSONL on disk by default, so a restart can `resume` by id [ran for id round trip; kill-and-restart not tested]. For servers where disk is ephemeral, implement the `SessionStore` protocol (Python: `SessionStore`, `InMemorySessionStore`, a conformance test in `claude_agent_sdk.testing`) and pass `session_store=` [source]. There is no workflow engine; durability is the transcript. Per the studied paper, permission grants are not restored on resume [docs/secondary: the repository guide, not re-verified here].

**(d) Human approval before a tool runs [ran, Python].**

```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher, PermissionResultAllow, PermissionResultDeny
async def gate(name, args, ctx):
    return PermissionResultDeny(message="blocked by policy")     # or PermissionResultAllow()
async def pre(inp, tool_use_id, ctx):
    print("PreToolUse", inp["tool_name"]); return {}
opts = ClaudeAgentOptions(mcp_servers={"wx": server}, tools=[], setting_sources=[], model="stub-model",
    hooks={"PreToolUse": [HookMatcher(hooks=[pre])]}, can_use_tool=gate)   # no allowed_tools: ask path
```
Observed sequence on allow: `PreToolUse`, `can_use_tool`, handler ran, `PostToolUse`. On deny: `PreToolUse`, `can_use_tool`, and the handler never ran [ran]. In TS the callback is `canUseTool` and hooks are in `options.hooks` [docs]. The callback is where you put a UI prompt; the child waits for your return. Modes (`plan`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `auto`) set the default behaviour; the evaluation order is rules then mode then callback per the docs' "How permissions are evaluated" page [docs] `https://code.claude.com/docs/en/agent-sdk/permissions`.

**(e) Second tool and parallel calls [docs].** Add more `@tool` functions to the same `create_sdk_mcp_server`. Parallel calls are issued by the model and scheduled inside the binary. The stub emits one call, so I could not exercise parallelism [unverified].

**(f) MCP [ran for in-process; docs for external].** In-process SDK server shown above. External servers go in `mcp_servers={"name": {"command": ..., "args": [...]}}` (stdio) or `{"type": "http", "url": ...}` / `"sse"`; tool names become `mcp__<server>__<tool>` [ran for naming; docs for config shapes] `https://code.claude.com/docs/en/agent-sdk/mcp`.

**(g) Structured output [docs; not run].** `output_format={"type": "json_schema", "schema": ...}` (TS `outputFormat`); the result arrives as `structured_output` on the result message, and the troubleshooting page covers "a result arrives without structured output" [source] `types.py` line 2748 and [docs] quickstart links. The stub cannot produce schema-conforming JSON, so not run.

**(h) Tracing and observability [partly ran].** Cost totals, duration and `session_id` come on `ResultMessage` and in `cost-state` transcript rows [ran]. Hooks give you a full event feed (PreToolUse, PostToolUse and others) for your own logging [ran for two]. OpenTelemetry context passthrough exists [source]; exporting traces from the binary is configured through its settings and environment [unverified: not read].

**(i) Test the agent without a real model [ran].** There is no scripted model class. The supported seam is the network: point `ANTHROPIC_BASE_URL` at a fake Messages server, which is exactly what the stub did, and assert on its request log. The `claude_agent_sdk.testing` package contains only the `SessionStore` conformance suite [source]. Test your custom tools and hooks as plain functions; test the loop only through the fake server. Expect the binary's extra traffic (system reminders, deferred-tool placeholder) in any fake you write.

**Subagents [docs; not run].** `agents={"reviewer": AgentDefinition(description=..., prompt=..., tools=[...], model=...)}`; the main agent delegates through the `Task`/Agent tool and each subagent gets a fresh context [source] `types.py` line 108; [docs] `https://code.claude.com/docs/en/agent-sdk/subagents`. The stub cannot choose to delegate, so I did not run it.

## Models and local models

- Default path: Anthropic API with `ANTHROPIC_API_KEY`. Cloud providers: `CLAUDE_CODE_USE_BEDROCK=1` plus AWS credentials; `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` with `ANTHROPIC_AWS_WORKSPACE_ID`; `CLAUDE_CODE_USE_VERTEX=1` plus Google Cloud credentials; `CLAUDE_CODE_USE_FOUNDRY=1` plus Azure credentials [docs] `https://code.claude.com/docs/en/agent-sdk/quickstart`. Not run: no cloud credentials and I would not use real ones.
- Custom base URL: `ANTHROPIC_BASE_URL` works [ran], pointing at a server that speaks the Anthropic Messages format (streaming SSE). The gateway docs say any gateway exposing a supported API format works, but "Anthropic doesn't support routing Claude Code to non-Claude models through any gateway" [docs] `https://code.claude.com/docs/en/llm-gateway`. So an Ollama, vLLM or llama.cpp model behind an Anthropic-format shim (LiteLLM and similar translate OpenAI-style servers to `/v1/messages`) may run, but it is unsupported, and I only proved the plumbing with a fake server, not tool-calling quality of any real open model [unverified].
- Open models are likely a poor fit: the binary assumes Claude behaviours (large tool set, deferred tool search, thinking blocks, cache hints). Small models will degrade; no measurement [unverified, inference].
- Model names: the binary warns `unrecognized_model` for non-Claude names but continues [ran]; `fallback_model` and `max_budget_usd` options exist [source].
- Login: Anthropic states third parties may not offer claude.ai login or its rate limits in their products without prior approval; use API-key or cloud-provider auth [docs] overview.
- Evidence summary: Anthropic and its three clouds are first-class; any other vendor is unsupported. This is the opposite of the OpenAI Agents SDK profile, where the loop is vendor-neutral and the hosted tools are not.

## State, durability and concurrency

- Where state lives: the child process holds the live conversation; the transcript JSONL under the config directory is the durable record; permission rules and settings come from `settings.json` files and your options [ran, docs].
- Crash behaviour: if your Python process dies, the child's stdin closes and it exits [unverified]; the transcript up to the last completed message remains and can be resumed by id. Mid-tool-call recovery was not tested.
- Concurrency model: Python uses `anyio` asyncio streams to one subprocess per `query()` (`ClaudeSDKClient` keeps one process across turns); TS uses Node child-process streams. Many concurrent sessions means many 350 MB-binary processes; budget memory and file descriptors accordingly, and use `startup()`/`prewarm()` helpers in TS to hide launch cost [source] README (names only; effect not measured).
- Cancellation: `interrupt()` on the client; abort controllers in TS [docs]. Tool cancellation semantics and child cleanup were not tested.
- Isolation: `CLAUDE_CONFIG_DIR` and `cwd` partition sessions per tenant; without `setting_sources=[]` the process loads the host's `~/.claude/settings.json` and project `CLAUDE.md` files, a multi-tenant leak risk the docs call out [docs] migration guide.

## What you still build yourself

| Need | What the SDK gives toward it |
|---|---|
| Hosting and sandbox for the whole agent | Docker and cloud hosting guide [docs `agent-sdk/hosting`, not read]; the Bash `sandbox` option; but the whole child runs with your user's file access if you leave built-in tools on |
| Per-tenant isolation | `cwd`, `CLAUDE_CONFIG_DIR`, `setting_sources=[]`, `SessionStore` |
| Policy beyond modes | `can_use_tool`, hooks with allow/deny/modify returns, `disallowed_tools` |
| Cost control | `max_budget_usd`, `max_turns`, cost on results |
| Evaluation | Nothing: use a fake server or real runs and score outputs yourself |
| Non-Claude models | Not supported; you would build a different loop |
| UI for approvals and progress | Messages and callbacks only |
| Version management of the 350 MB engine | You pin the SDK; the engine moves with it, daily |

## Lock-in and escape hatches

- Vendor lock-in surface, precisely: (1) the engine is closed source and only distributed inside the SDK; the SDK is a control protocol around it, so you cannot fix or fork the loop; (2) models: Claude only (Anthropic API, Bedrock, Vertex, Foundry, Claude Platform on AWS); (3) behaviour is defined by the binary version (prompts, tool descriptions, compaction), which changes with each SDK release; (4) the on-disk session format is the CLI's transcript format, not a published schema [unverified that no schema is published]; (5) licensing: Commercial Terms and branding rules (may not call your product "Claude Code"), plus the login restriction above [docs].
- What is portable: MCP servers (any MCP client), custom tool handlers (plain functions), hook logic, CLAUDE.md and skills content (plain files, readable by Claude Code itself).
- Removal cost: replacing the SDK means writing the loop, tools, permission engine, compaction and session store yourself. The loop is about 100 lines; Bash, file edit, search and permission rules are the large part, and compaction and skills loading add more. That is the Claude Code architecture's whole body of work, which the [repository guide](../../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md) reports is mostly harness, not the loop. Estimate weeks to months for parity of file tools, shorter if you only need a subset.
- Migration stories: Anthropic documents moving from the Claude Code SDK (rename) [docs] and publishes a cookbook recipe for migrating from the OpenAI Agents SDK [docs, link only, not read]. Independent experience reports not collected.

## Pitfalls

1. **Heavy runtime.** 354 MB binary per install, one child process per session; container images and cold starts grow [ran sizes].
2. **Defaults load the host's configuration.** Omitting `setting_sources` loads `~/.claude/settings.json`, project settings and CLAUDE.md [docs]. Always pass `[]` in services and tests. Python 0.1.59 and earlier ignored an empty list [docs].
3. **Very fast churn.** The Python SDK shipped six releases in the ten days to 2026-11-19; the bundled engine updates with them [ran]. Pin exact versions and re-run your fake-server tests on each bump. Auto-updater: set `DISABLE_AUTOUPDATER=1` [env var name from the binary's behaviour in my run; effect not isolated, so partly unverified].
4. **Hidden prompts and extras.** The default system prompt is minimal since 0.1.0, but the binary still injects system reminders, attachments and its own tool list into each request [ran]. Your token bill and your fake server both see them.
5. **Deferred tool placeholder.** The binary may send a tool-search placeholder first (`ENABLE_TOOL_SEARCH=false` removes it) [ran]. Behaviour that depends on tool-list order or count in a fake server breaks.
6. **Custom tool argument errors.** My handler received `{}` when the fake model sent no arguments; with a required schema the call was rejected before my handler ran (first attempt created no file) [ran]. Treat schemas as the contract.
7. **Non-Claude models are unsupported** even where plumbing works [docs].
9. **Two TS entry points.** The README documents a `/core` entry that must not be mixed with the root import in one process [source].

## Choose it when / avoid it when

Choose it when:
- The agent is a coding or file-system agent (read, edit, search, run commands) and you want Claude Code's tool set, permission modes, sessions, skills, subagents and compaction without building them.
- You are Claude-only (or Claude via Bedrock, Vertex or Foundry) and a 350 MB subprocess per session is acceptable.
- You want approvals and policy as callbacks and hooks on top of a mature permission system.
- You need CLAUDE.md, skills and plugin compatibility with the Claude Code your developers already use.

Avoid it when:
- Open or local models are a requirement (the product premise in the repository's open-model notes): the SDK offers no supported path.
- You need a small, auditable, fully owned loop, or a footprint under tens of megabytes.
- You need step-level durable workflows or exactly-once tool execution; transcripts are not a workflow log.
- You must modify loop behaviour (retry policy, compaction, tool scheduling): they sit inside a closed binary.

Versus writing the loop yourself (about 100 lines): the SDK buys the part that is not the loop: file and shell tools, permission modes and rules, session transcripts and resume, compaction, MCP, subagents, skills. It costs closed-source engine behaviour you cannot change, daily churn, a large footprint, Claude-only models and licence terms. If your runtime's value is in those harness parts, hiring the SDK is a build-versus-buy decision, not a convenience: you inherit Claude Code's design, including defaults that were designed for an interactive developer terminal.

## What was verified

| Item | Result |
|---|---|
| Installed | Python 3.15.2 venv: `claude-agent-sdk` 0.2.185 (bundled CLI `2.1.328 (Claude Code)`, 354,630,016 bytes). Node v26.12.0: `@anthropic-ai/claude-agent-sdk` 0.3.328 with `@anthropic-ai/claude-agent-sdk-darwin-arm64`, `zod` 4.6.7 |
| Ran: minimal agent | Python and TypeScript, real binary against the stub's Anthropic endpoint, no real key; output `It is 31 C and clear in Pune.`, 2 turns; `/_log` shows two `/v1/messages?beta=true` requests with the tool and its result; handler side effect confirmed |
| Ran: features | Hooks (PreToolUse, PostToolUse), `can_use_tool` allow and deny (handler skipped on deny), session id on resume, transcript file inspection, `tools=[]` and `setting_sources=[]` isolation |
| Read only | Overview, quickstart, migration guide and gateway docs; package metadata; `types.py`, `subprocess_cli.py`; README |
| Could not check | Real Claude models, Bedrock, Vertex, Foundry, other providers, subagents, structured output, partial-message streaming, interrupt, sandbox option, crash recovery, parallel tools, external MCP servers, startup cost, and the `agent-sdk/hosting` and `permissions` docs pages in full |
