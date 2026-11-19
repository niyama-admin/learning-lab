# Stage 07 - Data agents: letting an agent query the analytics warehouse

How should an AI agent get accurate, safe answers from a company's analytics data warehouse, using functions such as natural-language-to-SQL (NL2SQL)? This stage reads eight papers on that question. The pattern that results, with build-or-buy guidance on vendor services, is in [agents/data-access](../../../agents/data-access/README.md).

Every guide uses the v2 format in [guide-authoring-spec-v2.md](../../references/guide-authoring-spec-v2.md). Read [ReAct](../02-building/10-react.md) and [SWE-agent](../06-agent-systems/26-swe-agent.md) first if you have not: the agents here are tool-using loops, and tool design matters as much as it does for code.

## What the stage says, in five parts

| # | Question | What the papers show | Strength of evidence |
|---|---|---|---|
| 1 | Is NL2SQL solved? | No, and the gap widens with realism. [BIRD](32-bird.md): GPT-4 54.89% against 92.96% for trained humans (with evidence hints). [Spider 2.0](34-spider-2.md): the best agent solved 21.36% of 632 enterprise tasks; the best single-shot pipeline tested solved 5.68% of the Lite variant. [BIRD-INTERACT](38-bird-interact.md): GPT-5 completed 8.67% (conversational) and 17.00% (agentic) of tasks. | Good as benchmark evidence; benchmarks are not your warehouse |
| 2 | What makes enterprise data hard? | Large schemas, dialects, business definitions, dirty values, ambiguity, and documentation outside the database. | Moderate; each is shown on constructed benchmarks |
| 3 | What helps? | Staged pipelines with schema compression, execute-and-repair and voting ([ReFoRCE](35-reforce.md): 35.83 on Spider 2.0-Snow with o3 against 24.31 for the baseline agent); on-demand exploration tools ([FlexSQL](36-flexsql.md): 65.44% Majority@16 with an open 120B model; no ablation removes its lookup tools); execution-reward training for small models ([Arctic-Text2SQL-R1](37-arctic-text2sql-r1.md): ties a 70B system on BIRD test). | Moderate; leaderboard-style comparisons, different budgets and attempt counts |
| 4 | How do I ask a better question? | Under-asking is the main interaction failure: BIRD-INTERACT traces over 80% of 50 sampled failures to it. | Moderate; simulated users |
| 5 | Is it safe? | Prompt-level rules failed; a read-only low-privilege database role and validation stopped all seven attacks on a test application, on 2023-era models ([prompt-to-SQL injection](39-prompt-to-sql-injection.md)). | Limited; one library version, binary results |

The survey [Text-to-SQL in the Era of LLMs](33-text2sql-survey.md) places all of these in one taxonomy (pre-processing, translation, post-processing), reports others' results, and runs no experiments.

## What the stage does not establish

- **Nothing about vendor products.** No paper here, and none found on arXiv, evaluates Databricks Genie, Snowflake Cortex Analyst, Fabric or Google data agents. See [agents/data-access](../../../agents/data-access/README.md#5-build-or-buy-the-nl2sql-function).
- **Benchmark noise.** A separate study reports annotation error rates of 52.8% for BIRD Mini-Dev and 62.8% for Spider 2.0-Snow (abstract of arXiv:2601.08778; not one of this stage's guides). Treat leaderboard gaps of a few points as unreliable.
- **Numbers across papers are not comparable** (different models, attempt counts, subsets and versions). Each guide names the arXiv version it followed.
- **Inconsistencies inside the papers.** Every guide lists those it found, for example Spider 2.0's headline comparison figures that appear in no table.

## Reading order

| Order | Guide | The question it answers | Time |
|---:|---|---|---|
| 32 | [BIRD](32-bird.md) | What does a realistic text-to-SQL benchmark measure, and what does execution accuracy hide? | 1-2 sessions |
| 33 | [Text-to-SQL survey](33-text2sql-survey.md) | What is the map of methods? | 1-2 sessions |
| 34 | [Spider 2.0](34-spider-2.md) | Why do real enterprise tasks score so low? | 1-2 sessions |
| 35 | [ReFoRCE](35-reforce.md) | How does a fixed pipeline handle huge schemas? | 1-2 sessions |
| 36 | [FlexSQL](36-flexsql.md) | What if the agent explores the database with tools? | 1-2 sessions |
| 37 | [Arctic-Text2SQL-R1](37-arctic-text2sql-r1.md) | Can small open models be trained with an execution reward? | 1-2 sessions |
| 38 | [BIRD-INTERACT](38-bird-interact.md) | What happens when the question is ambiguous? | 1-2 sessions |
| 39 | [Prompt-to-SQL injection](39-prompt-to-sql-injection.md) | How does an attacker use the agent against the database? | 1 session |

## If you can only use open or smaller models

Three things to test rather than assume: whether an exploration-tool agent like FlexSQL works with your model (it was shown with one open 120B model and a 20B model, not smaller); whether a reward-trained small model is available and good enough for your dialect (Arctic's models are 7B to 32B and were trained on 64 GPUs; you would use them, not retrain them); and whether a written definitions document closes your gap before any training (one small preprint, 2604.25149, reports 17 to 23 points).

## How these were checked

Each figure was checked against the arXiv HTML rendering of the paper, because the local PDF could not be rendered in the authoring environment. Several figures are images and could not be read; the guides say which. Constructed examples (all run on SQLite with toy data) are labelled. The guides were drafted by language-model agents and spot-checked by the maintainer, not reviewed by the papers' authors.
