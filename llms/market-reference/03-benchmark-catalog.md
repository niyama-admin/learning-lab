# Benchmark catalog

## How to read a benchmark result

A useful result identifies the complete evaluated system:

```text
result = model version
       + reasoning effort
       + agent/scaffold
       + tools and permissions
       + prompt and context policy
       + token/time budget
       + dataset version
       + grader and pass rule
```

Report quality together with tokens, billed cost, wall time, retries, and confidence intervals. Never splice a quality score from one run to the cost from another.

## Coding, repository, and terminal work

| Benchmark | Unit and metric | What it is useful for | What it misses / common misuse |
|---|---|---|---|
| [SWE-bench](https://www.swebench.com/) / Verified | Real GitHub issue and repository; percent resolved by tests | Repository-scale issue resolution, editing, debugging | Public-data contamination; primarily Python; scaffold and budget strongly affect score; passing tests may not mean maintainable change |
| [SWE-bench Multilingual](https://www.swebench.com/) | Issue resolution across additional programming languages | Language/ecosystem breadth | Still not a substitute for an organization’s repositories and review rules |
| [SWE-Lancer](https://evals.openai.com/) | Freelance engineering tasks associated with real payouts | Economic framing of engineering tasks | Historical market tasks and a particular scaffold do not measure team collaboration or lifetime maintenance |
| [Terminal-Bench](https://www.frontierbench.ai/) | Hard terminal tasks; verified resolution rate, tokens and cost | Long-horizon command-line work and agent execution | Internet/tool policy and environment version matter; terminal success is broader than code quality |
| [LiveCodeBench](https://livecodebench.github.io/) | Recently released competitive-programming problems; pass rates | Reducing contamination in code reasoning comparisons | Small self-contained problems, not repository engineering |
| [HumanEval](https://github.com/openai/human-eval) | Function-generation problems; pass@k | Cheap smoke test and historical continuity | Saturated, easily contaminated, narrow, and poor for agent selection |
| [RepoBench](https://github.com/Leolty/repobench) | Repository-level completion/retrieval tasks | Cross-file context and repository completion | Does not cover the full issue-to-reviewed-merge workflow |
| Aider polyglot benchmark | Editing exercises across languages; test-based pass | Practical edit format and language coverage | Tied to an editing workflow; not a neutral measure of every coding product |

For source-control automation, add private tests for branch discipline, minimal diffs, preservation of unrelated changes, secret handling, migration safety, commit quality, review response, and rollback. A correct patch can still be an unsafe pull request.

## Agents and business software

| Benchmark | Environment | Measures | Use in selection | Limitation |
|---|---|---|---|---|
| [τ-bench](https://taubench.com/) | Simulated users, policy, database, and domain APIs | Multi-turn tool-agent-user task completion and policy compliance | Customer service and transactional assistants | Simulated users and selected retail/airline/telecom/banking domains are not your policy corpus |
| [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) | Tool/function schemas and calls | Function selection, arguments, relevance, multi-turn/tool patterns | Tool-call parser and API-routing shortlist | Correct syntax does not prove end-to-end business outcome or authorization safety |
| [CRMArena / CRMArena-Pro](https://github.com/SalesforceAIResearch/CRMArena) | Salesforce-like CRM with realistic synthetic data | Service, sales, CPQ, personas, workflows and API actions | CRM agent selection and failure analysis | Research-use terms and platform-specific workflow; deployment needs private CRM evals |
| [WorkArena / WorkArena++](https://github.com/ServiceNow/WorkArena) | ServiceNow browser tasks | Atomic and compositional knowledge-work tasks | Enterprise web navigation, forms, catalogs, knowledge bases | UI and instance behavior are platform-specific; security/approval behavior needs custom tests |
| [OSWorld](https://os-world.github.io/) | Real computer environments | GUI computer use across applications | Desktop automation shortlist | Environment brittleness and destructive-action safety need separate analysis |
| [GAIA](https://gaia-benchmark.github.io/) | Real-world questions requiring reasoning, tools, and research | General assistant problem solving | Research-agent smoke test | Correct final answers do not fully score audit trail, cost, or enterprise policy |
| [MCP-Universe](https://github.com/SalesforceAIResearch/MCP-Universe) | MCP servers, tasks, execution evaluators | Agent interaction with real-world tool surfaces | MCP client/agent integration | Server selection and permissions must match the production topology |

## Economically valuable and office work

| Benchmark | Work product | Best use | Qualification |
|---|---|---|---|
| [GDPval](https://evals.openai.com/) | Documents, slides, diagrams, spreadsheets and other deliverables across 44 occupations | Broad professional-work quality and human comparison | Provider-originated benchmark; public gold subset is 220 of 1,320 tasks; expert preference and rubric grading are not operating ROI |
| SpreadsheetBench | Spreadsheet manipulation tasks | Formula, cleanup, filtering, layout and workbook-agent testing | Public tasks may not reflect financial controls, macros, workbook scale, or style rules |
| [WorkArena++](https://github.com/ServiceNow/WorkArena) | Multi-step enterprise workflows | Planning and execution inside business software | Platform-bound and not a measure of unassisted document quality |
| [CRMArena-Pro](https://github.com/SalesforceAIResearch/CRMArena) | CRM scenarios and interactions | Business-process agent testing | Validate dataset/research-use terms before commercial reuse |

GDPval is useful precisely because it moves toward work products, but deployment still requires measuring verified human time saved, review time, failure remediation, and adoption.

## Documents and knowledge systems

| Benchmark | Measures | Appropriate workloads | Missing production concerns |
|---|---|---|---|
| [DocVQA / DocVQA 2026](https://www.docvqa.org/) | Answers grounded in document images; newer competition adds multi-domain, spatial and multi-hop reasoning | Scanned documents, forms, charts, reports | Extraction schemas, confidence calibration, privacy, page cost, abstention |
| OCRBench | OCR-related multimodal capabilities | OCR/VLM model shortlist | End-to-end document workflow and exception handling |
| ChartQA | Questions requiring chart perception and reasoning | Reports, dashboards, finance charts | Data lineage and numerical verification |
| ContractNLI | Natural-language inference over contracts | Contract clause and entailment prototypes | Jurisdiction, advice quality, retrieval, citations, current law |
| CUAD | Contract review clause extraction | Due-diligence extraction | It does not certify legal interpretation or negotiation quality |
| RAGAS / retrieval metrics | Retrieval faithfulness and relevance components | RAG iteration and diagnostics | LLM judges can be biased; component scores do not equal a correct business decision |

## Finance, legal, and wealth

| Benchmark | Task | Good use | Non-negotiable extension |
|---|---|---|---|
| [FinanceBench](https://arxiv.org/abs/2311.11944) | Open-book QA over financial documents | Filing retrieval and financial reasoning | Recalculate answers; add current documents, citations, abstention and access controls |
| FinQA / ConvFinQA | Numerical reasoning over financial reports, including conversational form | Arithmetic and multi-step reasoning | Add spreadsheet/tool execution and tolerance-aware deterministic checks |
| [LegalBench](https://github.com/HazyResearch/legalbench) | 162 tasks across six legal-reasoning types | Legal capability research and vocabulary | Not legal advice, jurisdictional currency, matter context, confidentiality, citation or professional responsibility |
| CUAD / ContractNLI | Clause extraction and contract inference | Contract-analysis pipeline components | Expert review and matter-specific acceptance rules |

There is no public leaderboard that certifies a model as suitable for personal financial advice, wealth management, fiduciary work, tax advice, or legal advice. Use these benchmarks only to identify components. A production evaluation needs jurisdiction, product eligibility, suitability, numerical correctness, source/date citations, conflicts, disclosure, privacy, audit trail, abstention, and mandatory human approval.

## Image and video generation

| Benchmark / method | Measures | Use | Limitation |
|---|---|---|---|
| T2I-CompBench / GenAI-Bench-style prompt suites | Compositional prompt following and human preference | Image model shortlist | Aesthetic and brand preferences are organization-specific; benchmark prompts rarely include rights workflow |
| Human pairwise preference with a fixed brief | Accepted preference and reason codes | Brand, product and campaign work | Requires blinded/randomized review and enough samples |
| [VBench / VBench 2.0](https://github.com/Vchitect/VBench) | Video quality dimensions including temporal consistency, motion, prompt alignment, physics and intrinsic faithfulness | Text-to-video and image-to-video shortlist | Automated metrics do not replace creative approval, rights, safety, editability or usable duration |

For generative media, always report `cost per accepted asset` and `cost per accepted second`, including every discarded candidate, extension, upscale, edit, download, and reviewer minute.

## Architecture, engineering, and design

| Benchmark | Coverage | Appropriate use | Limitation |
|---|---|---|---|
| [aec-bench](https://www.aecbench.com/) | Agent tasks in civil, electrical, ground, mechanical, structural and maritime engineering | Emerging engineering-agent evaluation with executable tasks | New benchmark; inspect task provenance, standard versions, grader and coverage before relying on a leaderboard |
| [AECBench](https://github.com/ArchiAI-LAB/AECBench) | AEC-domain knowledge and open-ended tasks | Domain knowledge/reasoning comparison | Knowledge scores do not establish safe design or code compliance |
| DocVQA 2026 | Spatial reasoning over maps, drawings and document layouts among multiple domains | Drawing/document understanding component | Does not validate a buildable coordinated design |

Architecture and industry design need private project-style evaluations: requirements traceability, code/standard edition, units, load assumptions, calculation reproducibility, drawing/BIM consistency, cross-discipline clashes, accessibility, constructability, cost, embodied carbon, and licensed-professional approval. Prefer deterministic engineering tools with the model explaining and orchestrating, not inventing numeric results.

## Benchmark selection matrix

Choose at least one public capability benchmark and one private outcome suite.

| Intended system | Public evidence | Required private outcome suite |
|---|---|---|
| Coding assistant | SWE-bench + Terminal-Bench + language coverage | Recent internal issues, tests, review quality, security and source-control rules |
| Customer-service agent | τ-bench + CRMArena | Actual policies, tools, escalation, PII and adversarial customers |
| Office agent | GDPval + WorkArena/SpreadsheetBench | Representative deliverables, templates, approval and time-motion study |
| Document/finance RAG | DocVQA + FinanceBench + retrieval metrics | Current private corpus, citations, arithmetic, permissions, abstention |
| Legal support | LegalBench + CUAD/ContractNLI | Jurisdiction/matter set with counsel-defined rubric and approval |
| Image/video production | Prompt suite + human preference + VBench | Brand brief, rights/safety, editability, acceptance and media economics |
| AEC/design assistant | aec-bench/AECBench + document/spatial tasks | Current standards and project artifacts with licensed expert review |

## Minimum result record

- candidate system and immutable version;
- dataset/task revision and split;
- prompt, tools, permissions, scaffold, environment, and reasoning level;
- input, cache read/write, output, reasoning, tool, media, and retry usage;
- pass/acceptance rule and grader identity;
- per-task traces and categorized failures;
- quality, acceptance, latency, cost, and human time with uncertainty;
- contamination assessment and conflicts of interest;
- run date and reproducibility instructions.
