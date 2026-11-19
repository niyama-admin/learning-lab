# smolagents

Hugging Face's minimal Python agent library. Its flagship, `CodeAgent`, has the model write Python code as its action; a second class, `ToolCallingAgent`, uses ordinary JSON tool calls.

| Field | Value |
|---|---|
| Covers | smolagents **1.26.0**, as of 2026-11-19 |
| Language | Python (metadata: 3.10 and up) |
| Verified on | Python 3.15.2 on macOS, throwaway venv, stub server on port 8104 |
| Evidence key | [ran] executed here, [docs], [source] (installed package source or metadata), [secondary], [unverified] |

## Snapshot

| Item | Value | Evidence |
|---|---|---|
| Current version, date | 1.26.0, published 2026-05-29. Earlier: 1.25.0 on 2026-05-14, 1.24.0 on 2026-01-16, 1.23.0 on 2025-11-17, 1.22.0 on 2025-09-25. The newest release is about five and a half months old, but `main` is active (commits on 2026-11-17 and 2026-11-18, including a new `LlamaCppModel`). | [source] PyPI JSON API https://pypi.org/pypi/smolagents/json; GitHub API for commits and releases |
| License | Apache-2.0 | [source] GitHub API and file headers (`Licensed under the Apache License`); the PyPI `license` field is empty |
| Maintainer, governance | Hugging Face. Metadata author: Aymeric Roucher. | [source] `pip show smolagents` |
| Languages | Python only | [source] |
| Repository | https://github.com/huggingface/smolagents (about 30,400 stars, not archived) | [source] GitHub API |
| Docs | https://huggingface.co/docs/smolagents | [docs] |
| Release cadence | Every one to four months. | [source] PyPI |
| Breaking-change history | The API reference page says plainly: "Smolagents is an experimental API which is subject to change at any time." Last five releases: 1.22 made `PythonExecutor` an abstract base class (breaks custom executors); 1.23 changed vLLM structured-output arguments; 1.24 deprecated `HfApiModel` for `InferenceClientModel`; 1.25 removed legacy pickle payloads and set `allow_pickle` False by default; 1.26 **removed the remote WebAssembly executor**. The code-block format the model must emit is now `<code>...</code>` (the parser error says so [ran]). | [docs] https://github.com/huggingface/smolagents/releases (read through a summarising fetch tool, so treat details as approximate); [docs] https://huggingface.co/docs/smolagents/reference/models; [ran] parser error text |
| Status | Active and widely used, still 1.x and self-described as experimental. No successor named. | [docs], [source] |

## What it is, in terms of the runtime loop

A smolagents agent is a ReAct-style loop (think, act, observe) in which the "act" step is one of two things. In a `CodeAgent` the model writes a snippet of Python between `<code>` tags; the library parses it, runs it in a Python executor, captures printed output and the last expression, and feeds that back as the observation; the model finishes by calling a function `final_answer(...)` inside its code. In a `ToolCallingAgent` the model emits a JSON tool call and the library runs the named tool; finishing is again a call to a tool named `final_answer`, which the library adds. Tools are Python functions with the `@tool` decorator (schema from type hints and a docstring `Args:` block) or `Tool` subclasses. Memory is a list of steps on the agent (`agent.memory.steps`). There is no permission system, session store or durability layer, and sandboxing is an executor choice, which is where this profile spends most time.

The CodeAgent idea is the one in the CodeAct paper; the repository's guide is [CodeAct, Executable Code Actions Elicit Better LLM Agents](../../../llm-learning-repository/tutorials/06-agent-systems/25-codeact.md). smolagents is a practical implementation of that idea, and its docs lean on the papers for the claim that code actions beat JSON actions [docs: https://huggingface.co/docs/smolagents/tutorials/secure_code_execution]; I did not measure that claim or repeat the paper's numbers.

