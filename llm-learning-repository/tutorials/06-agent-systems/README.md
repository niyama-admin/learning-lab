# Stage 06 - Agent systems: tools, harness and context

How do assistants such as Claude Code and ChatGPT actually work, and is the design "a model, a thin runtime, and a few high-quality tools that the model chooses between" the right one?

This stage answers that with eight papers plus [ReAct](../02-building/10-react.md) as the starting point. Read them in the order below. Every guide uses the v2 format in [guide-authoring-spec-v2.md](../../references/guide-authoring-spec-v2.md): one real worked example, terms defined before use, results explained in plain words, a map of the PDF, and the questions readers get stuck on.

## The through-question, broken into five parts

"Thin runtime plus quality tools" bundles five separate claims. The papers test them unevenly, so keep them apart.

| # | Claim | What the stage's papers say | Strength of evidence |
|---|---|---|---|
| 1 | The core loop is small | [Dive into Claude Code](28-dive-into-claude-code.md): the core is one small loop, and most of the code is the systems around it (permissions, compaction, extensions, subagents, storage). [Harness Engineering](29-harness-engineering.md): across eleven systems, loop sophistication does not predict self-reported benchmark results; a roughly 100-line loop is close to much larger systems. | Moderate. Source-code readings, not experiments; benchmark numbers are self-reported. |
| 2 | The runtime around it is thin | Contradicted. The same two papers find that most of the code is the surroundings. Their own phrase is "thin loop, heavy surroundings". | Moderate, same caveats. |
| 3 | The model uses few tools | Contradicted for shipped products: Dive reports up to 54 built-in tools in Claude Code and Harness Engineering reports 43 (different counts; see each guide), against 69 for Hermes and 109+ for OpenClaw. Only the deliberately minimal systems use one to four. | Moderate. Counts depend on version and counting rules. |
| 4 | Tool quality matters more than people expect | [SWE-agent](26-swe-agent.md): with the model held fixed, a purpose-built interface lifted GPT-4 Turbo from 11.00% to 18.00% on SWE-bench Lite, and one-at-a-time ablations support linting, a compact edit command, summarised search, and trimmed history. It never tests "fewer tools are better" or compares against heavier architectures. | Good for the specific design choices; one model, one benchmark. |
| 5 | The action format (JSON tool call versus something else) is a free choice | [CodeAct](25-codeact.md): code as the action beat JSON and text actions on multi-step tasks (best success rate for 12 of 17 models on M3ToolEval), but on single API calls JSON won for the strongest closed models and code helped open models far more. [Toolformer](24-toolformer.md) is the root of "model emits a call", but it makes at most one call per input and cannot chain, so it is not an agent loop. | Moderate. Small benchmark (82 tasks), one run per model. |

Two further papers address what the loop does with its working memory:

- [Context as a Tool](30-context-as-a-tool.md): treat "condense my history" as an action the agent can call. SWE-Compressor reached 57.6% on SWE-bench Verified against 49.8% for ReAct, but the comparison bundles the trigger policy with the training data and has no confidence intervals.
- [Agentic Context Engineering](31-agentic-context-engineering.md): keep an itemised playbook in the prompt and grow it with small edits. It improves frozen models on AppWorld and finance tasks when feedback is reliable, and can fall below the base model when it is not. Nothing below 70B parameters was tested.

The survey [Agentic Tool Use in Large Language Models](27-agentic-tool-use-survey.md) gives the taxonomy (prompting, supervised learning, reward-driven learning) that places all of these. It reports others' results and runs no experiments of its own.

## What the stage does not establish

- **No paper compares architectures head to head** under matched models, tasks and budgets. "Thin loop with heavy surroundings beats alternative X" is not tested anywhere here.
- **Benchmark numbers are not comparable across papers** (different models, subsets, harnesses, and in several cases self-reported results).
- **Papers 27-31 are 2025-2026 preprints.** Treat them as evidence under review, and read the threats-to-validity section of each guide.
- **Papers 28 and 29 are third-party source readings.** They are not vendor documentation, and the code they read changes. Guide 29 records that a language model (Claude, working through the Claude Code CLI) did much of the code reading with the authors verifying, that the paper gives no error rate, and that Claude Code is also one of the systems studied.

## Reading order and what each paper adds

| Order | Guide | The question it answers | Time |
|---:|---|---|---|
| 10 | [ReAct](../02-building/10-react.md) | What is the loop, and why does interleaving reasoning and acting help? | 1 session |
| 24 | [Toolformer](24-toolformer.md) | Where does "the model emits a tool call" come from, and what can't it do? | 1 session |
| 25 | [CodeAct](25-codeact.md) | Must an action be a JSON call from a menu, or can it be code? | 1 session |
| 26 | [SWE-agent](26-swe-agent.md) | How much does the design of the tools matter? | 1-2 sessions |
| 27 | [Agentic tool use survey](27-agentic-tool-use-survey.md) | How does the whole field divide up? | 1 session |
| 28 | [Dive into Claude Code](28-dive-into-claude-code.md) | What does one production assistant contain around its loop? | 1-2 sessions |
| 29 | [Harness Engineering](29-harness-engineering.md) | What do eleven systems have in common? | 1-2 sessions |
| 30 | [Context as a Tool](30-context-as-a-tool.md) | How should a long task manage its working memory? | 1 session |
| 31 | [Agentic Context Engineering](31-agentic-context-engineering.md) | Can better context stand in for retraining? | 1-2 sessions |

## If you can only use open or smaller models

This is the case where the architecture question has teeth, because tool-choice reliability depends on the model. The stage gives you three things to test rather than assume:

1. Whether code actions help more for your model than JSON calls do (CodeAct's per-model pattern suggests they may).
2. Whether your tool outputs are designed for a model to act on (SWE-agent's ablations show the cost of noisy ones).
3. Whether a curated, itemised context improves your model on your task with reliable feedback (ACE shows gains with 70B-class models and warns about weak feedback).

## A note on how these guides were checked

Each figure in each guide was checked against the arXiv HTML rendering of the paper, because the local PDF could not be rendered in the authoring environment. Figure images were not all readable. Section and table numbers follow the arXiv version named in each guide, which may differ from the local PDF. Every guide lists the inconsistencies it found inside the paper itself, and labels each constructed number or inference as the guide's own. Where a worked example is constructed, the guide says so.
