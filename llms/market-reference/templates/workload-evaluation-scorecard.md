# Workload evaluation scorecard

Copy this file into an experiment directory. Freeze sections 1–4 before evaluating candidates.

## 1. Decision

| Field | Value |
|---|---|
| Workload and owner | |
| Decision deadline | |
| Snapshot date | |
| Expected monthly volume | |
| Data classification / regions | |
| Current process | |
| Decision options | |

## 2. Accepted outcome

| Field | Definition |
|---|---|
| Observable outcome | |
| Minimum quality | |
| Deterministic checks | |
| Human approval | |
| Maximum latency | |
| Critical failures (automatic disqualification) | |
| Value per accepted outcome and basis | |

## 3. Representative sample

| Cohort | Population share | Sample count | Risk/complexity | Selection method |
|---|---:|---:|---|---|
| Ordinary | | | | |
| Difficult | | | | |
| High-risk | | | | |
| Edge/adversarial | | | | |

Record date range, exclusions, contamination risk, and why the sample represents production.

## 4. Human baseline

| Metric | Result | Method / confidence |
|---|---:|---|
| Acceptance rate | | |
| Critical-failure rate | | |
| Minutes per accepted outcome P50 / P95 | | |
| Rework minutes | | |
| Loaded labor cost per accepted outcome | | |
| Accepted outcomes per employee-hour | | |

## 5. Candidate configuration

Treat different scaffolds, tools, reasoning levels, prompts, or fallback policies as different systems.

| Field | Candidate A | Candidate B | Candidate C |
|---|---|---|---|
| Provider/platform | | | |
| Immutable model version | | | |
| Access / region | | | |
| Prompt/scaffold revision | | | |
| Reasoning / token budget | | | |
| Tools and permissions | | | |
| Retrieval corpus revision | | | |
| Retry / fallback policy | | | |
| Input $/M | | | |
| Cached input $/M | | | |
| Output $/M | | | |
| Tool/media/cache-storage price | | | |
| Price source and date | | | |

## 6. Results

| Metric | Candidate A | Candidate B | Candidate C |
|---|---:|---:|---:|
| Attempted / accepted outcomes | | | |
| Acceptance rate + interval | | | |
| Critical failures | | | |
| Mean attempts per case | | | |
| Billed tokens per accepted outcome | | | |
| Tool/media units per accepted outcome | | | |
| Operating cost per accepted outcome | | | |
| Reviewer minutes per accepted outcome | | | |
| Remediation minutes per accepted outcome | | | |
| Fully loaded cost per accepted outcome | | | |
| P50 / P95 wall time | | | |
| Verified productive hours gained | | | |
| Operating cost per productive hour gained | | | |
| Program cost per productive hour gained | | | |
| Accepted outcomes per employee-hour | | | |
| Expected failure loss | | | |
| Net value / ROI | | | |

## 7. Failure analysis

| Category | Count | Severity | Detection | Cost / time | Proposed control |
|---|---:|---|---|---:|---|
| Incorrect content/calculation | | | | | |
| Missing/false citation | | | | | |
| Tool/action error | | | | | |
| Policy/authorization violation | | | | | |
| Format/deliverable defect | | | | | |
| Timeout/loop | | | | | |
| Reviewer disagreement | | | | | |

## 8. Sensitivity

Recalculate the decision under:

- 0.5×, 1×, 2×, and 5× expected volume;
- observed confidence bounds for acceptance;
- 20% price increase and tokenizer/usage variation;
- lower/higher utilization for self-hosting;
- P95 rather than mean review and latency;
- doubled impact of severe failures;
- model retirement and provider fallback.

## 9. Decision record

```text
Selected system:
Why it wins at the accepted-outcome level:
Hard gates passed:
Known residual risks:
Rollout limit and human control:
Monitoring thresholds:
Rollback/fallback:
Reevaluation triggers:
Approvers:
```

Attach case-level data, prompts, configuration, output traces, grader instructions, reviewer notes, calculations, and source snapshots.
