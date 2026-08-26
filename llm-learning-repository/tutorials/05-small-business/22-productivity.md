# The Impact of AI on Developer Productivity: Evidence from GitHub Copilot

> **Paper:** Peng et al. · arXiv:2302.06590 · [abstract](https://arxiv.org/abs/2302.06590) · [local PDF](../../papers/2302.06590.pdf)
>
> **Why it is here:** controlled evidence about AI-assisted software-development speed. Read after the preceding items in the roadmap.

## One-picture map

```mermaid
flowchart LR
  A["developers randomly assigned"] --> B["Copilot or control"]
  B["Copilot or control"] --> C["coding task"]
  C["coding task"] --> D["time + correctness"]
```

## Tutorial 1 — intuitive understanding

Developers were randomly given access to an AI pair programmer or not; the assisted group completed a bounded coding task substantially faster on average.

Ask three questions while reading: What problem existed before this work? What changed? What new risk or limitation appeared? Explain the diagram aloud without technical vocabulary. If you can give a familiar-life example and one counterexample, the intuition is strong enough to continue.

## Tutorial 2 — practitioner context

Pilot on representative maintenance tasks, randomize access where possible, measure completion time plus correctness and review effort, and segment by experience without treating one short task as universal proof.

### Build-and-test exercise

Create the smallest experiment that contrasts the paper's idea with a baseline. Write down the input, expected output, success metric, cost ceiling, and a failure taxonomy before running it. Keep model, prompt, data, code, and environment versions together in source control.

### Production questions

- What data crosses a trust boundary?
- What happens on timeout, malformed output, or partial failure?
- Which metric represents user value rather than benchmark convenience?
- Can a person inspect, override, and audit the result?

## Tutorial 3 — researcher depth

Inspect randomization, sample selection, censoring and completion-time analysis, heterogeneous effects, task realism, novelty effects, and external validity for long-lived repositories.

Reconstruct one central table or figure before proposing an extension. Record the exact dataset split, statistical unit, random seeds, inference settings, uncertainty interval, and compute budget. Then change one assumption at a time. A useful research note separates **claim**, **evidence**, **assumption**, **alternative explanation**, and **next experiment**.

### Mathematical lens

Treat a model as a conditional distribution $p_\theta(y\mid x)$, an evaluation as an estimator over sampled tasks, and an agent as a policy acting on observations. Identify which variables are observed, hidden, controlled, and confounded in this paper. Use the [math bridge](../../references/math-bridge.md) whenever notation becomes the obstacle rather than the idea.

## Reading protocol

1. Read the abstract, introduction, and conclusion; write the claim in one sentence.
2. Inspect every figure and table; state what comparison each supports.
3. Read methods and evaluation; list assumptions and threats to validity.
4. Complete the exercise and add a one-page research memo.

## Checkpoint

You are ready to move on when you can teach the intuition in five minutes, implement or evaluate a toy version, and name at least two ways the main conclusion could fail to generalize.
