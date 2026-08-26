# Methodical learning roadmap

Plan for 12 weeks at 6-8 hours per week. A faster reader can compress it, but preserve the order and checkpoints.

| Weeks | Papers | Intuition outcome | Practitioner artifact | Research artifact |
|---|---:|---|---|---|
| 1-2 | 1-5 | Explain tokens, attention, pretraining, and scaling | Tiny attention notebook or spreadsheet; compute/data budget memo | Derive attention and fit a simple scaling curve |
| 3-4 | 6-10 | Explain retrieval, prompting, alignment, adaptation, and tool use | Cited RAG prototype with eval set and bounded tool loop | Ablation plan separating retrieval, generator, and policy effects |
| 5-6 | 11-13 | Explain why one score is insufficient | Scenario-by-metric evaluation matrix | Validity and uncertainty critique of one benchmark |
| 7-8 | 14-16 | Explain code tests versus real repository work | Containerized code-agent evaluation on a small repo | Error taxonomy and benchmark-contamination analysis |
| 9-10 | 17-21 | Explain roles, channels, swarms, MCP, and A2A | Two-agent workflow with typed messages, approval, and audit trail | Single-agent control, topology ablation, and threat model |
| 11 | 22-23 | Explain measured productivity versus marketing claims | Small-business pilot design with baseline and stop criteria | Causal diagram and external-validity critique |
| 12 | all | Teach the whole stack end to end | Capstone, evaluation report, and operating runbook | Reproducible research proposal with preregistered hypotheses |

## Weekly rhythm

- **Session A:** Tutorial 1, paper abstract/introduction/conclusion, five-minute teach-back.
- **Session B:** Tutorial 2, key methods/results, smallest useful implementation.
- **Session C:** Tutorial 3, equations/validity, reproduce one result or design an ablation.
- **Review:** Update a concept map and an error log; revisit weak prerequisites.

## Promotion gates

### Intuition → practitioner

You can describe attention, RAG, evaluation, and an agent loop without jargon; distinguish a model from the system around it; and name one failure mode for each.

### Practitioner → researcher

You can implement a baseline, version all inputs, choose outcome-aligned metrics, report uncertainty and cost, construct an error taxonomy, and explain why observed results may not be causal or generalizable.

### Research-ready capstone

Build a small-business assistant that retrieves from an approved document set, calls one bounded tool through MCP, delegates one task through an A2A-style interface, and records a trace. Compare it with (1) no AI, (2) a single prompted model, and (3) the multi-component system. Measure quality, completion time, cost, unsafe attempts, human corrections, and failure recovery.
