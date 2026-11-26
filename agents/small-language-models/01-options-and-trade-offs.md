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

**Rule of thumb that survives most projects:** use retrieval for *what the model should know*, fine-tuning for *how the model should behave*. A tuned model that reads retrieved context is the common end state.

## 2. Fine-tuning methods

| Method | What it does | Pros | Cons | Verification |
|---|---|---|---|---|
| **Full fine-tuning** | Updates every weight | Highest ceiling on hard domains; learns higher-rank updates (10 to 100 times higher rank than typical LoRA, per [Biderman et al.](https://arxiv.org/abs/2405.09673)) | Memory for weights, gradients and optimiser state (several times the model size); one full copy per task; more forgetting | Verified (paper) |
| **LoRA** (low-rank adaptation) | Freezes the model; trains two thin matrices per target layer whose product is added to the weights | Small checkpoint (megabytes); many adapters share one base; cheap; can be merged into the weights so inference is no slower; forgets less outside the target domain | Underperforms full tuning on code and math (largest gap on code); sensitive to learning rate; target-module choice matters more than rank | Verified (arXiv 2405.09673, ICLR 2025); mechanism in the [LoRA guide](../../llm-learning-repository/tutorials/02-building/09-lora.md) |
| **QLoRA** | LoRA on a 4-bit quantized base (NF4, double quantization, paged optimisers) | A 65B model on one 48 GB GPU in the original paper; lets small GPUs train mid-size models | Slightly slower per step; adapters trained on a quantized base may not transfer cleanly to a different serving quantization; Ollama's docs recommend non-QLoRA adapters | Paper verified ([2305.14314](https://arxiv.org/abs/2305.14314), 2023); Ollama advice verified |
| **DoRA** (weight-decomposed LoRA) | LoRA variant that splits magnitude and direction | Reported to narrow the gap to full tuning | Less tooling support; available on Apple silicon through a community package, not core MLX-LM | Tool availability verified ([mlx-lm-lora](https://github.com/Goekdeniz-Guelmez/mlx-lm-lora)); quality claim not independently checked here |
| **Adapters, prefix and prompt tuning** | Small inserted layers, or learned vectors prepended to input | Historically important; tiny checkpoints | Largely superseded by LoRA in current tooling; serving support is thin | **Unverified**; treat as legacy |
| **Supervised fine-tuning (SFT)** | Trains on (input, ideal output) pairs | Simplest; best first step; teaches format and tool calls | Needs good targets; copies the flaws of the targets | Verified (standard in TRL) |
| **Preference tuning** (DPO, ORPO, KTO, BCO, CPO) | Trains on chosen versus rejected outputs | Teaches "prefer this over that" without writing ideal outputs | Needs preference pairs; ORPO and KTO are marked experimental in TRL | Verified ([TRL docs](https://huggingface.co/docs/trl/index)) |
| **Reinforcement learning with verifiable rewards** (GRPO, RLOO, PPO) | Model generates, a checker scores, weights move toward higher scores | Needs no labelled targets if you can write a checker; fits tasks with deterministic verifiers | Heavier (generation inside the training loop); reward hacking if the checker is gameable; GRPO and RLOO are marked vLLM-supported in TRL | Verified (TRL, Unsloth list GRPO) |
| **Distillation** | A small student learns from a larger teacher's outputs | Packs a large model's behaviour into a small one | **Check the teacher's terms of service.** Some hosted-model terms restrict using outputs to train competing models. A vendor keynote claims students match or beat 70B to 120B teachers while 20 to 30 times smaller; that is a vendor claim | Claim verified as vendor-only ([keynote PDF](https://ceur-ws.org/Vol-4200/keynote2.pdf)) |
| **Quantization-aware training** | Trains while simulating low precision | Recovers quality at 2 to 4 bits | More engineering than post-training quantization | Verified in use: Apple's on-device model uses 2-bit QAT plus LoRA adapters ([arXiv 2507.13575](https://arxiv.org/abs/2507.13575), self-reported); Gemma 4 31B ships QAT checkpoints |

### Memory, as a first estimate

Unsloth's published minimum-VRAM table for 4-bit QLoRA gives about 3.5 GB for a 3B model, 6 GB for 8B, 8.5 GB for 14B and 26 GB for 32B. For 16-bit LoRA it gives about 33 GB for 14B and 76 GB for 32B. There is no 4B row; interpolate. These are minimums. Batch size and sequence length raise them, sometimes sharply: in our own run (see [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments)), the output logits alone for one 8,700-token sequence took about 10 GB, and the run crashed until the longest examples were removed. The table's source page looked older than its live copy, so re-check [Unsloth's requirements page](https://unsloth.ai/docs/get-started/fine-tuning-for-beginners/unsloth-requirements) before sizing hardware.

### Failure modes you should plan for

| Failure | What it looks like | Mitigation |
|---|---|---|
| Learned the training set, not the task | Near-perfect on validation drawn from the same generator; poor on real inputs | Hold out whole sources (customers, formats, generators), not random rows. Our case: 98.6% on synthetic validation, about 75% on real documents |
| Over-training | Held-out *new-format* accuracy falls as training continues | Pick the checkpoint with a rule fixed before looking; evaluate on new formats at several checkpoints. Our case: a longer run scored 52% on held-out formats versus 73% for the earlier checkpoint |
| Forgetting | General skills (instruction following, other languages) degrade | LoRA over full tuning; low learning rate; mix some general data; keep a general regression set |
| Not adding facts | Model answers fluently and wrongly on new facts | Put facts in retrieval; tune only behaviour |
| Chat-template mismatch | Training used one prompt format and serving another; behaviour collapses | Train and serve with the same template and the same system prompt; test through the production runtime |
| Confident wrongness | Never says "unknown" | Include "unknown" and "unsupported" examples; score wrong-but-confident rate, not only accuracy |
| Adapter-base mismatch | Adapter loads but outputs are junk | Record the exact base revision; Ollama requires the adapter to match the exact base it was trained on |

Overfitting and chat-template mismatch were not confirmed against a published source in this pass; the table is practitioner experience plus our measurements.

## 3. Pros and cons of the SLM path as a whole

| Pros | Cons |
|---|---|
| Data stays inside your boundary or on the device | You own the whole stack: data, training, eval, serving, upgrades |
| Low latency and cost per call at volume | Fixed GPU cost whether busy or idle; poor economics at low volume |
| Pinned behaviour; no surprise vendor changes | Narrow: strong on the tuned task, weaker elsewhere |
| Reliable structure with tuning plus constrained decoding | Every new base model means re-tune and re-evaluate |
| Many tasks can share one base via adapters | Evaluation is the hard part and cannot be skipped |
| Works offline | Small models have shorter reliable reasoning and weaker rare-knowledge recall |
| Licences like Apache 2.0 give clear rights | Custom licences push attribution and use limits into your derivative |

## 4. Choosing a base model

Choose by (1) licence, (2) whether a **base** checkpoint exists (some tuning recipes want the base; most enterprise SFT starts from the instruct model), (3) size you can serve, (4) tool-calling and structured-output quality on *your* eval, not a leaderboard.

Facts below are from the research pass of 2026-11-26. Verify the exact repository and revision before use, and read the LICENSE file at that revision, not the model card.

| Family | Sizes (verified) | Licence | Base released? | Notes |
|---|---|---|---|---|
| Qwen3.5 small | 0.8B, 2B, 4B, 9B (2 Mar 2026) | Apache 2.0 | 0.8B base confirmed; 2B, 4B, 9B base repos not opened | 262K context. Qwen3 (earlier) is what our experiments used |
| Gemma 4 | E2B, E4B, 26B MoE (mixture of experts), 31B dense (2 Apr 2026) | Apache 2.0 (a change from earlier Gemma terms) | Reported; a `gemma-4-E4B` base repo was not confirmed | 31B ships quantization-aware checkpoints |
| Ministral 3 | 3B, 8B, 14B (Dec 2025) | Apache 2.0 | Base, instruct and reasoning variants | Image understanding; 256K context (128K for reasoning) |
| IBM Granite 4.0 Nano | 350M to 1.5B (Oct 2025) | Apache 2.0 | Base and instruct | IBM states ISO 42001 certification and signed artifacts (vendor statement) |
| NVIDIA Nemotron 3 Nano | 31.6B total, 3.6B active (Dec 2025) | NVIDIA Nemotron Open Model License with attribution wording | Not checked | An NVIDIA page claims a move to a different licence for 3.5; single source, **unverified** |
| Llama 3.2 and 4 | Various | Meta community licence: naming and attribution; an EU restriction on multimodal Llama 4 | Not checked | Meta's FAQ says the EU restriction covers EU-domiciled entities, not end users of their products. The monthly-active-user clause was not confirmed in this pass |
| Phi-4 family | Mini and others | MIT reported at family level | **Unverified** | Confirm per model |
| SmolLM3 | 3B | Apache 2.0 **unverified** | A base card exists | Confirm licence at the revision |

**Licence flow-down in one sentence:** Apache 2.0 families add no use restrictions to your derivative; Llama-style community licences require the restrictions or attribution to travel with every copy of your tuned model, which matters if you give weights to a customer.

## 5. Matching method to need

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

## 6. What the evidence says

| Source | Claim | How much to trust it |
|---|---|---|
| NVIDIA, [Small Language Models are the Future of Agentic AI](https://arxiv.org/abs/2506.02153) (June 2025, preprint) | SLMs (under 10B parameters in its definition) are "sufficiently powerful, inherently more suitable, and necessarily more economical" for many agentic invocations | A position paper from a company that sells the hardware. The authors host a correspondence page; the one letter we saw (8 Jul 2025) asked for more coverage of reasoning LLMs. No formal rebuttal was found |
| Predibase, [LoRA Land](https://arxiv.org/abs/2405.00732) (Apr 2024) | 310 models (10 bases times 31 tasks): 4-bit LoRA models beat their own base models by 34 points and GPT-4 by 10 points on average | Vendor work; the GPT-4 comparator is from 2024 |
| Distil Labs blog (self-reported) | Fine-tuned 0.6B to 8B models averaged rank 3.2 across 8 datasets versus 2.5 for a frontier model; first on 4 of 8 | Vendor blog, not replicated |
| Independent anxiety-detection study ([arXiv 2609.20847](https://arxiv.org/pdf/2609.20847), as returned by search; not opened in full) | A tuned Qwen2.5-3B landed between two frontier models that were themselves 4 points apart | Single study; shows "wins" depend on which frontier model is the comparator |
| Ovadia et al., [fine-tuning versus RAG](https://arxiv.org/abs/2312.05934) (EMNLP 2024) | Retrieval consistently beat unsupervised fine-tuning for known and new knowledge; models struggle to learn new facts by tuning | Peer reviewed; older models, but the direction is widely replicated in practice |
| Biderman et al., [LoRA Learns Less and Forgets Less](https://arxiv.org/abs/2405.09673) (ICLR 2025) | LoRA trails full tuning on code and math, forgets less | Peer reviewed |

Reading it plainly: **narrow tasks, yes; knowledge, no; and be sceptical of any "beats the frontier" number that does not give you the task, the eval set, and the comparator's date.** A study of fine-tuning versus RAG for less-popular knowledge (arXiv 2403.01432) was on our list but the search returned nothing, so it is not cited.
