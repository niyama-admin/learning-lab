# Large Language Model based Multi-Agents: A Survey of Progress and Challenges

> **Paper:** Guo et al. · arXiv:2402.01680 · [abstract](https://arxiv.org/abs/2402.01680) · [local PDF](../../papers/2402.01680.pdf)
>
> **Why it is here:** the design space and open problems of LLM multi-agent systems. Read after the preceding items in the roadmap.

## One-picture map

```mermaid
flowchart LR
  A["agents + topology + channels + shared world"] --> B["coordination dynamics"]
  B["coordination dynamics"] --> C["outcome"]
```

## Tutorial 1 — intuitive understanding

A swarm is not magic multiplication: adding more agents creates specialization opportunities and also more chances for misunderstanding.

Ask three questions while reading: What problem existed before this work? What changed? What new risk or limitation appeared? Explain the diagram aloud without technical vocabulary. If you can give a familiar-life example and one counterexample, the intuition is strong enough to continue.

## Tutorial 2 — practitioner context

Choose centralized, hierarchical, or peer-to-peer orchestration; define memory, message channels, budgets, failure containment, and a single-agent baseline.

### Build-and-test exercise

Create the smallest experiment that contrasts the paper's idea with a baseline. Write down the input, expected output, success metric, cost ceiling, and a failure taxonomy before running it. Keep model, prompt, data, code, and environment versions together in source control.

### Production questions

- What data crosses a trust boundary?
- What happens on timeout, malformed output, or partial failure?
- Which metric represents user value rather than benchmark convenience?
- Can a person inspect, override, and audit the result?

## Tutorial 3 — researcher depth

Develop hypotheses about diversity, communication bandwidth, consensus, emergent behavior, correlated failures, and scaling laws for coordination.

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
