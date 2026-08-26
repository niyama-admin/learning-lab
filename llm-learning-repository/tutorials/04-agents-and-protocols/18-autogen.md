# AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation

> **Paper:** Wu et al. · arXiv:2308.08155 · [abstract](https://arxiv.org/abs/2308.08155) · [local PDF](../../papers/2308.08155.pdf)
>
> **Why it is here:** programmable conversable-agent workflows. Read after the preceding items in the roadmap.

## One-picture map

```mermaid
flowchart LR
  A["user channel"] --> B["coordinator"]
  B["coordinator"] --> C["specialist/tool channels"]
  C["specialist/tool channels"] --> D["shared transcript"]
  D["shared transcript"] --> E["result"]
```

## Tutorial 1 — intuitive understanding

AutoGen treats a workflow as a group chat whose members can be people, models, or tools, each with a defined responsibility.

Ask three questions while reading: What problem existed before this work? What changed? What new risk or limitation appeared? Explain the diagram aloud without technical vocabulary. If you can give a familiar-life example and one counterexample, the intuition is strong enough to continue.

## Tutorial 2 — practitioner context

Design message schemas, routing, human approval, tool permissions, termination, retries, and trace storage; make each channel observable and testable.

### Build-and-test exercise

Create the smallest experiment that contrasts the paper's idea with a baseline. Write down the input, expected output, success metric, cost ceiling, and a failure taxonomy before running it. Keep model, prompt, data, code, and environment versions together in source control.

### Production questions

- What data crosses a trust boundary?
- What happens on timeout, malformed output, or partial failure?
- Which metric represents user value rather than benchmark convenience?
- Can a person inspect, override, and audit the result?

## Tutorial 3 — researcher depth

Represent conversations as event-driven graphs; analyze topology, scheduling, memory consistency, cascading failures, and evaluation of entire trajectories.

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
