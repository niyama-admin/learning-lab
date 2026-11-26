# 01. Options and trade-offs

Every way to make a small language model (SLM) do an enterprise job, with what each costs you. Verification status is marked per item; "unverified" means no primary source was confirmed on 2026-11-26.

## 1. First decide whether to change weights at all

| Approach | What changes | Pros | Cons |
|---|---|---|---|
| Prompting and schema | The text sent | Zero training; instant; works on any model | Brittle across models; long prompts cost tokens on every call; plateaus |
| Retrieval and context (RAG, memory, examples) | What the model reads | Adds facts that change daily; auditable (you can show the source); no training | Needs a retrieval pipeline and evaluation; context length and cost grow; does not fix format or style by itself |
| Constrained decoding | Which tokens may be produced | Guarantees the output parses against a grammar or JSON Schema | Guarantees shape, not truth; a wrong answer can be perfectly formatted |
| **Fine-tuning** | The model's numbers | Fixes behaviour, format, tone, tool-call habits; shorter prompts; small model can match a large one on a narrow task | Needs data and an eval set; does not reliably add facts; you own versioning and re-tuning; can forget general skills |
| Continued pretraining or training from scratch | Most or all numbers on large text | Can teach a domain's vocabulary at scale | Needs millions to billions of tokens and cluster-scale operations; almost never the enterprise's best use of money |

