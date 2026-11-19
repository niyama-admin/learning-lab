# Framework profile spec

Purpose: let someone **implement** with a framework, or decide not to, without reading its documentation first. A profile is not a feature list. It answers: what is the core abstraction, what do I write to get a working agent, what do I get for free, what must I still build myself, and what will hurt later.

All profiles describe the framework **as of 2026-11-19**. Frameworks churn; every profile states the version it covers and how each fact was verified.

## Evidence labels (use on every non-obvious claim)

- **[ran]** - you executed it in this session and saw the result (install, skeleton, a feature).
- **[docs]** - read from the official documentation or repository on the date above (give the URL).
- **[source]** - read from the source code or package metadata (give the path or URL).
- **[secondary]** - blog, news, aggregator or a comparison site. Weakest. Say so.
- **[unverified]** - recalled or inferred; flag it plainly. Do not present it as fact.

Never invent a version number, release date, API name, star count or benchmark. If you cannot confirm it, say "not verified".

## Required sections, in this order

`# <Framework>` then a one-line description and a front-matter-free header table. Then:

1. `## Snapshot` - table: current version and release date, license, maintainer and governance, languages supported (and their relative maturity), repository URL, docs URL, release cadence and breaking-change history (find the last two major versions and what broke), and status (active, maintenance, deprecated, successor named). Evidence label per row.
2. `## What it is, in terms of the runtime loop` - one paragraph plus a table mapping the framework's concepts onto these twelve duties of an agent runtime (from [languages treatise, section 2](../languages/README.md#2-what-a-runtime-layer-actually-does)): stream from the model, run the loop as a state machine, validate tool arguments and generate schemas, concurrent tools with cancellation, sandboxed execution, context assembly and compaction, session persistence, permissions, extension (MCP, plugins, hooks), observability, packaging, local-model integration. For each: **provided / partly provided / you build it**, with the API name.
3. `## Implement it` - the heart of the profile.
   - **Install and minimal agent.** The exact install command and a complete, copy-pasteable program that creates one agent with the tool `get_weather(city: str) -> str` (returns `"31 C and clear"`), runs it on the prompt "What is the weather in Pune?", and prints the final answer. Under 60 lines.
   - **Run it against the stub** (below) for Python and TypeScript/JavaScript frameworks. Report [ran] with the exact output, or say precisely why it could not run (install failure, unsupported interpreter, needs a real key, and so on) and mark the snippet [unverified]. Do not paste code you did not run as if it were tested.
   - **Then, for each of these, say how and show the smallest snippet or the API name and docs URL:** (a) streaming output, (b) conversation or session memory across turns, (c) durable state: pause, resume, restart after a crash, (d) human approval before a tool runs, (e) a second tool and parallel tool calls, (f) calling an MCP server, (g) structured (typed) output, (h) tracing or observability, (i) a test of the agent without a real model. Mark each [ran], [docs] or [unverified]. Where a feature does not exist, write "not provided" and say what you would build.
4. `## Models and local models` - how to point it at a different provider, at an OpenAI-compatible endpoint (Ollama, vLLM, llama.cpp server), and at a local model. Which providers are first-class and which are second-class. Known problems with small or open models: tool-call formats, structured output, retries. Evidence labelled.
5. `## State, durability and concurrency` - how state is represented and where it lives, what survives a crash, how concurrency and cancellation work, and the threading or async model.
6. `## What you still build yourself` - an honest list (permissions, sandboxing, context compaction, cost control, evaluation, and so on) with what the framework gives you toward each.
7. `## Lock-in and escape hatches` - how much of your code is the framework's types; how hard it is to remove; whether a plain-loop reimplementation of what you used is small or large; observed migration stories (labelled).
8. `## Pitfalls` - concrete problems an implementer meets: version churn, hidden prompts and defaults, silent retries, token overhead, debugging difficulty, documentation gaps. Each with evidence or a label.
9. `## Choose it when / avoid it when` - concrete conditions, not adjectives. Include the comparison against **writing the loop yourself** (about 100 lines; see the [language-neutral reference specification](../languages/README.md#8-a-language-neutral-reference-specification)): what the framework buys, what it costs.
10. `## What was verified` - a table: what you installed, versions, what you ran, the stub results, what you only read, what you could not check.

## Style

- Plain English, implementation-first. Define a term before using it and expand abbreviations.
- Customer-neutral: no customer names, no private data.
- No marketing language. If the project's own docs claim something, attribute it ("the docs claim") unless you verified it.
- Length: 12,000 to 28,000 characters per profile. Do not pad.
- Every code block states its language and whether it was executed.

## The stub model server

A deterministic fake LLM so you can run agents without keys or network. Source: `agents/frameworks/stub/server.mjs` (in the worktree: `/Users/tejasn/.claude/jobs/717ecb0a/tmp/wt4/agents/frameworks/stub/server.mjs`). Start your own copy on your assigned port: `node server.mjs <port> &` (and kill it when finished). It speaks the OpenAI Chat Completions API (streaming and not), the OpenAI Responses API (not streaming) and the Anthropic Messages API (streaming and not), all under `http://127.0.0.1:<port>/v1`.

Scripted behaviour: if the request offers tools and no tool result is in the conversation, it replies with one call to `get_weather` with `{"city":"Pune"}` (or the first offered tool); once a tool result is present, it replies "It is 31 C and clear in Pune."; with no tools it replies with that text. `GET /_log` returns every request it saw, which is how you prove the tool round trip happened. Point a framework at it with an OpenAI-compatible base URL (`http://127.0.0.1:<port>/v1`, any API key) or an Anthropic base URL (`http://127.0.0.1:<port>`).

Anything the stub cannot emulate (a provider-specific endpoint, vendor-only features) should be marked [unverified]; do not claim it ran.
