# LLM learning repository

A methodical path from non-technical intuition to practitioner competence and research literacy. The collection contains 23 primary papers in reading order. Every companion guide has three independent passes: intuitive, practitioner, and researcher.

## How to use it

1. Follow [ROADMAP.md](ROADMAP.md); do not try to read each PDF linearly on the first pass.
2. Open a guide, complete Tutorial 1, then skim the linked paper.
3. Return for Tutorial 2 and its build-and-test exercise.
4. Use Tutorial 3 only after you can explain and test the core idea.
5. Store notes with the templates in [references/research-notes-template.md](references/research-notes-template.md).

Before each stage, consult the [prerequisite map](references/prerequisite-map.md). For coding agents, use the [repository benchmark field guide](references/repository-benchmark-field-guide.md); for agent and customer-facing communication, use [protocols and channels](references/protocols-and-channels.md).

## Weekly additions

The [weekly knowledge workflow](references/weekly-curation-workflow.md) runs every Saturday, selects up to one new arXiv paper for each curriculum category, creates a Monday-Friday study plan with three-level tutorials, downloads and verifies the PDFs, and opens a review PR. Browse accepted additions in [weekly/](weekly/README.md).

## Tutorial quality standard

Every completed paper guide is intended to replace a first reading of the source at three levels: a self-contained intuitive explanation, an implementation-oriented practitioner treatment, and a formal researcher treatment. Guides include paper-specific findings and limitations, diagrams, equations where needed, and an appendix that teaches at least six paper-specific prerequisites with worked examples and references restricted to the vetted shelf. `build-guides.mjs` preserves enriched tutorials unless explicitly invoked with `--force-tutorials`.

The checked-in core corpus was rendered locally from reviewed, paper-specific profiles. Regenerate papers 2-23 without a hosted model or API key with `node render-local-tutorials.mjs`, then run `node verify-repository.mjs` and `node verify-detailed-tutorials.mjs`. The separate core-enrichment GitHub workflow is manual-only and is not part of local generation; do not dispatch it when the local renderer is the intended path.

PDFs live in `papers/`; metadata and canonical URLs live in [manifest.csv](manifest.csv). Re-download deterministically with `node download-papers.mjs`.

## Curriculum

### 01-foundations

How language models represent context, learn from text, and scale.

| Order | Guide | Source |
|---:|---|---|
| 1 | [Attention Is All You Need](tutorials/01-foundations/01-transformer.md) | arXiv:1706.03762 |
| 2 | [BERT: Pre-training of Deep Bidirectional Transformers](tutorials/01-foundations/02-bert.md) | arXiv:1810.04805 |
| 3 | [Language Models are Few-Shot Learners](tutorials/01-foundations/03-gpt3.md) | arXiv:2005.14165 |
| 4 | [Scaling Laws for Neural Language Models](tutorials/01-foundations/04-scaling-laws.md) | arXiv:2001.08361 |
| 5 | [Training Compute-Optimal Large Language Models](tutorials/01-foundations/05-chinchilla.md) | arXiv:2203.15556 |

### 02-building

How useful systems retrieve knowledge, reason, align, adapt, and act.

| Order | Guide | Source |
|---:|---|---|
| 6 | [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](tutorials/02-building/06-rag.md) | arXiv:2005.11401 |
| 7 | [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](tutorials/02-building/07-chain-of-thought.md) | arXiv:2201.11903 |
| 8 | [Training Language Models to Follow Instructions with Human Feedback](tutorials/02-building/08-instructgpt.md) | arXiv:2203.02155 |
| 9 | [LoRA: Low-Rank Adaptation of Large Language Models](tutorials/02-building/09-lora.md) | arXiv:2106.09685 |
| 10 | [ReAct: Synergizing Reasoning and Acting in Language Models](tutorials/02-building/10-react.md) | arXiv:2210.03629 |

### 03-evaluation-and-code

How to measure general capability and repository-level software work.

| Order | Guide | Source |
|---:|---|---|
| 11 | [Measuring Massive Multitask Language Understanding](tutorials/03-evaluation-and-code/11-mmlu.md) | arXiv:2009.03300 |
| 12 | [TruthfulQA: Measuring How Models Mimic Human Falsehoods](tutorials/03-evaluation-and-code/12-truthfulqa.md) | arXiv:2109.07958 |
| 13 | [Holistic Evaluation of Language Models](tutorials/03-evaluation-and-code/13-helm.md) | arXiv:2211.09110 |
| 14 | [Evaluating Large Language Models Trained on Code](tutorials/03-evaluation-and-code/14-humaneval.md) | arXiv:2107.03374 |
| 15 | [RepoBench: Benchmarking Repository-Level Code Auto-Completion Systems](tutorials/03-evaluation-and-code/15-repobench.md) | arXiv:2306.03091 |
| 16 | [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](tutorials/03-evaluation-and-code/16-swe-bench.md) | arXiv:2310.06770 |

### 04-agents-and-protocols

How agents coordinate through roles, channels, MCP, and A2A.

| Order | Guide | Source |
|---:|---|---|
| 17 | [CAMEL: Communicative Agents for Mind Exploration of Large Scale Language Model Society](tutorials/04-agents-and-protocols/17-camel.md) | arXiv:2303.17760 |
| 18 | [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation](tutorials/04-agents-and-protocols/18-autogen.md) | arXiv:2308.08155 |
| 19 | [MetaGPT: Meta Programming for Multi-Agent Collaborative Framework](tutorials/04-agents-and-protocols/19-metagpt.md) | arXiv:2308.00352 |
| 20 | [Large Language Model based Multi-Agents: A Survey of Progress and Challenges](tutorials/04-agents-and-protocols/20-multi-agent-survey.md) | arXiv:2402.01680 |
| 21 | [A Survey of Agent Interoperability Protocols: MCP, ACP, A2A, and ANP](tutorials/04-agents-and-protocols/21-interoperability.md) | arXiv:2505.02279 |

### 05-small-business

What controlled and field studies say about business productivity.

| Order | Guide | Source |
|---:|---|---|
| 22 | [The Impact of AI on Developer Productivity: Evidence from GitHub Copilot](tutorials/05-small-business/22-productivity.md) | arXiv:2302.06590 |
| 23 | [Generative AI at Work](tutorials/05-small-business/23-customer-support.md) | arXiv:2304.11771 |

## Scope and cautions

This is a curated foundation, not a claim that benchmark scores equal usefulness or that multi-agent systems always beat one good agent. MCP and A2A evolve as specifications, so the arXiv survey is paired with official live references. The business studies concern specific software-development and support settings; use them as evidence for pilot design, not as guaranteed ROI for every small business.

## Repository layout

- `papers/`: downloaded arXiv PDFs
- `tutorials/`: ordered three-level companion guides
- `references/`: mathematics, experiments, protocols, glossary, and note templates
- `manifest.csv`: machine-readable bibliography and paths
- `download-papers.mjs`: checksum-friendly downloader
- `render-local-tutorials.mjs`: deterministic, no-API local renderer for the reviewed core profiles
- `verify-repository.mjs`: completeness and PDF signature checks
