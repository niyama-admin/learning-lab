# 02. Tools

"Tools" means two different things here and both matter: the **tooling that trains and serves** an SLM (sections 1 and 2), and the **tools the tuned model can call** while it works (section 3). Facts are dated 2026-11-26; "unverified" means not confirmed against a primary source in that pass.

## 1. Training tools

| Tool | Best for | Hardware | Licence and status | Watch out for |
|---|---|---|---|---|
| **Hugging Face TRL + PEFT** | The default, most-documented path: SFT, DPO, KTO, ORPO, GRPO, RLOO, PPO with LoRA/QLoRA | NVIDIA, plus others through PyTorch | TRL is on a v1 line (docs show v1.12). Licence **unverified** in this pass; check the repo | Some trainers (KTO, ORPO) are marked experimental; DPO, KTO and ORPO are not vLLM-accelerated, GRPO and RLOO are |
| **Unsloth** | Fast single-GPU LoRA/QLoRA/full tuning, GRPO, FP8; low memory | README lists NVIDIA, AMD, Intel GPUs and CPUs; Windows, Linux, macOS. Apple *training* is not detailed (MLX only mentioned for chat) | Dual licence: core Apache 2.0, optional components such as the Studio UI AGPL-3.0 (README, fetched). Two mirrors show the whole repo as AGPL; **read the LICENSE file** before embedding | A PyPI snapshot says multi-GPU is available with "a major upgrade on the way", so treat multi-GPU as maturing |
| **Axolotl** | Config-file driven training across methods and models | NVIDIA, multi-GPU | Apache 2.0 (PyPI) | YAML recipes drift between versions; pin the version |
| **LLaMA-Factory** | A web UI and CLI that lowers the barrier for non-specialists | NVIDIA and others | Licence **unverified** | UI convenience can hide the template and masking choices that decide quality |
| **MLX-LM** | Apple silicon: LoRA, QLoRA (automatic when the base is quantized), fused export | Mac with Apple silicon; memory is shared with everything else | Licence **unverified** (believed permissive) | One GPU memory pool: long sequences crash (see [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments)). DoRA only via the community `mlx-lm-lora` |
| **NVIDIA NeMo AutoModel** | NVIDIA-stack shops that will serve on NVIDIA's inference stack | NVIDIA | Licence **unverified** | Ties you to one vendor's pipeline |
| **torchtune** | Avoid for new work | NVIDIA | BSD-3; README states it is "no longer actively maintained: development wound down in 2025"; last listed release v0.6.1, April 2025 (README, fetched) | Existing recipes will rot |
| **Hugging Face AutoTrain** | No-code experiments | Hosted | Current status **unverified** | Do not build a process on it without checking |

**Recommendation for an enterprise starting now:** TRL + PEFT (or Axolotl on top of it) as the system of record, because the recipes are inspectable and portable; Unsloth for fast iteration on one GPU once you have read its licence; MLX-LM when training must stay on a Mac. Keep the *data and evaluation harness* independent of the trainer so you can swap trainers.

## 2. Hosted fine-tuning, and whether you keep the weights

If your reason for an SLM is control or privacy, **the question that matters is whether you can download the result.** A hosted-only fine-tune keeps you on the vendor's platform.

| Service | Fine-tunes | Can you take the weights? | Verification |
|---|---|---|---|
| Together | Open models | Yes: fine-tuned weights download as ZSTD archives via CLI, SDK or REST | Verified in docs |
| Fireworks | Open models | Yes: `firectl model download` fetches adapters and base; you can merge off-platform with PEFT | Verified in docs |
| Amazon Bedrock | Reinforcement fine-tuning for open-weight models (since Feb 2026, launching with Qwen3-32B and gpt-oss-20b); Custom Model Import | Import goes the other way: you bring Hugging Face safetensors in FP32, FP16 or BF16 (Llama, Mistral, Qwen, GPT-OSS and others; the guide pins a specific transformers version; Gemma support not found) | Verified in docs |
| Amazon SageMaker | Self-managed training jobs; gpt-oss with TRL documented | Yes, you own the artifacts | Verified (AWS blog) |
| Google Vertex AI | Managed SFT and distillation for open models | Weight export **unverified**; one Google post says artifacts land in Cloud Storage | Partly verified |
| Azure AI Foundry | SFT in public preview for Ministral-3B, Qwen-32B, Llama-3.3-70B-Instruct and gpt-oss-20b, text only | Weight export **unverified** | Partly verified |
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

**1. Make the tool call a constrained output, not free text.** Serve with grammar or JSON-schema constrained decoding so the call always parses: XGrammar (default in SGLang and in NVIDIA NIM's guided decoding), Outlines, Llguidance, or llama.cpp's GBNF grammars (Ollama converts a JSON schema to GBNF). Constrained decoding guarantees the call is *well formed*; it does not guarantee the model picked the *right* tool or arguments.

**2. Fine-tune on tool-call traces from your own tools.** Small models are weakest at choosing among many tools and at long multi-step plans. Give the tuned model a small, stable tool set with clear names and narrow schemas. Train on real traces (inputs, the tool call, the result, the next step), including cases where the correct move is *no call* or *ask for clarification*.

**3. Let a deterministic layer decide.** The pattern we use in our own document work: the model **proposes** (a classification, a field, a parser definition with an evidence pointer) and **deterministic verifiers decide** whether it is accepted (balance continuity, row counts, schema validity, period bounds). A tuned SLM that can only propose is far safer than one that can act.

| Tool category | Good fit for an SLM? | Why |
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
| Quantization for serving | vLLM's recommended LLM Compressor; llama.cpp quantize tools; AutoAWQ/GPTQ tooling | Formats in [03 §3](03-vehicles.md#3-quantization-formats) |
| Adapter conversion | llama.cpp `convert_lora_to_gguf.py` | For serving a LoRA adapter in GGUF runtimes |
| Evaluation | Your own deterministic scorer first; a general harness only for regression | An LLM judge is a weak scorer for pass/fail gates (see [04 §4](04-build-and-deploy-playbook.md#4-evaluation)) |
| Experiment and model registry | Hugging Face private repos, MLflow, an OCI registry | Registry guidance was **not verified** in the research pass; pick one and record base revision, data version, config, metrics |
| Weight scanning | Safetensors format; scanners such as JFrog's with Hugging Face | See [04 §5](04-build-and-deploy-playbook.md#5-governance) |
