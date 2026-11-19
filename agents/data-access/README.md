# Agentic access to analytics and data-warehouse data

A pattern for letting an AI agent get accurate, safe answers from a company's analytics data, using functions such as natural-language-to-SQL (NL2SQL). It extends the [runtime reference architecture](../runtime-architecture/README.md), where business data sources are one of eight kinds of data, and it feeds the **Data agents** stage of the [paper curriculum](../../llm-learning-repository/tutorials/07-data-agents/README.md).

Status: written 2026-11-19. All diagrams are plain text so they render on GitHub Mobile. Evidence labels: **(paper)** from an arXiv abstract or guide; **(docs)** from a vendor's official documentation, read 2026-11-19; **(inference)** this document's reasoning. Nothing here was run against a vendor service; the small examples in the linked guides ran on SQLite with constructed data.

## 1. The answer first

1. **Do not hand the agent a database connection and hope.** Give it a small, governed **tool surface** over the warehouse, and prefer the narrowest tool that can answer the question: a **certified function** (a fixed, reviewed query or metric) before a **semantic-layer query**, before a **managed NL2SQL service**, before an **agent that writes its own SQL**. Each step down adds flexibility and model risk.
2. **The hard part is business meaning, not SQL.** On the enterprise benchmark Spider 2.0, the best agent (Spider-Agent with o1-preview) solved 21.36% of 632 tasks, and the best single-shot pipeline tested (DAIL-SQL with GPT-4o) solved 5.68% of the Lite variant, against 86.6% on Spider 1.0 for the same pipeline (paper tables, per the [Spider 2.0 guide](../../llm-learning-repository/tutorials/07-data-agents/34-spider-2.md); the abstract's 91.2% and 73.0% comparison figures appear in no table of the paper, so use the like-for-like numbers). A small paired study found that giving three frontier models a 4 KB hand-written definitions document raised accuracy by 17 to 23 points, yet all three still reached only about 68% on its 100 questions (paper, a small preprint). Plan to author the semantic layer, and expect to keep measuring.
3. **Public leaderboards are weak evidence for your warehouse.** One study reports annotation error rates of 52.8% for BIRD Mini-Dev and 62.8% for Spider 2.0-Snow (paper abstract). Build your own gold set of checked questions and answers.
4. **The security boundary is the database identity, not the prompt and not a read-only flag.** Vendors say this themselves (docs). Use per-user identity passthrough or a least-privilege service role, row-level security, and your own query validation.
5. **On vendor-provided functions (Databricks Genie, Snowflake Cortex Analyst, Fabric and Google data agents): arXiv has no independent evaluation and no build-versus-buy study.** The only related papers are vendor-authored and about model training or engines. Treat each managed service as one candidate **behind your own tool interface**, and evaluate it on your own questions. Details in Section 5.

## 2. The picture

```
   business user  or  another agent
              |
              v
  +---------------------+      +------------------------------------------+
  | AGENT (the runtime) |----->| DATA-ACCESS TOOLS (your tool surface)     |
  +---------------------+      |  get_metric(name, filters)     certified  |
                               |  run_certified(query_id, params)          |
                               |  ask_data(question)   managed or own NL2SQL|
                               |  explore: list_tables, describe, sample   |
                               |  run_readonly_sql(sql)         last resort|
                               +------------------------------------------+
                                              |
                                              v
  +---------------------------------------------------------------------+
  | GOVERNED BOUNDARY   identity passthrough or least-privilege role,    |
  | row-level security, query validation, row / time / cost caps, audit   |
  +---------------------------------------------------------------------+
                      |                  |                    |
                      v                  v                    v
             +----------------+  +----------------+  +------------------+
             | SEMANTIC LAYER |  | WAREHOUSE(S)   |  | VENDOR SERVICES  |
             | metrics, joins,|  | one or several |  | Genie, Cortex    |
             | definitions,   |  | platforms      |  | Analyst, Fabric  |
             | examples       |  |                |  | agent, ...       |
             +----------------+  +----------------+  +------------------+
```

The tool surface is **yours**, even when a vendor service sits behind one of its tools. That is what keeps the choice reversible and lets one agent work across more than one warehouse.

## 3. One data question through the pipeline

```
 1. Intent and ambiguity   "revenue last quarter": which revenue? ask or state the assumption
 2. Semantic resolution    map words to approved metrics, dimensions, filters, grain
 3. Schema selection       pick the few tables and columns that matter (large schemas)
 4. SQL generation         certified query, metric query, managed service, or own model
 5. Validation             one read-only statement, allow-listed objects, cost estimate
 6. Execution              as the user's identity, with row, time and cost caps
 7. Result shaping         cap rows, show the total, check against a certified number
 8. Answer                 result, the assumptions made, the SQL, the sources
 9. Audit                  who asked, what ran, what it cost, what was returned
```

| Stage | What goes wrong | Control | Evidence |
|---|---|---|---|
| 1 | The question has two valid readings; the agent guesses | Ask a clarifying question or state the assumption; allow "cannot answer reliably" | [BIRD-INTERACT](../../llm-learning-repository/tutorials/07-data-agents/38-bird-interact.md): GPT-5 completed 8.67% of conversational tasks and 17.00% of agentic ones (abstract) |
| 2 | The model invents what "active customer" means | Author a semantic layer or definitions document and retrieve from it | +17 to +23 points from a 4 KB document (2604.25149, small preprint); [Spider 2.0](../../llm-learning-repository/tutorials/07-data-agents/34-spider-2.md) |
| 3 | A schema of thousands of columns does not fit or confuses the model | Select and compress the schema; let the agent explore | [ReFoRCE](../../llm-learning-repository/tutorials/07-data-agents/35-reforce.md) (schema compression, column exploration), [FlexSQL](../../llm-learning-repository/tutorials/07-data-agents/36-flexsql.md) |
| 4 | Wrong joins or filters that still run | Execution feedback, several candidates and a consensus, or a fine-tuned model | ReFoRCE; [Arctic-Text2SQL-R1](../../llm-learning-repository/tutorials/07-data-agents/37-arctic-text2sql-r1.md) (a 7B model beating prior 70B-class systems, abstract) |
| 5 | Injected instructions, destructive or costly SQL | Parse and allow only one read-only statement; cost limits; least-privilege role | [Prompt-to-SQL injection](../../llm-learning-repository/tutorials/07-data-agents/39-prompt-to-sql-injection.md) |
| 6 | Over-broad access through a shared service account | Per-user identity or row-level security enforced in the warehouse | Vendor docs (identity passthrough is the default on most platforms) |
| 7 | A plausible but wrong number reaches a decision | Reconcile against a certified metric where one exists; show assumptions | (inference) |

## 4. Design the tool surface

A reasonable minimum, in order of preference:

| Tool | What it does | Notes |
|---|---|---|
| `get_metric(name, filters)` | Returns an approved metric with the reviewed definition | No model-written SQL; the safest path for numbers that drive decisions |
| `run_certified(query_id, params)` | Runs a reviewed, parameterised query | Declared parameters only; this is what a Unity Catalog function or a stored procedure gives you |
| `ask_data(question)` | Calls a managed service or your own NL2SQL | Return the SQL and the assumptions, not only the rows |
| `list_tables`, `describe_table`, `sample_rows` | Let the agent explore the schema | Short, bounded outputs; sample a few rows |
| `run_readonly_sql(sql)` | Executes one validated read-only statement | Last resort; row cap, timeout, cost estimate |

Design the **outputs** as carefully as the inputs, because the agent reads them. Return a row cap with the total row count, error messages that say how to repair the query, and an explicit "I cannot answer this reliably" result. The tool-interface lesson from [SWE-agent](../../llm-learning-repository/tutorials/06-agent-systems/26-swe-agent.md) applies: interface quality is a major lever. A runnable toy version of an exploration surface and of a read-only guard, executed on SQLite, is in the [FlexSQL](../../llm-learning-repository/tutorials/07-data-agents/36-flexsql.md) and [prompt-to-SQL injection](../../llm-learning-repository/tutorials/07-data-agents/39-prompt-to-sql-injection.md) guides.

## 5. Build or buy the NL2SQL function

There are four ways to supply the "answer a data question" capability. They differ in who carries the model risk.

| Shape | Examples | Who writes the SQL | You still build |
|---|---|---|---|
| **Certified function** | Unity Catalog functions, stored procedures, a metrics API | A person, once | The catalogue of questions you can ask |
| **Managed answer service** | Databricks Genie, the Microsoft Fabric data agent, Google's Conversational Analytics API | The vendor's model; it also executes and returns text, data or charts | Curation of the service's context, evaluation, governance |
| **Managed SQL generator** | Snowflake Cortex Analyst, Amazon Bedrock `GenerateQuery` | The vendor's model returns SQL; **you execute it** | Execution, validation, caps, curation |
| **Your own NL2SQL** | Your model (open or hosted) plus your semantic layer; open MCP database servers expose only schema and read-only SQL | Your model | Everything, including the semantic layer |

What the vendors document (read 2026-11-19; the [full comparison with sources](managed-functions.md) has the details and the gaps):

- **Every platform needs human-curated context** for good answers: table and column descriptions, example queries, instructions. Databricks states that users may still get incorrect results even with a correct integration.
- **Identity passthrough is the default** on Databricks, Snowflake, Google and Fabric (the caller's own permissions apply); AWS uses a service role.
- **Delivery differs and needs an adapter:** Databricks Genie's conversation API is asynchronous (start, then poll until completed, then fetch rows); Snowflake, Google and Genie One stream; Fabric uses MCP tasks for long requests.
- **Hard limits:** a Fabric data agent returns at most 25 rows by 25 columns; the BigQuery MCP tool caps at 3,000 rows; Google chat calls are limited to 30 per minute per project; Bedrock `GenerateQuery` to 2 requests per second.
- **Each service queries only its own platform's data.** An estate that spans platforms needs your own tool surface above them.
- **A governance caveat:** Databricks' workspace-level MCP endpoints (Public Preview) bypass Unity Gateway, so they do not appear in its tracing tables or support MCP-level grants and guardrails.
- **Status varies:** several of these are Preview or Beta (the Google API, the Genie One API, Databricks workspace MCP endpoints); read the current status before you commit.

**What arXiv shows about these products: nothing independent.** The research searched arXiv for the product names and for build-versus-buy studies and found no paper that evaluates or compares Genie, Cortex Analyst, the Fabric data agent, Google's data agents, ThoughtSpot or AWS services as products. What exists is vendor-authored work about model training and engines (Databricks' reinforcement-learning SQL model, Snowflake's Arctic-Text2SQL-R1 and Cortex AISQL) and academic benchmarks that use vendor warehouses as test environments. The headline accuracy figures for Genie and Cortex Analyst appear only in vendor blogs and press, on benchmarks that are not publicly downloadable; treat them as marketing claims. The search covered titles, abstracts and comments, not full text, so a product could be mentioned in a paper this search does not index.

**What to conclude (inference).**
1. arXiv cannot tell you managed beats build or the reverse. Any "buy" case rests on vendor numbers plus your own evaluation.
2. What the papers do show is where the difficulty lies: business definitions, ambiguity and large schemas. A managed service helps to the extent it supplies catalogue metadata, a semantic layer and governed access, and you must author that layer either way.
3. Use vendor catalogue, metadata and permission functions where they are the system of record. **Keep control of the semantic layer, the evaluation set and the agent's tool surface.**
4. Run each managed service, and your own NL2SQL, as a candidate in the same evaluation (Section 7), behind the same `ask_data` adapter. Switching then costs an adapter, not a rewrite.
5. If your data is open-weights-only or must not leave your boundary, the open-model path is supported by the papers (Arctic-Text2SQL-R1, OmniSQL, FlexSQL), but their benchmarks are noisy, so measure on your own warehouse.

## 6. Governance and security

| Rule | Why | Evidence |
|---|---|---|
| Run queries as the **end user** where the platform supports it, otherwise as a least-privilege service role per use case | The platform's own permissions then decide what is visible | Vendor docs: identity passthrough is the stated default on most platforms |
| Enforce **row-level security and column masking in the warehouse**, not in the prompt | Prompts are not a boundary | Vendors say database privileges are the real boundary (docs); one single-author preprint (2608.26157) treats governed definitions and row-level security together; we read only its abstract |
| **Validate every generated statement**: exactly one read-only statement, allow-listed objects, cost estimate, row and time caps | A "read-only" setting is a configuration, not a guarantee | [Prompt-to-SQL injection](../../llm-learning-repository/tutorials/07-data-agents/39-prompt-to-sql-injection.md) (paper); Google states that table selection "isn't a security setting" for database sources (docs) |
| Treat **data and documents as untrusted input** | Content can carry instructions aimed at the model | The same paper (2023-era models and libraries; the guide says what may differ now) |
| Check the **provenance of any fine-tuned or downloaded SQL model** | Poisoned fine-tuning data can plant a backdoor: 0.44% poisoned data gave a 79.41% attack success rate (paper abstract, 2503.05445) | Paper |
| **Audit** every call: who, what ran, cost, rows returned | Required for investigation and for erasure duties | (inference) |
| **Cap and shape results** | Large results are expensive, slow and leak more than needed | Fabric 25 by 25, BigQuery MCP 3,000 rows (docs) |

## 7. The evaluation you must build

Public benchmarks teach you what is hard; only your own set tells you whether it works on your warehouse.

1. **A gold set of 50 to 200 questions** with answers checked by someone who knows the data, spread across question types, including ambiguous, unanswerable and adversarial ones.
2. **Check the gold answers twice.** The annotation-error study above found error rates above 50% in two public benchmarks, so do not assume your own labels are clean.
3. **Run every candidate on the same set**: your own NL2SQL, each managed service, and certified functions where they apply.
4. **Report by question type**: result accuracy (compare the returned rows, not the SQL text), correct refusal or clarification, cost and latency per answered question, and a safety suite of injection attempts.
5. **Re-run on every change** to the semantic layer, the model or the vendor service.

## 8. Defaults by situation

Hypotheses to test, not decisions. Use the [selection method](../../architecture-evolution/language-and-framework-selection.md) for the language and framework, and the [blueprint](../../architecture-evolution/blueprint/README.md) to explore the options.

| Situation | Starting point |
|---|---|
| One warehouse, a vendor data agent is available, and you can curate its context | Managed answer service behind your `ask_data` adapter, plus certified metrics for the numbers that matter |
| Data across several platforms | Your own tool surface over each platform's catalogue and permission functions; do not rely on one vendor's agent to see everything |
| Open models only, or data must stay inside your boundary | Your own NL2SQL with an open model and a semantic layer; start from the open-model papers, but evaluate on your data |
| High-stakes numbers (finance, regulatory) | Certified functions and approved metrics only; allow NL2SQL for exploration, clearly labelled as unverified |
| Early prototype | `run_readonly_sql` with a low-privilege role, row and time caps, and a small gold set, to learn where the questions and the failures are |

## 9. What this does and does not establish

- **No vendor service was run.** Facts come from official documentation read on 2026-11-19 by a research agent and were not re-verified line by line. Pricing amounts, several rate limits and the general-availability status of some services could not be confirmed; the [comparison](managed-functions.md) lists them.
- **The arXiv search was at the level of titles, abstracts and comments.** Absence of a paper on a vendor product is not proof that none exists.
- **Two cited papers are small preprints** (a two-author semantic-layer benchmark of 100 questions on one dataset, and a single-author governance framework). They are directional evidence only.
- **The example code ran on SQLite with constructed data.** It shows the idea, not a production guard.
- **Defaults by situation are untested hypotheses.**

## Related

- [Data agents stage](../../llm-learning-repository/tutorials/07-data-agents/README.md): the eight paper guides behind this pattern
- [Managed functions comparison](managed-functions.md): the vendor facts with sources
- [Runtime reference architecture](../runtime-architecture/README.md) and [framework comparison](../frameworks/README.md)
- [Language and framework selection](../../architecture-evolution/language-and-framework-selection.md)
