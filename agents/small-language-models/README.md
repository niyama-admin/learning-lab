# Small language models for the enterprise: fine-tuning, tools and vehicles

What it takes to build a small language model (SLM) for an enterprise, deploy it, keep it running, what tools it can use, what the options cost you, and what carries it (the "vehicle") from a training run to a user.

Status: written 2026-11-26. Tool, licence and price facts move monthly; each file says what was verified and what was not. Anything marked **unverified** was not confirmed against a primary source. Treat anything older than 90 days as a prompt to re-check. Nothing here is legal advice.

## 1. The answer first

**Fine-tune an SLM to fix a behaviour, never to store knowledge, and only after prompting and context have been tried and measured.** The strongest verified evidence supports fine-tuned small models on narrow, well-defined tasks (output format, extraction, classification, routing, style). It does not support them as a knowledge store: a study comparing the two found retrieval beat unsupervised fine-tuning on both known and new facts ([Ovadia et al., arXiv 2312.05934](https://arxiv.org/abs/2312.05934)). Most published "small beats frontier" results are vendor-reported (see [01](01-options-and-trade-offs.md#6-what-the-evidence-says)).

**The model is the cheap part.** A LoRA (low-rank adaptation) run on a 4B to 8B model costs single-digit to low-double-digit dollars of GPU time ([worked arithmetic in 04](04-build-and-deploy-playbook.md#3-what-it-costs)). What costs money and calendar time is the labelled data, the evaluation set that tells you whether the model is better, the serving platform, and the people who keep all three current. A team that budgets for GPUs and not for those is budgeting for the wrong thing.

**Decision ladder, cheapest rung first:**

| Rung | Change | Try it when | Reversible in |
|---|---|---|---|
| 1 | Better prompt and schema | The model can do the task but gets the format wrong | Minutes |
| 2 | Context and retrieval (examples, documents, memory) | The model lacks facts that exist in your documents | Hours |
| 3 | Constrained decoding (grammar or JSON schema) | Output must always parse | Hours |
| 4 | Fine-tune a small model (LoRA) | Rungs 1 to 3 plateau, the task is narrow and repeated at volume, and you can score it automatically | Days (retrain) |
| 5 | Full fine-tune, continued pretraining, or training from scratch | You have millions of domain tokens and a team that runs training clusters | Weeks to never |

Most enterprises should stop at rung 3 for most tasks and use rung 4 for one or two high-volume, narrow ones. Rung 5 is rarely justified by anything an enterprise knows today.

**What you are buying with an SLM, in order of how often it is the real reason:**

1. **Data stays where it is.** The model runs inside your boundary or on the user's device. This is a procurement and privacy win, not an accuracy win.
2. **Cost and latency at volume.** A 4B to 8B model on one GPU (or a laptop) answers in a fraction of the time and cost of a large hosted model, for the narrow task it was tuned on.
3. **Control.** You pin the weights; the behaviour does not change when a vendor updates a hosted model.
4. **Format reliability.** Tuning plus constrained decoding makes structured output dependable.

What you give up: general capability, free upgrades when a better base model ships (every base change means re-tuning and re-evaluating), and the vendor carrying the operations.

## 2. What it takes, on one page

| Need | What it actually is | Where it is covered |
|---|---|---|
| A task definition a machine can score | An output schema plus deterministic checks (exact match, parsers, invariants). Not "looks good" | [04 §1](04-build-and-deploy-playbook.md#1-the-phases) |
| Labelled data | Hundreds to low thousands of examples for a narrow task is the usual range (**not verified against a source**; treat as a starting hypothesis and measure the learning curve) | [04 §2](04-build-and-deploy-playbook.md#2-data) |
| A held-out evaluation set | Split by the thing you will meet new in production (a new customer, a new format), not by file | [04 §4](04-build-and-deploy-playbook.md#4-evaluation) |
| A base model with a licence you can live with | Apache 2.0 families are simplest; custom licences carry attribution and use restrictions into your derivative | [01 §4](01-options-and-trade-offs.md#4-choosing-a-base-model) |
| Training compute | One 24 to 80 GB GPU for LoRA on 4B to 14B; an Apple-silicon laptop with enough memory works for small runs | [02 §1](02-tools.md#1-training-tools) |
| A vehicle: artifact plus runtime plus channel | Adapter or merged weights, quantized, served by vLLM, llama.cpp, Ollama or an on-device runtime | [03](03-vehicles.md) |
| Operations | Versioning, rollback, drift monitoring, re-evaluation on every base or data change | [04 §6](04-build-and-deploy-playbook.md#6-operating-it) |
| Governance | Training-data rights, licence record, model provenance, load-time code review | [04 §5](04-build-and-deploy-playbook.md#5-governance) |

## 3. Files in this section

| File | Question it answers |
|---|---|
| [01 Options and trade-offs](01-options-and-trade-offs.md) | Which customisation method, which base model, and what does each cost you? Pros and cons side by side, plus the evidence |
| [02 Tools](02-tools.md) | Which tools train, which host training, and what tools can the resulting model call? |
| [03 Vehicles](03-vehicles.md) | What carries an SLM to a user: the artifact, the runtime, the delivery channel, and the role it plays in an agent system |
| [04 Build and deploy playbook](04-build-and-deploy-playbook.md) | Phases, data, cost arithmetic, evaluation, governance, operations, and a measured case from our own experiments |

## 4. How this connects to the rest of the lab

- The mechanism behind LoRA and its limits: [LoRA guide](../../llm-learning-repository/tutorials/02-building/09-lora.md). Full fine-tuning at scale: [InstructGPT](../../llm-learning-repository/tutorials/02-building/08-instructgpt.md).
- The alternative that changes context and not weights: [Agentic Context Engineering](../../llm-learning-repository/tutorials/06-agent-systems/31-agentic-context-engineering.md) and the [context-management theme](../../themes/context-management/README.md).
- Choosing a model by outcome economics: [LLM market reference](../../llms/market-reference/README.md), especially [open weights and Hugging Face](../../llms/market-reference/02-open-weights-and-hugging-face.md) and [token-to-outcome economics](../../llms/market-reference/05-token-to-outcome-economics.md).
- The runtime an SLM plugs into: [agent languages](../languages/README.md), [frameworks](../frameworks/README.md), [runtime architecture](../runtime-architecture/README.md).
- The agentic-engineering theme: [themes/agentic-engineering](../../themes/agentic-engineering/README.md).