**Judgment, supported by [Ovadia et al.](https://arxiv.org/abs/2312.05934) (retrieval beat unsupervised fine-tuning for both known and new knowledge):** use retrieval for *what the model should know*, fine-tuning for *how the model should behave*. A tuned model that reads retrieved context is the common end state.

The pros and cons in the table above are this guide's summary (**Judgment**); statements that carry a link are sourced.

## 2. When to consider an SLM, and when not to

The two lists below are **Judgment** built on the cited evidence; factual statements inside them carry links.

**Consider an SLM when:**

- The task is narrow, repeated, and you can score it automatically (exact match, a parser, an invariant).
- Data must stay inside your boundary, on the device, or offline (privacy, contract, air gap).
- Volume is high enough that per-call cost or latency decides the economics (see the break-even arithmetic in [04 §3](04-build-and-deploy-playbook.md#3-what-it-costs); a dedicated GPU only pays back at billions of tokens a month).
- You need behaviour pinned: the same weights tomorrow as today, not a hosted model that changes under you.
- Output must always parse, which tuning plus [constrained decoding](techniques/14-constrained-decoding.md) delivers.
- The model's role is router, extractor, classifier, guard or specialist worker, and a deterministic verifier or a human gates what it produces (see [03 §5](03-vehicles.md#5-role-what-the-slm-does-in-the-agent-system)).
- Many similar tasks can share one base model through adapters.
- You have, or can build, an evaluation set and a named owner for operations and re-tuning.

**Do not consider an SLM when:**

- The work is open-ended reasoning, broad world knowledge, or long multi-step planning across many tools. Models of every size recall rare ("long-tail") facts poorly: in PopQA, scaling "mainly improves memorization of popular knowledge" and "fails to appreciably improve memorization of factual knowledge in the long tail" ([Mallen et al., PopQA](https://arxiv.org/abs/2212.10511)). We found no verified source on small-model reasoning limits, so **Judgment:** test multi-step reasoning on your own cases before relying on it.
- The model must know facts that change often. Put them in retrieval; fine-tuning does not reliably add facts ([Ovadia et al.](https://arxiv.org/abs/2312.05934); [more evidence](#8-what-the-evidence-says)).
- Volume is low. A hosted model is cheaper than an always-on GPU below the break-even, and you lose nothing you needed.
- You cannot score outputs automatically, have no labelled data, and have no permissively licensed teacher to generate it.
- A prompted larger model already meets the bar at an acceptable price and the data is allowed to leave your boundary.
- Errors trigger irreversible actions (payments, deletions, outbound messages) and there is no verifier or human gate.
- Nobody will own re-tuning when the base model is superseded; every base change means re-tune and re-evaluate.
- Training-data rights are unresolved, or the only teacher's terms forbid using its outputs for training.
- The task definition or input format changes faster than you can retrain.
- The requirement is general capability across arbitrary tasks. That is a large-model job.

If you tick several "consider" items and none of the "do not" items, run the [untuned baseline](04-build-and-deploy-playbook.md#1-the-phases) first; it often settles the question for the price of a few days.

## 3. Fine-tuning methods

Each technique has a three-level explainer (intuitive, practitioner, researcher) in [techniques/](techniques/README.md); the links below go to them.

| Method | What it does | Pros | Cons | Verification |
|---|---|---|---|---|
| **Full fine-tuning** ([explainer](techniques/01-full-fine-tuning-and-sft.md)) | Updates every weight | Highest ceiling on hard domains; learns higher-rank updates (10 to 100 times higher rank than typical LoRA, per [Biderman et al.](https://arxiv.org/abs/2405.09673)) | Memory: 16 bytes per parameter for mixed-precision Adam (2 for weights, 2 for gradients, 12 optimiser state) against 2 bytes for the 16-bit weights alone ([ZeRO, §3.1](https://arxiv.org/abs/1910.02054)); one full copy per task; more forgetting than LoRA ([Biderman et al.](https://arxiv.org/abs/2405.09673)) | Verified (papers) |
| **LoRA** (low-rank adaptation; [explainer](techniques/02-lora.md)) | Freezes the model; trains two thin matrices per target layer whose product is added to the weights | Small checkpoint: for GPT-3 175B with rank 4 on two matrices, training VRAM fell from 1.2 TB to 350 GB and the checkpoint from 350 GB to about 35 MB ([LoRA paper, §4.2](https://arxiv.org/abs/2106.09685)); the paper says merging adds no inference latency (§4.1); forgets less outside the target domain ([Biderman et al.](https://arxiv.org/abs/2405.09673)) | Underperforms full tuning on code and math (largest gap on code); sensitive to learning rate; target-module choice matters more than rank | Verified (arXiv 2405.09673, ICLR 2025); mechanism in the [LoRA guide](../../llm-learning-repository/tutorials/02-building/09-lora.md) |
| **QLoRA** ([explainer](techniques/03-qlora.md)) | LoRA on a 4-bit quantized base (NF4, double quantization, paged optimisers) | A 65B model on one 48 GB GPU in the original paper (abstract); the paper also trains a 33B model on a 24 GB GPU (§9) | **Judgment:** an adapter fitted against a quantized base should be re-checked on the exact base you serve; Ollama's current docs pages no longer mention adapters, and the wording that survives (use the same base model the adapter was created from, otherwise "erratic results") is in [Ollama's pinned v0.9.0 import guide](https://cdn.jsdelivr.net/gh/ollama/ollama@0.9.0/docs/import.md) | Paper verified ([2305.14314](https://arxiv.org/abs/2305.14314), 2023); the abstract states a 65B model on a single 48 GB GPU, and §1 states 16-bit tuning of LLaMA 65B needs more than 780 GB |
| **DoRA** (weight-decomposed LoRA; [explainer](techniques/04-dora.md)) | LoRA variant that splits magnitude and direction | The DoRA paper reports a LLaMA-7B commonsense-reasoning average of 78.4 for DoRA against 74.7 for LoRA at similar parameter counts ([Table 1, arXiv 2402.09353](https://arxiv.org/abs/2402.09353); the authors' result, not replicated here) | Less tooling support than plain LoRA; MLX-LM lists `dora` among its fine-tuning types ([MLX-LM's LORA.md](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md)); serving support in other engines is not verified here | Tool availability verified; quality claim is the authors' |
| **Adapters, prefix and prompt tuning** ([explainer](techniques/05-adapters-prefix-prompt-tuning.md)) | Small inserted layers, or learned vectors prepended to input | Historically important; tiny checkpoints | Largely superseded by LoRA in current tooling; serving support is thin | **Unverified**; treat as legacy |
| **Supervised fine-tuning (SFT)** ([explainer](techniques/01-full-fine-tuning-and-sft.md)) | Trains on (input, ideal output) pairs | Simplest; best first step; teaches format and tool calls | Needs good targets; copies the flaws of the targets | Verified (standard in TRL) |
| **Preference tuning** (DPO, ORPO, KTO, BCO, CPO; [explainer](techniques/06-preference-tuning.md)) | Trains on chosen versus rejected outputs | Teaches "prefer this over that" without writing ideal outputs | Needs preference pairs; in TRL, KTO and DPO are listed as stable and ORPO and CPO as experimental ([TRL trainer overview](https://huggingface.co/docs/trl/index), read 2026-11-26) | Verified ([TRL docs](https://huggingface.co/docs/trl/index)) |
| **Reinforcement learning with verifiable rewards** (GRPO, RLOO, PPO; [explainer](techniques/07-rl-with-verifiable-rewards.md)) | Model generates, a checker scores, weights move toward higher scores | Needs no labelled targets if you can write a checker; fits tasks with deterministic verifiers | Heavier (the model generates during training, which TRL's taxonomy files under "online methods"); **Judgment:** reward hacking is a risk if the checker is gameable (the [explainer](techniques/07-rl-with-verifiable-rewards.md) cites the evidence) | Method origin: [DeepSeekMath, arXiv 2402.03300](https://arxiv.org/abs/2402.03300); tool support verified ([TRL](https://huggingface.co/docs/trl/index), [Unsloth](https://github.com/unslothai/unsloth/blob/main/README.md)) |
| **Distillation** ([explainer](techniques/08-distillation.md)) | A small student learns from a larger teacher's outputs | Packs a large model's behaviour into a small one | **Check the teacher's terms of service** for any limit on using its outputs to train other models (we have not verified any specific provider's clause). A vendor keynote claims students match or beat 70B to 120B teachers while 20 to 30 times smaller; that is a vendor claim | Claim verified as vendor-only ([keynote PDF](https://ceur-ws.org/Vol-4200/keynote2.pdf)) |
| **Quantization-aware training** ([explainer](techniques/09-quantization-ptq-and-qat.md)) | Trains while simulating low precision | Recovers quality at 2 to 4 bits | More engineering than post-training quantization | Verified in use: Apple's on-device model uses 2-bit QAT plus LoRA adapters ([arXiv 2507.13575](https://arxiv.org/abs/2507.13575), self-reported); Gemma 4 31B ships QAT checkpoints |

### Memory, as a first estimate

Unsloth's published minimum-VRAM table for 4-bit QLoRA gives about 3.5 GB for a 3B model, 6 GB for 8B, 8.5 GB for 14B and 26 GB for 32B. For 16-bit LoRA it gives about 33 GB for 14B and 76 GB for 32B. There is no 4B row; interpolate. These are minimums. Batch size and sequence length raise them, sometimes sharply: in our own run (see [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments)), the output logits alone for one 8,700-token sequence took about 10 GB, and the run crashed until the longest examples were removed. The table's source page looked older than its live copy, so re-check [Unsloth's requirements page](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/unsloth-requirements) before sizing hardware.

### Failure modes you should plan for

| Failure | What it looks like | Mitigation |
|---|---|---|
| Learned the training set, not the task | Near-perfect on validation drawn from the same generator; poor on real inputs | Hold out whole sources (customers, formats, generators), not random rows. Our case: 98.6% on synthetic validation, about 75% on real documents |
| Over-training | Held-out *new-format* accuracy falls as training continues | Pick the checkpoint with a rule fixed before looking; evaluate on new formats at several checkpoints. Our case: a longer run scored 52% on held-out formats versus 73% for the earlier checkpoint |
| Forgetting | General skills (instruction following, other languages) degrade ([Biderman et al.](https://arxiv.org/abs/2405.09673) measure it, and find it worse with full tuning) | LoRA over full tuning; low learning rate; mix some general data; keep a general regression set |
| Not adding facts | Model answers fluently and wrongly on new facts ([Ovadia et al.](https://arxiv.org/abs/2312.05934)) | Put facts in retrieval; tune only behaviour |
| Chat-template mismatch | Training used one prompt format and serving another. The [Hugging Face chat-template guide](https://huggingface.co/docs/transformers/main/en/chat_templating) warns that with the wrong control tokens models "would have drastically worse performance" and recommends training with the same template | Train and serve with the same template and the same system prompt; test through the production runtime |
| Confident wrongness | Never says "unknown" | Include "unknown" and "unsupported" examples; score wrong-but-confident rate, not only accuracy |
| Adapter-base mismatch | Adapter loads but outputs are junk | Record the exact base revision; the Ollama guide says to use the same base model the adapter was created from, otherwise results are erratic ([Ollama's pinned v0.9.0 import guide](https://cdn.jsdelivr.net/gh/ollama/ollama@0.9.0/docs/import.md)) |

Rows without a link, and the "mitigation" column, are **Judgment**. The "learned the training set" and "over-training" rows quote our own measurements in [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments), which are internal reports and not independently reproducible by readers.

## 4. Architecture and model-level techniques

The methods above change *how a given model is trained*. These change *which model you have, how big it is, or how it is run*. They are the techniques people mean by "techniques like MoE". Most enterprises choose among them by picking a base model and a runtime, and almost none should build them from scratch. Figures and sources are in each explainer; claims here are summaries of those, and "unverified" items are flagged there.

| Technique | What it changes | Pros | Cons | When an SLM team actually uses it |
|---|---|---|---|---|
| **Mixture of experts** (MoE; [explainer](techniques/10-mixture-of-experts.md); origin: [Shazeer et al.](https://arxiv.org/abs/1701.06538); an open example: [Mixtral](https://arxiv.org/abs/2401.04088)) | The architecture: each token is routed to a few "expert" sub-networks, so only some of the parameters are used per token | More total knowledge for the same compute per token; a model with a small *active* size can answer quickly | Memory is set by *total* parameters, not active ones, so a small-active MoE still needs a large machine; fine-tuning needs care (router, uneven expert use); weaker laptop fit than a dense model of the same speed | You *choose* an MoE base (gpt-oss, Qwen, Gemma 4 variants) for speed on a server; you rarely train one |
| **Mixture of adapters** (several LoRA adapters selected per task or per request; covered in the MoE explainer) | Which adapter is active, not the base | Many tasks share one base; swap per tenant | Needs a runtime with multi-adapter support; adapters must match the base | Multi-tenant or multi-task serving; see [03 §2](03-vehicles.md#2-runtime-what-loads-and-runs-it) |
| **Model merging** ([explainer](techniques/11-model-merging.md); example method: [TIES-Merging](https://arxiv.org/abs/2306.01708)) | Combines weights of several tuned models into one, without training | No GPU hours; can combine skills or recover general ability | Interference between tasks; needs the same base and tokenizer; licence of every parent applies | Combining adapters or tuned variants; quick experiments |
| **Quantization, post-training and quantization-aware** ([explainer](techniques/09-quantization-ptq-and-qat.md)) | Number precision of the weights (and sometimes activations) | Fits smaller memory; faster; the main way a model reaches a laptop or phone | Quality loss that must be measured on your task; formats are runtime-specific | Almost every deployment |
| **Pruning and compression** ([explainer](techniques/12-pruning-and-compression.md); example: [Minitron](https://arxiv.org/abs/2407.14679)) | Removes parts of a larger model, usually then retrains to recover | Produces a smaller model of the same family | Heavy engineering; unstructured sparsity is said not to speed up real hardware (the explainer marks this as resting on secondary summaries, not a measurement) | Rare; picking an off-the-shelf small base is cheaper |
| **Continued pretraining** ([explainer](techniques/13-continued-pretraining.md); example: [Don't Stop Pretraining](https://arxiv.org/abs/2004.10964)) | Trains on a large pile of domain text before tuning | Teaches vocabulary and style at scale; new languages or scripts | Needs millions to billions of tokens and real compute; retrieval beat unsupervised fine-tuning for facts in [Ovadia et al.](https://arxiv.org/abs/2312.05934) | Only with a large private corpus or an under-served language |
| **Constrained decoding** ([explainer](techniques/14-constrained-decoding.md); methods: [Outlines](https://arxiv.org/abs/2307.09702), [XGrammar](https://arxiv.org/abs/2411.15100)) | Which tokens may be produced at inference | Guarantees output matches a schema or grammar; no training | Guarantees shape, not truth; can reduce quality if the format fights the task | Always, for structured output and tool calls |

The cells in the table above that carry no link are **Judgment** summaries of the linked explainers.

**How to read the MoE row:** "3.6B active" does not mean "runs like a 3.6B model on a 16 GB laptop". Speed follows the active parameters; memory follows the total (gpt-oss-20b is 21B total and 3.6B active, per its [model card](https://huggingface.co/openai/gpt-oss-20b) as cited in the [market reference](../../llms/market-reference/02-open-weights-and-hugging-face.md)). Plan hardware from the total, and expect the speed benefit only once the weights fit.

## 5. Pros and cons of the SLM path as a whole

| Pros | Cons |
|---|---|
| Data stays inside your boundary or on the device | You own the whole stack: data, training, eval, serving, upgrades |
| Low latency and cost per call at volume | Fixed GPU cost whether busy or idle; poor economics at low volume |
| Pinned behaviour; no surprise vendor changes | Narrow: strong on the tuned task, weaker elsewhere |
| Reliable structure with tuning plus constrained decoding | Every new base model means re-tune and re-evaluate |
| Many tasks can share one base via adapters | Evaluation is the hard part and cannot be skipped |
| Works offline | Weak on rare facts at any size ([PopQA](https://arxiv.org/abs/2212.10511)); multi-step reasoning must be tested on your cases (**Judgment**) |
| Licences like Apache 2.0 give clear rights | Custom licences push attribution and use limits into your derivative |

## 6. Choosing a base model

Choose by (1) licence, (2) whether a **base** checkpoint exists (some tuning recipes want the base; most enterprise SFT starts from the instruct model), (3) size you can serve, (4) tool-calling and structured-output quality on *your* eval, not a leaderboard.

Facts below are from the research pass of 2026-11-26. Verify the exact repository and revision before use, and read the LICENSE file at that revision, not the model card.

| Family | Sizes (verified) | Licence | Base released? | Notes |
|---|---|---|---|---|
| Qwen3.5 small ([card](https://huggingface.co/Qwen/Qwen3.5-0.8B)) | 0.8B, 2B, 4B, 9B (2 Mar 2026) | Apache 2.0 | 0.8B base confirmed; 2B, 4B, 9B base repos not opened | 262K context. Qwen3 (earlier) is what our experiments used |
| Gemma 4 ([report](https://thenextweb.com/news/google-gemma-4-open-models-apache-2-launch)) | E2B, E4B, 26B MoE (mixture of experts), 31B dense (2 Apr 2026) | Apache 2.0 (a change from earlier Gemma terms) | Reported; a `gemma-4-E4B` base repo was not confirmed | 31B ships quantization-aware checkpoints |
| Ministral 3 ([Mistral](https://mistral.ai/news/mistral-3)) | 3B, 8B, 14B (Dec 2025) | Apache 2.0 | Base, instruct and reasoning variants | Image understanding; 256K context (128K for reasoning) |
| IBM Granite 4.0 Nano ([blog](https://huggingface.co/blog/ibm-granite/granite-4-nano)) | 350M to 1.5B (Oct 2025) | Apache 2.0 | Base and instruct | IBM states ISO 42001 certification and signed artifacts (vendor statement) |
| NVIDIA Nemotron 3 Nano ([licence](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-nemotron-open-model-license)) | 31.6B total, 3.6B active (Dec 2025) | NVIDIA Nemotron Open Model License with attribution wording | Not checked | An NVIDIA page claims a move to a different licence for 3.5; single source, **unverified** |
| Llama 3.2 and 4 ([Meta FAQ](https://developer.meta.com/ai/faq/)) | Various | Meta community licence: naming and attribution; an EU restriction on multimodal Llama 4 | Not checked | Meta's FAQ says the EU restriction covers EU-domiciled entities, not end users of their products. The monthly-active-user clause was not confirmed in this pass |
| Phi-4 family | Mini and others | MIT reported at family level | **Unverified** | Confirm per model |
| SmolLM3 ([base card](https://huggingface.co/HuggingFaceTB/SmolLM3-3B-Base)) | 3B | Apache 2.0 **unverified** | A base card exists | Confirm licence at the revision |

The model-family rows above come from the cited pages as read on 2026-11-26; "unverified" marks what we could not confirm.

**Licence flow-down in one sentence:** Apache 2.0 families add no use restrictions to your derivative; Llama-style community licences require the restrictions or attribution to travel with every copy of your tuned model, which matters if you give weights to a customer.

## 7. Matching method to need

This table is **Judgment**: it maps needs to methods using the evidence in §3 and §8, and no source tests the mapping as a whole.

| You need | Start with | Why |
|---|---|---|
| Always-valid JSON in a fixed schema | Constrained decoding, then LoRA SFT if accuracy still lags | Grammar fixes shape; tuning fixes content |
| Classification or routing at high volume | LoRA SFT on a 1B to 4B model | Narrow, scorable, volume pays back training |
| Extraction from your own document formats | LoRA SFT with "unknown" examples; deterministic verifiers decide | Matches our measured case |
| Answers from changing company documents | Retrieval; tune only for citation style | Fine-tuning does not reliably add facts |
| Tool calling in an agent | SFT on tool-call traces from your own tools; constrained decoding on the tool schema | Habit and schema adherence are behaviours |
| A tone or house style | LoRA SFT on a few hundred good examples | Style is behaviour |
| Hard tasks with a deterministic checker (code that must compile, SQL that must run) | Reinforcement learning with verifiable rewards | The checker is the label |
| Domain jargon the base model barely knows | Retrieval with a glossary first; continued pretraining only if measured need | Cheapest fix first |

## 8. What the evidence says

| Source | Claim | How much to trust it |
|---|---|---|
| NVIDIA, [Small Language Models are the Future of Agentic AI](https://arxiv.org/abs/2506.02153) (June 2025, preprint) | SLMs (defined in §2.1 as models that fit on a common consumer device with latency low enough for one user's agentic requests; the paper adds that below about 10B parameters generally counts as small in 2025) are "sufficiently powerful, inherently more suitable, and necessarily more economical" for many agentic invocations | A position paper from a company that sells the hardware. The authors host a correspondence page; the one letter we saw (8 Jul 2025) asked for more coverage of reasoning LLMs. No formal rebuttal was found |
| Predibase, [LoRA Land](https://arxiv.org/abs/2405.00732) (Apr 2024) | 310 models (10 bases times 31 tasks): 4-bit LoRA models beat their own base models by 34 points and GPT-4 by 10 points on average | Vendor work; the GPT-4 comparator is from 2024 |
| Distil Labs, [The 10x Inference Tax You Don't Have to Pay](https://www.distillabs.ai/blog/the-10x-inference-tax-you-dont-have-to-pay) (6 Mar 2026, vendor blog) | Fine-tuned 0.6B to 8B models compared with 10 frontier LLMs across 8 datasets: ranked first overall on half the tasks and averaged rank 3.2, just behind Claude Opus 4.6 (2.5) | Vendor benchmark by a company that sells tuning; not replicated |
| Huynh and Pham, [Reading Anxiety or Reading the Label?](https://arxiv.org/abs/2609.20847) (Aug 2026, preprint) | On an anxiety-detection task a frontier model led (F1 0.846), a 110M-parameter domain-adapted encoder reached 0.831, and the LoRA fine-tuned 3B model was the most dependent on keyword shortcuts of all conditions tested (lexical dependence ranged from 8.6 to 25.4 points); the authors conclude published figures on this corpus are upper bounds, with the most inflation for fine-tuned models | One task and one corpus, but a useful warning: a tuned model's score can reflect shortcuts in the data, so test with perturbed inputs |
| Ovadia et al., [fine-tuning versus RAG](https://arxiv.org/abs/2312.05934) (EMNLP 2024) | Retrieval consistently beat unsupervised fine-tuning for known and new knowledge; models struggle to learn new facts by tuning | Peer reviewed; older models, but the direction is widely replicated in practice |
| Biderman et al., [LoRA Learns Less and Forgets Less](https://arxiv.org/abs/2405.09673) (ICLR 2025) | LoRA trails full tuning on code and math, forgets less | Peer reviewed |

Reading it plainly: **narrow tasks, yes; knowledge, no; and be sceptical of any "beats the frontier" number that does not give you the task, the eval set, and the comparator's date.** A study of fine-tuning versus RAG for less-popular knowledge (arXiv 2403.01432) was on our list but the search returned nothing, so it is not cited.
