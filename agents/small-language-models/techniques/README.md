# Technique explainers

One explainer per technique, each in the lab's three-level paper-guide form: **Tutorial 1** for a reader with no computer-science background, **Tutorial 2** for someone who will build or buy, **Tutorial 3** for someone who wants the formal setup and the evidence table by table. Each starts with a worked example, defines its words, and ends with a reading map for the source papers, eight or more reader questions, and a checkpoint.

These are the SLM-project view of each technique. Where the lab already has a full paper guide (for example [LoRA](../../../llm-learning-repository/tutorials/02-building/09-lora.md)) the explainer links to it and adds tooling, serving, failure modes and the adopt-or-skip decision.

Written 2026-11-26. Authoring rules: [AUTHORING.md](AUTHORING.md); structure check: `node agents/small-language-models/techniques/verify-techniques.mjs` from the repository root. Numbers were checked against the cited papers and documentation at writing time; anything not confirmed is marked "unverified" in the text. Preprints and vendor claims are labelled as such.

## Changing the weights

| # | Explainer | One line |
|---|---|---|
| 01 | [Full fine-tuning and supervised fine-tuning](01-full-fine-tuning-and-sft.md) | Update every weight on (input, ideal output) pairs; the baseline everything else is compared with |
| 02 | [LoRA](02-lora.md) | Freeze the model, train two thin matrices per layer, optionally merge them back |
| 03 | [QLoRA](03-qlora.md) | LoRA on a 4-bit base so a mid-size model trains on one modest GPU |
| 04 | [DoRA](04-dora.md) | LoRA that separates a weight's size from its direction |
| 05 | [Adapters, prefix and prompt tuning](05-adapters-prefix-prompt-tuning.md) | The older parameter-efficient methods and why LoRA largely replaced them |
| 06 | [Preference tuning](06-preference-tuning.md) | DPO, ORPO, KTO: teach "prefer this answer to that one" |
| 07 | [Reinforcement learning with verifiable rewards](07-rl-with-verifiable-rewards.md) | GRPO and relatives: a deterministic checker supplies the reward |
| 08 | [Distillation](08-distillation.md) | A small student learns from a larger teacher, with the terms-of-use caveat |
| 15 | [PEFT methods and the Hugging Face stack](15-peft-methods-and-the-hugging-face-stack.md) | The full PEFT library catalogue (LoRA variants, IA3, VeRA, LoHa, LoKr, OFT, AdaLoRA and more), how Transformers, PEFT, TRL, bitsandbytes and Accelerate fit together, and how to choose |
| 13 | [Continued pretraining](13-continued-pretraining.md) | Train on a large pile of domain text before tuning |

## Changing the model, its size, or how it runs

| # | Explainer | One line |
|---|---|---|
| 09 | [Quantization: post-training and quantization-aware](09-quantization-ptq-and-qat.md) | Store weights in fewer bits so the model fits and runs faster |
| 10 | [Mixture of experts](10-mixture-of-experts.md) | Route each token to a few experts: big total, small active |
| 11 | [Model merging](11-model-merging.md) | Combine tuned models' weights without training |
| 12 | [Pruning and compression](12-pruning-and-compression.md) | Cut a large model down, then retrain to recover |
| 14 | [Constrained decoding](14-constrained-decoding.md) | Restrict the tokens the model may emit so output always matches a schema |

Back to the [section overview](../README.md) and [options and trade-offs](../01-options-and-trade-offs.md).
