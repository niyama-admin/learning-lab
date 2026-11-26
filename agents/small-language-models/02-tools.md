# 02. Tools

"Tools" means two different things here and both matter: the **tooling that trains and serves** an SLM (sections 1 and 2), and the **tools the tuned model can call** while it works (section 3). Facts are dated 2026-11-26; "unverified" means not confirmed against a primary source in that pass.

## 1. Training tools

| Tool | Best for | Hardware | Licence and status | Watch out for |
|---|---|---|---|---|
| **Hugging Face [TRL](https://huggingface.co/docs/trl/index) + [PEFT](https://huggingface.co/docs/peft/main/en/developer_guides/lora)** (how the stack fits together: [explainer 15](techniques/15-peft-methods-and-the-hugging-face-stack.md)) | The default, most-documented path: SFT, DPO, KTO, ORPO, GRPO, RLOO, PPO with LoRA/QLoRA | NVIDIA, plus others through PyTorch | TRL is on a v1 line (docs show v1.12). Licence **unverified** in this pass; check the repo | The [TRL trainer overview](https://huggingface.co/docs/trl/index) lists SFT, DPO, KTO, GRPO and RLOO as stable and CPO and ORPO as experimental (read 2026-11-26) |
| **[Unsloth](https://github.com/unslothai/unsloth/blob/main/README.md)** | Fast single-GPU LoRA/QLoRA/full tuning, GRPO, FP8; low memory | README lists NVIDIA, AMD, Intel GPUs and CPUs; Windows, Linux, macOS. Apple *training* is not detailed (MLX only mentioned for chat) | Dual licence: core Apache 2.0, optional components such as the Studio UI AGPL-3.0 (README, fetched). Two mirrors show the whole repo as AGPL; **read the LICENSE file** before embedding | A PyPI snapshot says multi-GPU is available with "a major upgrade on the way", so treat multi-GPU as maturing |
| **[Axolotl](https://pypi.org/project/axolotl/)** | Config-file driven training across methods and models | NVIDIA, multi-GPU | Apache 2.0 (PyPI) | YAML recipes drift between versions; pin the version |
| **[LLaMA-Factory](https://github.com/hiyouga/LlamaFactory)** | A web UI and CLI that lowers the barrier for non-specialists | NVIDIA and others | Licence **unverified** | UI convenience can hide the template and masking choices that decide quality |
| **[MLX-LM](https://github.com/ml-explore/mlx-lm)** | Apple silicon: LoRA, QLoRA (automatic when the base is quantized), fused export | Mac with Apple silicon; memory is shared with everything else | Licence **unverified** (believed permissive) | One GPU memory pool: long sequences crash (see [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments)). MLX-LM's [LORA.md](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md) lists `lora` (default), `dora` and `full` fine-tuning types |
| **[NVIDIA NeMo AutoModel](https://docs.nvidia.com/nemo/automodel)** | NVIDIA-stack shops that will serve on NVIDIA's inference stack | NVIDIA | Licence **unverified** | Ties you to one vendor's pipeline |
| **[torchtune](https://github.com/meta-pytorch/torchtune/blob/main/README.md)** | Avoid for new work | NVIDIA | BSD-3; README states it is "no longer actively maintained: development wound down in 2025"; last listed release v0.6.1, April 2025 (README, fetched) | Existing recipes will rot |
| **Hugging Face AutoTrain** | No-code experiments | Hosted | Current status **unverified** | Do not build a process on it without checking |

**Recommendation for an enterprise starting now:** TRL + PEFT (or Axolotl on top of it) as the system of record, because the recipes are inspectable and portable; Unsloth for fast iteration on one GPU once you have read its licence; MLX-LM when training must stay on a Mac. Keep the *data and evaluation harness* independent of the trainer so you can swap trainers.

## 2. Hosted fine-tuning, and whether you keep the weights

If your reason for an SLM is control or privacy, **the question that matters is whether you can download the result.** A hosted-only fine-tune keeps you on the vendor's platform.

| Service | Fine-tunes | Can you take the weights? | Verification |
|---|---|---|---|
| [Together](https://docs.together.ai/docs/fine-tuning-overview) | Open models | Yes: the docs say you can "serve your fine-tuned model on a dedicated endpoint or download it for local use" (an earlier docs page describing ZSTD archives no longer resolves, so the archive format is unverified) | Verified in docs (read 2026-11-26) |
| [Fireworks](https://docs.fireworks.ai/tools-sdks/firectl/commands/model-download) | Open models | Yes: `firectl model download` fetches adapters and base; you can merge off-platform with PEFT | Verified in docs |
| Amazon Bedrock ([reinforcement fine-tuning](https://aws.amazon.com/about-aws/whats-new/2026/02/amazon-bedrock-reinforcement-fine-tuning-openai), [Custom Model Import](https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html)) | Reinforcement fine-tuning for open-weight models (since Feb 2026, launching with Qwen3-32B and gpt-oss-20b); Custom Model Import | Import goes the other way: you bring Hugging Face safetensors in FP32, FP16 or BF16 (Llama, Mistral, Qwen, GPT-OSS and others; the guide pins a specific transformers version; Gemma support not found) | Verified in docs |
| Amazon SageMaker ([AWS blog](https://aws.amazon.com/blogs/machine-learning/fine-tune-openai-gpt-oss-models-on-amazon-sagemaker-ai-using-hugging-face-libraries)) | Self-managed training jobs; gpt-oss with TRL documented | Yes, you own the artifacts | Verified (AWS blog) |
| [Google Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/open-model-tuning) | Managed SFT and distillation for open models | Weight export **unverified**; one Google post says artifacts land in Cloud Storage | Partly verified |
| [Azure AI Foundry](https://learn.microsoft.com/en-gb/azure/foundry/openai/how-to/fine-tuning) | SFT in public preview for Ministral-3B, Qwen-32B, Llama-3.3-70B-Instruct and gpt-oss-20b, text only | Weight export **unverified** | Partly verified |
| Hosted frontier-model tuning (OpenAI and similar) | Vendor's own models | Hosted-only is the expected case (**inferred, unverified**) | Unverified |
| Predibase, Databricks | Not searched | | Unverified |

**Hosted versus self-run, plainly:**

| | Hosted fine-tuning | Self-run |
|---|---|---|
| Time to first result | Hours | Days to set up the first time |
| Data leaves your boundary | Yes, to the vendor | No |
| Expertise needed | Low | Medium |
| Lock-in | Depends on weight export (table above) | None |
| Fits regulated data | Only with a contract and a region you can defend | Yes |

For anything that touches personal or customer data, treat "weights you can download" as a procurement requirement, not a nice-to-have.

## 3. Tools the SLM itself can call

An agent runtime gives a model tools (functions) it can request: search, a database query, a calculator, a file reader, a parser. For an SLM, three facts decide success.

**1. Make the tool call a constrained output, not free text.** Serve with grammar or JSON-schema constrained decoding so the call always parses. Documented options: [vLLM structured outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/) (xgrammar or guidance backends), [SGLang](https://docs.sglang.ai/advanced_features/structured_outputs.html) (XGrammar by default, or Outlines or Llguidance), [NVIDIA NIM guided decoding](https://docs.nvidia.com/nim/large-language-models/latest/release-notes.html) (xgrammar by default), and [Ollama](https://docs.ollama.com/capabilities/structured-outputs), whose `format` field takes a JSON schema. Constrained decoding guarantees the call is *well formed*; it does not guarantee the model picked the *right* tool or arguments (**Judgment**; see the [constrained decoding explainer](techniques/14-constrained-decoding.md) for the evidence).

**2. Fine-tune on tool-call traces from your own tools.** **Judgment:** keep the tool set small and the schemas narrow, because we found no verified source on how small models scale with the number of tools; reliability is the documented risk even for strong models (gpt-4o function-calling agents scored below 25% on `pass^8` in one retail domain, [tau-bench](https://arxiv.org/abs/2406.12045)), and small-model leaderboard figures could not be verified (see [06 Q3](06-algorithm-or-model-use-cases.md#q3-if-i-have-an-app-can-i-use-an-slm-for-it)). Give the tuned model a small, stable tool set with clear names and narrow schemas. Train on real traces (inputs, the tool call, the result, the next step), including cases where the correct move is *no call* or *ask for clarification*.

**3. Let a deterministic layer decide.** The pattern we use in our own document work (measured aggregates in [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments)): the model **proposes** (a classification, a field, a parser definition with an evidence pointer) and **deterministic verifiers decide** whether it is accepted (balance continuity, row counts, schema validity, period bounds). A tuned SLM that can only propose is far safer than one that can act.

| Tool category | Good fit for an SLM? | Why (**Judgment** throughout; no source tests this table) |
|---|---|---|
| Read-only lookups (search, retrieval, a database read through a typed API) | Yes | Cheap to verify; failure is a wrong answer, not a harmful action |
| Parsers and validators | Yes | The tool is the checker; the model just routes |
| Calculators and code interpreters | Yes, with a sandbox | Offloads arithmetic that small models do badly |
| Writes, payments, deletes, outbound messages | Only behind a human or policy gate | A small model's confident error is expensive here |
| Large open-ended tool catalogues | Poor | Selection accuracy drops; prefilter tools with retrieval or routing |
| Model Context Protocol (MCP) servers | Yes, as a transport | MCP standardises how tools are described and called; the SLM still needs the tuning and constraints above. Security: see the [agent connectivity stage](../../llm-learning-repository/tutorials/08-agent-connectivity/README.md) |

How the runtime wraps this (loop, permission gate, tool dispatcher) is covered in [agent languages](../languages/README.md) and [runtime architecture](../runtime-architecture/README.md).

## 4. Supporting tools

| Need | Options | Note |
|---|---|---|
| Quantization for serving | [vLLM's recommended LLM Compressor](https://docs.vllm.ai/en/latest/features/quantization/); llama.cpp quantize tools; AutoAWQ/GPTQ tooling | Formats in [03 §3](03-vehicles.md#3-quantization-formats) |
| Adapter conversion | llama.cpp `convert_lora_to_gguf.py` | For serving a LoRA adapter in GGUF runtimes; named in [Ollama's pinned v0.9.0 import guide](https://cdn.jsdelivr.net/gh/ollama/ollama@0.9.0/docs/import.md) |
| Evaluation | Your own deterministic scorer first; a general harness only for regression | **Judgment** (from our own observation of judge variance, [04 §4](04-build-and-deploy-playbook.md#4-evaluation)) |
| Experiment and model registry | Hugging Face private repos, MLflow, an OCI registry | Registry guidance was **not verified** in the research pass; pick one and record base revision, data version, config, metrics |
| Weight scanning | Safetensors format ([Hugging Face docs](https://huggingface.co/docs/hub/security-pickle)); scanners such as [JFrog's cooperation with Hugging Face](https://jfrog.com/community/ai/jfrog-and-hugging-face-join-forces-to-expose-malicious-ml-models/) | See [04 §5](04-build-and-deploy-playbook.md#5-governance) |