| # | Duty | Status | API and evidence |
|---|---|---|---|
| 1 | Stream from the model, assemble partial tool calls | **Partly provided** | `agent.run(task, stream=True)` yields step events (`ToolCall`, `ToolOutput`, `ActionOutput`, `ActionStep`, `FinalAnswerStep`) [ran]. |
| 2 | Loop as a state machine | **Provided, fixed shape** | `MultiStepAgent._run_stream`; `max_steps` default 20 [source]; optional `planning_interval` inserts planning steps [source]. Stop rule: the model calls `final_answer`, or steps run out [ran]. |
| 3 | Validate tool arguments, generate schemas | **Provided** | `@tool` builds the schema from type hints and docstring [ran: tool offered to the stub under its name]. Argument validation depth not tested. |
| 4 | Concurrent tools, cancellation, timeouts | **Mostly you build it** | `ToolCallingAgent` runs one turn's calls in a thread pool (`max_tool_threads` [source]). CodeAgent: one code block per step. The executor timeout does not stop the code (see sandbox section) [ran]. |
| 5 | Execute untrusted commands in a sandbox | **Provided as options of very different strength** | `executor_type` in {"local", "blaxel", "e2b", "modal", "docker"} [source]. See the security section. |
| 6 | Assemble and compact context | **Partly provided** | The prompt is built from templates in `smolagents/prompts` [source]; the system prompt of a `CodeAgent` with one tool was 8,611 characters [ran]. No compaction; long runs just grow the step list. |
| 7 | Persist sessions | **Mostly you build it** | `reset=False` on `run` keeps the memory between runs in the same process [ran: 8 steps after two runs]. `save`, `push_to_hub`, `from_hub` serialise the agent definition, not a session [source: names]. |
| 8 | Permissions, approvals | **You build it** | No approval mechanism. Hook points: `step_callbacks` and `final_answer_checks` [source]. No human-in-the-loop API found in `agents.py` [ran: grep]. |
| 9 | Extension: MCP, plugins, hooks | **Provided** | `MCPClient` (extra `smolagents[mcp]`), `ToolCollection`, Hub tools [ran for MCP only]. Hub tool loading needs `trust_remote_code` because it runs downloaded code [source]. |
| 10 | Observability | **Partly provided** | `[telemetry]` extra [source: name]; token counters on `agent.monitor` [ran: 420 input, 210 output tokens after a 20-step run]. |
| 11 | Package and distribute | **You build it** | A library. Core dependencies are `huggingface-hub`, `jinja2`, `pillow`, `python-dotenv`, `requests`, `rich` [source via `pip show`]. |
| 12 | Local-model integration | **Provided, a headline feature** | `TransformersModel`, `MLXModel`, `VLLMModel` (in-process), `OpenAIModel` and `LiteLLMModel` for local servers; a `LlamaCppModel` just landed on `main` [source: GitHub commit, not in 1.26.0]. |

## Implement it

### Install and minimal agent

```bash
python3 -m venv .venv && .venv/bin/pip install 'smolagents[openai]'
```

I ran `pip install 'smolagents[toolkit]' openai` [ran]; it resolved to smolagents 1.26.0, huggingface_hub 2.4.0, openai 3.55.1 on Python 3.15.2 without a compiler. Extras in 1.26.0 metadata include docker, e2b, modal, blaxel, mcp, openai, litellm, telemetry, transformers, vllm, mlx-lm [source].

The minimal agent below uses `ToolCallingAgent`, because the stub model cannot write code blocks. Language: Python. **Executed [ran]** against the stub.

```python
from smolagents import ToolCallingAgent, OpenAIModel, tool

@tool
def get_weather(city: str) -> str:
    """Return the weather for a city.

    Args:
        city: Name of the city.
    """
    return "31 C and clear"

model = OpenAIModel(model_id="stub", api_base="http://127.0.0.1:8104/v1", api_key="x")
agent = ToolCallingAgent(tools=[get_weather], model=model, verbosity_level=0)
print(agent.run("What is the weather in Pune?"))
```

### Run it against the stub

Command: `python -I min.py`. Output [ran]:

```text
Reached max steps.
It is 31 C and clear in Pune.
```

The program printed the right sentence but **did not finish normally**. `GET /_log` showed 21 requests for the one run [ran]. The first offered the tools `['get_weather', 'final_answer']` (smolagents adds `final_answer` itself); the stub answered with a `get_weather` call; from the second request on the stub saw a tool result and replied with its fixed prose sentence. A `ToolCallingAgent` treats a prose reply as a step that did not finish, so it looped 20 steps (`max_steps` default), then made one last request with no tools and printed that reply. With `max_steps=3` the same program made 4 requests [ran]. The tool round trip is proved (the stub produces the sentence only after seeing a tool result), but the stub cannot exercise a clean finish through `final_answer`. A real model that answers in prose costs you all its steps.

### Using the CodeAgent: what was and was not model-driven

The stub cannot write code. Two experiments [ran], both labelled:

