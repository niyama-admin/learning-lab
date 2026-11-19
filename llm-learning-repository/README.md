# LLM learning repository

A methodical path from non-technical intuition to practitioner competence and research literacy. The collection contains 47 primary papers in reading order. Every companion guide has three independent passes: intuitive, practitioner, and researcher.

## How to use it

1. Follow [ROADMAP.md](ROADMAP.md); do not try to read each PDF linearly on the first pass.
2. Open a guide, complete Tutorial 1, then skim the linked paper.
3. Return for Tutorial 2 and its build-and-test exercise.
4. Use Tutorial 3 only after you can explain and test the core idea.
5. Store notes with the templates in [references/research-notes-template.md](references/research-notes-template.md).

Before each stage, consult the [prerequisite map](references/prerequisite-map.md). For coding agents, use the [repository benchmark field guide](references/repository-benchmark-field-guide.md); for agent and customer-facing communication, use [protocols and channels](references/protocols-and-channels.md).

## Weekly additions

The [weekly knowledge workflow](references/weekly-curation-workflow.md) runs every Saturday, selects up to one new arXiv paper for each curriculum category, creates a Monday-Friday study plan with three-level tutorials, downloads and verifies the PDFs, and opens a review PR. Browse accepted additions in [weekly/](weekly/README.md).

## Guide standard (format v2)

All 47 guides use **format v2** (front matter `format: v2`), written to the rules in [references/guide-authoring-spec-v2.md](references/guide-authoring-spec-v2.md) and enforced by `node verify-v2-guides.mjs`. The aim is that a reader can finish a guide able to explain the idea, build a small version and critique the evidence **without opening the PDF to fill gaps**. Each guide:

- traces one real example from the paper (constructed examples are labelled);
- defines every term before use;
- explains each result in plain words: what is counted, against what, and what a change of that size means;
- gives three levels (intuitive, practitioner, researcher) that add content rather than repeat it;
- maps the paper section by section (read, skim or skip) and answers the questions readers actually get stuck on;
- teaches only the prerequisites that paper uses, with a tiny worked example each;
- separates what the paper reports from what the guide infers, and lists inconsistencies found inside the paper rather than silently correcting them.

**How these were checked, and the limits.** Every number was checked against the arXiv HTML rendering of the paper, because PDFs could not be rendered in the authoring environment; each guide names the version it followed, and section or table numbers follow that rendering and may differ from the local PDF. Figure images were often unreadable, so numbers that exist only in figures are not quoted. A human pass against the PDFs is still worthwhile, especially for the 2025-2026 preprints in stage 06.

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

### 06-agent-systems

How assistants such as Claude Code are built: tools, the harness around the model, and context management. Start with the [stage brief](tutorials/06-agent-systems/README.md); read [ReAct](tutorials/02-building/10-react.md) first.

| Order | Guide | Source |
|---:|---|---|
| 24 | [Toolformer: Language Models Can Teach Themselves to Use Tools](tutorials/06-agent-systems/24-toolformer.md) | arXiv:2302.04761 |
| 25 | [Executable Code Actions Elicit Better LLM Agents](tutorials/06-agent-systems/25-codeact.md) | arXiv:2402.01030 |
| 26 | [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](tutorials/06-agent-systems/26-swe-agent.md) | arXiv:2405.15793 |
| 27 | [Agentic Tool Use in Large Language Models](tutorials/06-agent-systems/27-agentic-tool-use-survey.md) | arXiv:2604.00835 |
| 28 | [Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems](tutorials/06-agent-systems/28-dive-into-claude-code.md) | arXiv:2604.14228 |
| 29 | [Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents](tutorials/06-agent-systems/29-harness-engineering.md) | arXiv:2609.00006 |
| 30 | [Context as a Tool: Context Management for Long-Horizon SWE-Agents](tutorials/06-agent-systems/30-context-as-a-tool.md) | arXiv:2512.22087 |
| 31 | [Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models](tutorials/06-agent-systems/31-agentic-context-engineering.md) | arXiv:2510.04618 |

Papers 28-31 are 2025-2026 preprints; the guides say where evidence is thin.

### 07-data-agents

How an agent gets accurate, safe answers from an analytics data warehouse (NL2SQL and its enterprise limits). Start with the [stage brief](tutorials/07-data-agents/README.md); the resulting pattern is in [agents/data-access](../agents/data-access/README.md).