1. **CodeAgent against the stub.** Every step failed with `Error in code parsing: ... the regex pattern <code>(.*?)</code> was not found`, fed back as an observation, until `max_steps` (set to 2). This shows the format contract, not code generation.
2. **CodeAgent with a hand-written "model".** I subclassed `Model` with a `generate` method that returns a fixed reply containing a code block. **Nothing here was model-driven**: the code was written by me. The agent parsed it, executed it, and produced the answer.

```python
# Python; EXECUTED [ran]. The "model" is a hard-coded string, NOT an LLM.
from smolagents import CodeAgent, Model, ChatMessage, MessageRole, tool

@tool
def get_weather(city: str) -> str:
    """Return the weather for a city.

    Args:
        city: Name of the city.
    """
    return "31 C and clear"

class Scripted(Model):
    def generate(self, messages, stop_sequences=None, **kw):
        return ChatMessage(role=MessageRole.ASSISTANT, content=(
            "Thought: call the tool.\n<code>\nw = get_weather('Pune')\nprint(w)\n"
            "final_answer('It is ' + w + ' in Pune.')\n</code>"))

a = CodeAgent(tools=[get_weather], model=Scripted(), verbosity_level=0)
print(a.run("What is the weather in Pune?"))
```

Output [ran]: `It is 31 C and clear in Pune.` The memory held two steps (`TaskStep`, `ActionStep`), and the code step's observation was `Execution logs:\n31 C and clear\nLast output from code snippet:\nIt is 31 C and clear in Pune.`. One snippet made the tool call, held the result in a variable and finished, which JSON tool calling needs two turns for.

### The nine feature checks

**(a) Streaming output.** [ran] `agent.run(task, stream=True)` yields step events (`ToolCall`, `ToolOutput`, `ActionOutput`, `ActionStep`, then `FinalAnswerStep`): step-level, not token-level. Models have a `generate_stream` method [source].

**(b) Memory across turns.** [ran] `agent.run("again", reset=False)`: 8 steps in `agent.memory.steps` after two runs. In-process only.

**(c) Durable state.** Not provided: no checkpoint or resume. You can write `agent.memory.steps` out after every step with a `step_callbacks` entry [source]; rebuilding an agent from them is not a documented path [unverified].

**(d) Human approval before a tool runs.** Not provided. Build it by wrapping each risky tool so it returns "denied" unless an approval callable says yes. In a `CodeAgent` that wrapper is the only reliable choke point, because generated code can call any tool you gave it with any arguments.

**(e) A second tool and parallel calls.** Add it to `tools=[...]`. `ToolCallingAgent` runs several calls from one turn on a thread pool sized by `max_tool_threads` [source: `agents.py` line 1426]; the stub emits one call, so not exercised. In a `CodeAgent` the model composes calls inside its snippet.

**(f) Calling an MCP server.** [ran, with a fix] `pip install 'smolagents[mcp]'` followed by

```python
import sys
from mcp import StdioServerParameters
from smolagents import MCPClient, ToolCallingAgent
with MCPClient(StdioServerParameters(command=sys.executable, args=["-I", "mcpsrv1.py"]),
               structured_output=False) as tools:
    agent = ToolCallingAgent(tools=tools, model=model, verbosity_level=0, max_steps=1)
    agent.run("weather Pune")
```

worked and the observation was `31 C and clear (mcp)`. **It did not work on a fresh install.** The `[mcp]` extra resolved `mcp 2.3.0` here, and the adapter (`mcpadapt 0.1.20`) raised `ImportError: cannot import name 'streamablehttp_client' from 'mcp.client.streamable_http'`. I got it working by installing `mcp<2` (1.30.0) and `websockets` (the adapter imports the websocket client module). Pin `mcp<2` for now [ran]. The MCP server used `mcp.server.fastmcp`, which exists only in mcp 1.x.

**(g) Structured (typed) output.** Weak. The final answer is whatever the model passes to `final_answer`; the only validation hook is `final_answer_checks` [source], where you can run Pydantic yourself.

**(h) Tracing.** Token counts on `agent.monitor` [ran]. A `[telemetry]` extra installs OpenTelemetry instrumentation [source: extra name; not run]. Console logging is on by default (`verbosity_level`).

**(i) Testing without a real model.** No test double ships. Subclass `Model` and return fixed `ChatMessage`s [ran], which suits CodeAgent because the script is just code.

## Models and local models