| Order | Guide | Source |
|---:|---|---|
| 32 | [Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs](tutorials/07-data-agents/32-bird.md) | arXiv:2305.03111 |
| 33 | [A Survey of Text-to-SQL in the Era of LLMs: Where are we, and where are we going?](tutorials/07-data-agents/33-text2sql-survey.md) | arXiv:2408.05109 |
| 34 | [Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows](tutorials/07-data-agents/34-spider-2.md) | arXiv:2411.07763 |
| 35 | [ReFoRCE: A Text-to-SQL Agent with Self-Refinement, Consensus Enforcement, and Column Exploration](tutorials/07-data-agents/35-reforce.md) | arXiv:2502.00675 |
| 36 | [FlexSQL: Flexible Exploration and Execution Make Better Text-to-SQL Agents](tutorials/07-data-agents/36-flexsql.md) | arXiv:2605.02815 |
| 37 | [Arctic-Text2SQL-R1: Simple Rewards, Strong Reasoning in Text-to-SQL](tutorials/07-data-agents/37-arctic-text2sql-r1.md) | arXiv:2505.20315 |
| 38 | [BIRD-INTERACT: Re-imagining Text-to-SQL Evaluation for Large Language Models via Lens of Dynamic Interactions](tutorials/07-data-agents/38-bird-interact.md) | arXiv:2510.05318 |
| 39 | [From Prompt Injections to SQL Injection Attacks: How Protected is Your LLM-Integrated Web Application?](tutorials/07-data-agents/39-prompt-to-sql-injection.md) | arXiv:2308.01990 |

Papers 35-38 are 2025-2026 preprints or very recent venue papers; the guides say where evidence is thin.

### 08-agent-connectivity

How a runtime calls tools (MCP) and agents (A2A) and governs those calls with identity, authorization and gateways. Start with the [stage brief](tutorials/08-agent-connectivity/README.md); the resulting pattern is in [agents/connectivity](../agents/connectivity/README.md).

| Order | Guide | Source |
|---:|---|---|
| 40 | [Progent: Securing AI Agents with Privilege Control](tutorials/08-agent-connectivity/40-progent.md) | arXiv:2504.11703 |
| 41 | [Model Context Protocol (MCP): Landscape, Security Threats, and Future Research Directions](tutorials/08-agent-connectivity/41-mcp-landscape-threats.md) | arXiv:2503.23278 |
| 42 | [A First Measurement Study on Authentication Security in Real-World Remote MCP Servers](tutorials/08-agent-connectivity/42-mcp-auth-measurement.md) | arXiv:2605.22333 |
| 43 | [A2ABreak: Systematic Security Analysis of the A2A Protocol](tutorials/08-agent-connectivity/43-a2abreak.md) | arXiv:2609.10871 |
| 44 | [Authenticated Delegation and Authorized AI Agents](tutorials/08-agent-connectivity/44-authenticated-delegation.md) | arXiv:2501.09674 |
| 45 | [Defeating Prompt Injections by Design](tutorials/08-agent-connectivity/45-camel-prompt-injection-by-design.md) | arXiv:2503.18813 |
| 46 | [Autonomous Action Runtime Management (AARM): A System Specification for Securing AI-Driven Actions at Runtime](tutorials/08-agent-connectivity/46-aarm.md) | arXiv:2602.09433 |
| 47 | [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents](tutorials/08-agent-connectivity/47-agentdojo.md) | arXiv:2406.13352 |

Papers 40-47 are 2024-2026 preprints; the guides say where evidence is thin, and which protocol revision each studied.

## Scope and cautions

This is a curated foundation, not a claim that benchmark scores equal usefulness or that multi-agent systems always beat one good agent. MCP and A2A evolve as specifications, so the arXiv survey is paired with official live references. The business studies concern specific software-development and support settings; use them as evidence for pilot design, not as guaranteed ROI for every small business.

## Repository layout

- `papers/`: downloaded arXiv PDFs
- `tutorials/`: ordered three-level companion guides
- `references/`: mathematics, experiments, protocols, glossary, and note templates
- `manifest.csv`: machine-readable bibliography and paths
- `download-papers.mjs`: checksum-friendly downloader
- `render-local-tutorials.mjs`: legacy v1 renderer; skips v2 guides unless `--overwrite-v2` is passed (do not)
- `verify-repository.mjs`: completeness and PDF signature checks
- `verify-v2-guides.mjs`: structural and anti-boilerplate checks for v2 guides (also used by the compute collection)