**Provider switching.** The model is a constructor argument: `InferenceClientModel` (Hugging Face Inference Providers), `OpenAIModel` and `AzureOpenAIModel` (any OpenAI-compatible server via `api_base`), `LiteLLMModel` and `LiteLLMRouterModel`, `AmazonBedrockModel`, and the local classes below [source: `models.py` class list; docs https://huggingface.co/docs/smolagents/reference/models]. There is no first-party Anthropic class; Anthropic goes through LiteLLM [docs example uses `anthropic/claude-...` with `LiteLLMModel`]. I ran only `OpenAIModel` against the stub [ran].

**Local models** are a stated strength. In-process: `TransformersModel`, `MLXModel` (Apple silicon, `mlx-lm`), `VLLMModel` (needs `vllm`) [docs]. For a server: `OpenAIModel(api_base="http://localhost:11434/v1", ...)` for Ollama, vLLM or llama.cpp servers [unverified for each; same transport as my stub run]. `LiteLLMModel` flattens messages to plain text by default for model ids beginning "ollama", "groq" and "cerebras" [docs]. I installed none of the in-process backends (they pull `torch`), so they were not run.

**Known issues with small and open models.**
- **CodeAgent depends on the model following a text format**: `<code>` blocks and a `final_answer(...)` call. A model that replies in prose gets a parse-error observation each step [ran against the stub]. The format is enforced only by the system prompt (8.6 thousand characters for a one-tool agent [ran]) and the parser, so weak instruction followers burn steps. I did not measure how often real open models comply.
- **ToolCallingAgent depends on the server returning proper tool calls and on the model finishing via `final_answer`.** Prose replies loop to `max_steps` [ran, 21 requests]. A server without its tool-call parser enabled returns plain text.
- Role quirks: `custom_role_conversions`, `flatten_messages_as_text` [docs].

## State, durability and concurrency

- **State.** In the agent object: `agent.memory` (system prompt, task, steps with model output, observations, errors, token usage) and, for `CodeAgent`, the executor's variables, which carry over between steps by design [unverified: I ran one step per executor]. A remote executor's state is a live kernel in the sandbox.
- **Survives a crash.** Nothing; the library writes no run log.
- **Concurrency.** Synchronous library, no async API. The local executor runs in your process, sharing memory, files and environment variables; its timeout thread cannot be killed (below).
- **Cancellation.** `agent.interrupt()` exists [source: `agents.py` line 754; not called]. A running code block cannot be cancelled.

## Security of executing generated code

This is the part to read carefully. I ran the local interpreter with hand-written snippets (nothing here was model-generated) on smolagents 1.26.0.

### What the local interpreter is

`LocalPythonExecutor` does not call Python's `exec`. It parses the code to an abstract syntax tree and **evaluates it operation by operation inside your own Python process**, applying rules: imports are restricted to an allow list, a set of built-ins is removed, attribute access to double-underscore names is refused, loops are capped, and results are checked against a list of dangerous functions and modules [docs; source]. Default allowed imports are `collections, datetime, itertools, math, queue, random, re, stat, statistics, time, unicodedata` [source: `BASE_BUILTIN_MODULES`]. The docs say "no local python sandbox can ever be completely secure" and that "the only way to run LLM-generated code with truly robust security isolation is to use remote execution options like E2B or Docker" [docs]. The 1.25.0 release notes say "LocalPythonExecutor is not a security tool" [docs: releases page, via a summarising fetch tool]. Take them at their word.

### What I observed [ran, local executor, defaults unless stated]

| Snippet (hand-written) | Result |
|---|---|
| `import os`; `import subprocess` | Blocked: "Import of os is not allowed" |
| `open('/etc/hosts').read()` | Blocked: "Forbidden function evaluation: 'open' is not among the explicitly allowed tools" |
| `__import__('os')`, `eval(...)`, `exec(...)` | Blocked |
| `import math` / `import random` | Allowed |
| `import json` | **Blocked by default** (not on the default list); you must add it |
| `().__class__.__base__.__subclasses__()`, `().__class__.__bases__[0]...`, `getattr((), '__cl'+'ass__')` | Blocked: "Forbidden access to dunder attribute" (including the string-built `getattr`) |
| `while True: i += 1` | Stopped after 1,000,000 iterations, after about 1.6 s |
| Infinite recursion | Caught as `RecursionError` |
| Allocate a list of 100 million items (about 800 MB) | **Allowed**, 0.1 s. There is no memory limit. |
| With `additional_authorized_imports=["pathlib"]`: read `/etc/hosts` | **Succeeded** |
| With `["os"]`: `os.getcwd()` | Succeeded |
| With `["os"]`: `os.system('echo ... > /tmp/file')` | **Succeeded**: returned 0 and the file was created (I deleted it). The `DANGEROUS_FUNCTIONS` list in the source includes `os.system`, but it is applied to returned values, not to calls made once `os` is authorized [source `check_safer_result`; ran]. |
| `time.sleep(8)` with `timeout_seconds=2` | The timeout error was raised **after 8.0 s**, not 2 s |
| An infinite `while True: time.sleep(0.5)` with default timeout (30 s) | **Hung for more than four minutes** until I killed the process (accidental, but reproducible from the source) |

Why: the timeout wrapper runs the code on a thread inside `with ThreadPoolExecutor(...)`; when the timeout fires, leaving the `with` block waits for the thread, so the error arrives only when the code ends by itself. The docstring admits the thread cannot be killed [source: `timeout()` in `local_python_executor.py`], but the caller blocks too. The iteration cap only catches fast loops; a sleeping loop is capped at about 1,000,000 times its sleep.

### How safe is each option? (precise claims)

| Option | Isolation | Verified how | What it does and does not protect |
|---|---|---|---|
| `executor_type="local"` (default) | Language-level restrictions, same process, same user, same files, same network, same environment variables | [ran] table above | Stops casual accidents and the obvious attacks. Does **not** stop: memory or disk exhaustion, anything reachable through a tool you pass in, anything in a module you authorize, or a determined escape (the docs say so). A single authorized module such as `os`, `pathlib`, `subprocess` or `requests` makes it a thin wrapper. `additional_authorized_imports=["*"]` disables the check entirely [source: "Use this at your own risk!"]. Authorizing a package can expose its own imports (the docs' example is `random._os`; they say submodule access is blocked by default). |
| `executor_type="docker"` | A container running Jupyter Kernel Gateway, reached over HTTP and websocket on `127.0.0.1:8888` with a random token | [source], [docs]. **Not run**: a Docker CLI exists on this machine but I did not start a daemon or build an image. | The default container in the source sets no memory, CPU, pid or capability limits, runs the image's default user (root in `python:3.12-bullseye`), and has Docker's default network with outbound access. The hardening in the docs (`cap_drop`, `no-new-privileges`, `mem_limit`, `pids_limit`, user `nobody`) appears in the docs' *hand-written* example, not as defaults of `executor_type="docker"`. You pass `container_run_kwargs` to add them. |
| `executor_type="e2b"` | Hosted sandbox VM from the vendor E2B; needs an account and key | [docs], [source]. Not run. | Isolation from your machine; trust moves to the vendor, and your code and data leave your machine. |
| `executor_type="modal"` and `"blaxel"` | Hosted sandboxes; need accounts | [docs], [source]. Not run. | Same trade as E2B. |
| WebAssembly (Pyodide with Deno) | Was a remote WASM executor | **Removed in 1.26.0** ("Remove remote WasmExecutor") [docs releases]. A stale `pyodide_deno_executor.bak.py` ships inside the 1.26.0 package, not wired in, and `executor_type` does not accept "wasm" [source]. | Do not plan around WebAssembly in smolagents. |
| Running the whole agent inside a sandbox | You package the agent and run it in a container or VM yourself | [docs] describes it; not run | Needed for multi-agent setups, since remote executors raise "Managed agents are not yet supported with remote code execution" [source]; model credentials must go into the sandbox. |

With a remote executor only the code runs in the sandbox; state moves across serialised, with `allow_pickle=False` by default since 1.25 and a source warning that `allow_pickle=True` "can execute arbitrary code" [source].

### Threat model summary for an implementer

If model output can be influenced by anything untrusted (web pages the agent browses, documents it reads, user text), then generated code is attacker-influenced, and the local executor is not a boundary you can ship on. Use a container or hosted sandbox with no secrets inside, no outbound network unless needed, and resource limits; treat each tool you hand to the CodeAgent as a capability the attacker also holds, with arbitrary arguments. A `ToolCallingAgent` removes the "arbitrary code" class of risk but keeps the "any tool, any arguments" class.

## What you still build yourself

Permissions and approval (hook points only: tool wrappers, `final_answer_checks`, `step_callbacks`), sandbox hardening (options above), durable runs and session storage, context compaction (output truncation only), budgets (`max_steps` and token counters on `agent.monitor` [ran]), typed final output, async and cancellation, and evaluation. The framework supplies none of these beyond the hooks named.

## Lock-in and escape hatches

- **Footprint of your code.** Light: tools are decorated functions, a model is an object with one `generate` method [ran: a dozen lines]. Framework-specific: prompt templates, the `<code>` and `final_answer` conventions, memory step classes, Hub tools.
- **Reimplementing it.** `ToolCallingAgent` is close to the 100-line loop in the [reference specification](../../languages/README.md#8-a-language-neutral-reference-specification). A `CodeAgent` adds a parser and an executor, where the risk lives. If you sandbox in a container anyway, the AST interpreter adds little and a small subprocess runner replaces it.
- **Migration stories.** None collected [unverified].

## Pitfalls

1. **The local executor's safety is overstated by its name.** Evidence: authorizing `os` allowed `os.system`; authorizing `pathlib` allowed file reads; no memory cap; docs and release notes say it is not a security boundary [ran, docs].
2. **The timeout does not interrupt.** `timeout_seconds=2` took 8 s on an 8-second sleep, and an endless sleeping loop hung the host process [ran, source]. Run untrusted code in a separate process you can kill.
3. **Fresh `[mcp]` install is broken against `mcp 2.x`.** Fix by pinning `mcp<2` and installing `websockets` [ran].
4. **Prose-answering models burn all steps.** Evidence: 21 requests for one trivial question [ran]. Set `max_steps` low during development.
5. **Format drift across versions.** The code-block tag is now `<code>`, WebAssembly is gone, `HfApiModel` is deprecated, executor base classes changed in 1.22 [docs releases, ran]. Pin the version.
6. **Experimental label** in the docs [docs].
7. **Release lag.** The last release is 2026-05-29; `main` has later commits (for example `LlamaCppModel`) [source].
8. **Small default allowlist.** `json` is not importable by default [ran].
9. **Remote executors and managed agents do not combine** [source].
10. **System prompt weight.** About 8.6 thousand characters sent every step [ran].

## Choose it when / avoid it when

**Choose it when**
- You want to experiment with the CodeAct idea cheaply: multi-step tasks where composing tool calls in code (loops, variables) helps, and you are willing to run the code in a container or hosted sandbox.
- You want Hugging Face open models in-process (`TransformersModel`, `MLXModel`, `VLLMModel`).
- A `ToolCallingAgent` with a few tools and MCP is enough and you will add approval and persistence yourself.

**Avoid it when**
- You would rely on the local interpreter as a security boundary against untrusted input or models.
- You need permissions, approvals, durable restart, async or typed outputs from the framework; none exists. A framework that does more of that (for example [PydanticAI](pydantic-ai.md) for typed boundaries and durability, though it has no sandbox either) will save you work.
- You need a stable API; you will be on a moving 1.x with an experimental label.

**Versus writing the loop yourself.** The framework buys you a working think-code-observe loop, a prompt that is tuned by its authors for code actions, a parser with self-repair, an AST interpreter, remote-executor glue, several model backends including in-process local models, and MCP and Hub tool loading. It costs a system prompt you must read, a code-block format your model must honour, an interpreter with partial protections and a timeout that does not interrupt, and a release stream that already removed an executor. If you will sandbox in a container regardless, your own loop (about 100 lines, plus a small subprocess runner) gives you the same behaviour with more control; the main thing you would lose is the prompt tuning and the Hugging Face model classes. For a CodeAct experiment with an open model this week, it is the fastest route I tested.

## What was verified

| Item | Detail |
|---|---|
| Environment | Python 3.15.2, venv at `.../tmp/envs/smol`; stub on port 8104 (stopped afterwards) |
| Installed | `smolagents[toolkit]` 1.26.0, `huggingface_hub` 2.4.0, `openai` 3.55.1, then `smolagents[mcp]` (resolved `mcp 2.3.0`, `mcpadapt 0.1.20`), later `mcp 1.30.0` and `websockets` to make MCP work |
| Ran against the stub | `ToolCallingAgent` with `get_weather` (21 requests, prose replies loop to `max_steps`; `max_steps=3` gave 4 requests); streaming events; `reset=False` memory; `CodeAgent` against the stub (parse-error loop) |
| Ran, no model | `CodeAgent` with a hand-written scripted `Model` (code written by me, not an LLM); `LocalPythonExecutor` with about 22 hand-written snippets (table above); MCP stdio server through `MCPClient` after pinning `mcp<2` |
| Read only | Docker, E2B, Modal, Blaxel executors; in-process model classes; telemetry; Hub tools; docs and release notes (via a summarising fetch tool) |
| Could not verify | Real open models' `<code>` compliance; Docker, E2B, Modal, Blaxel behaviour and isolation; `agent.interrupt`; parallel tool threads; telemetry output; migration stories; unreleased `main` |
