# 03. Vehicles: what carries an SLM to a user

"Vehicle" has four layers. Teams that name only one of them (usually "we'll use Ollama") hit surprises in the others.

```mermaid
flowchart LR
  T[Training run] -->|adapter files| A[1 Artifact]
  A -->|merged or loaded with base| R[2 Runtime]
  R -->|HTTP API or in-process library| C[3 Channel]
  C -->|requests from| U[User or agent]
  AG[4 Role in the agent system] -.decides what the model is asked.-> C
```

Read it left to right: training produces an *artifact*; a *runtime* loads it; a *channel* exposes the runtime to people or agents; and the *role* the model plays in the agent system decides what is ever sent to it. Each layer has its own failure modes and its own owner.

## 1. Artifact: what you ship

| Artifact | What it is | Size (order of magnitude) | Pros | Cons |
|---|---|---|---|---|
| **Adapter only** (LoRA safetensors) | The small trained matrices; needs the exact base model | Megabytes (about 35 MB for GPT-3 175B at rank 4 on two matrices, [LoRA paper §4.2](https://arxiv.org/abs/2106.09685)) | Tiny; many adapters per base; swap per tenant or task; easy to version | Runtime must support adapters; use the base the adapter was created from (the surviving Ollama wording, in [Ollama's pinned v0.9.0 import guide](https://cdn.jsdelivr.net/gh/ollama/ollama@0.9.0/docs/import.md), is "the same base model", otherwise "erratic results") |
| **Merged weights** (safetensors) | Adapter folded into the base | Same as the base: 4B at 16-bit is about 8 GB | Works in any runtime; no adapter plumbing | One full copy per task; licence and provenance of the whole file is now yours |
| **Quantized merged weights** (GGUF, AWQ, GPTQ, FP8, NVFP4, MXFP4) | Merged weights stored at lower precision | 4B at about 4.9 bits per weight is about 2.45 GB (Q4_K_M is 4.8944 bits per weight on Llama-3.1-8B in the [llama.cpp README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)) | Fits laptops and small GPUs; faster | Quality must be re-measured **on the exact quantized file**; formats are runtime-specific |
| **Container image** | Runtime plus weights plus config | Gigabytes | Reproducible; fits Kubernetes and air-gapped sites | Big images; each base update rebuilds |
| **OCI artifact or registry entry** | Weights stored and versioned like images | Same as weights | Reuses your artifact registry, signing and promotion flow | Tooling is less standard than for images; registry choice was unverified |
| **Bundled in a desktop or mobile app** | Weights ship inside or download beside the app | 1 to 3 GB for small models | No server; works offline; strongest privacy story | You now distribute weights to devices: licence, update, and tamper questions; hardware variance |

**Arithmetic you can reuse.** Weights memory is parameters times bits per weight divided by 8. A 4B model: 16-bit is 4,000,000,000 x 16 / 8 = 8.0 GB; at 4.9 bits per weight (Q4_K_M is 4.8944 bits on Llama-3.1-8B per the [llama.cpp quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)) it is 4,000,000,000 x 4.9 / 8 = 2.45 GB. This excludes the key-value cache for the context, which grows with sequence length and concurrent users, and runtime overhead; **Assumption:** plan 20 to 50 percent headroom (a planning rule of thumb, not a measured figure). For the KV-cache formula and its source, see [05 §6](05-neural-network-anatomy-and-quantization.md#6-what-memory-is-actually-spent-on).

Rule for adapters: **record the base repository, revision hash, tokenizer, chat template, adapter rank and target modules next to every adapter**, or you cannot reproduce or safely swap it.

## 2. Runtime: what loads and runs it

| Runtime | Best fit | Adapters and quantization | Structured output | Status and caution |
|---|---|---|---|---|
| **[vLLM](https://docs.vllm.ai/en/latest/features/lora/)** | Server-side throughput on NVIDIA and other GPUs | Multi-LoRA: `--enable-lora`, `--lora-modules name=path`, `--max-loras` (adapters active per batch, default 1), `--max-lora-rank` (at least your adapter rank), `--max-cpu-loras`; runtime load and unload needs `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True`. Quantization: AWQ, GPTQ, FP8, MXFP4, NVFP4, GGUF; LLM Compressor recommended ([quantization docs](https://docs.vllm.ai/en/latest/features/quantization/)) | xgrammar or guidance backends ([structured outputs docs](https://docs.vllm.ai/en/latest/features/structured_outputs/)) | The common default for enterprise self-hosting |
| **[SGLang](https://docs.sglang.ai/advanced_features/structured_outputs.html)** | Server-side serving with strong structured output | LoRA serving config exists (`max_loras_per_batch`) | XGrammar (default), Outlines or Llguidance; JSON schema, regex, EBNF (older docs had Outlines as default) | Quantization formats include fp8, mxfp4, nvfp4, awq, gptq_marlin and gguf, varying by platform ([SGLang quantization docs](https://docs.sglang.io/advanced_features/quantization.html)) |
| **[llama.cpp / GGUF](https://github.com/ggml-org/llama.cpp)** | CPU, Mac and edge; smallest dependency footprint | GGUF quantization; LoRA via GGUF adapters | GBNF grammars and JSON-schema constrained decoding | Our own use in [04 §7](04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments) was single-user; we make no throughput claim |
| **[Ollama](https://docs.ollama.com/capabilities/structured-outputs)** | Developer and desktop serving, evaluation | Modelfile: `FROM <base>` plus `ADAPTER <safetensors dir>` (documented in [Ollama's pinned v0.9.0 import guide](https://cdn.jsdelivr.net/gh/ollama/ollama@0.9.0/docs/import.md); the current docs pages no longer contain adapter text) | `format` field takes a JSON schema ([docs](https://docs.ollama.com/capabilities/structured-outputs)) | Convenient; a shared service, so run a separate instance for experiments rather than restarting it. Our import: safetensors via the MLX engine, no structured output on that path |
| **[MLX-LM](https://github.com/ml-explore/mlx-lm) / MLX Swift** | Apple silicon, including shipped macOS apps | `lora`, `dora` and `full` fine-tuning types ([LORA.md](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md)); fused export | Details unverified | Memory is one shared pool |
| **LoRAX / S-LoRA** | Many adapters on one base for many tenants | Designed for it: the LoRA Land demo hosts 25 LoRA fine-tuned Mistral-7B models on one 80 GB A100 ([arXiv 2405.00732](https://arxiv.org/abs/2405.00732)) | n/a | Current maintenance of LoRAX is **unverified**; vLLM multi-LoRA now covers the common case |
| **[NVIDIA NIM, TensorRT-LLM, Triton](https://docs.nvidia.com/nim/large-language-models/latest/release-notes.html)** | NVIDIA-standardised production | NIM release notes list TensorRT-LLM LoRA profiles, some needing `NIM_MAX_GPU_LORAS=1`; guided decoding defaults to XGrammar | Supported | Release notes flag NVFP4 profiles that failed conformance checks that BF16 and FP8 passed, and throughput regressions versus open-source vLLM on B200/GB200 in some releases. Triton details unverified |
| **LiteRT-LM (Google; [blog](https://developers.googleblog.com/blazing-fast-on-device-genai-with-litert-lm/), [export docs](https://developers.google.com/edge/litert/conversion/pytorch/genai))** | On-device phones and browsers | Export defaults to per-channel INT8 weights with FP32 activations; exporters for Gemma 3, 3n and 4, Llama, Mistral, Qwen | Function calling supported | Gemma 4 E2B (about 2.58 GB) runs in roughly 607 MB resident on Apple mobile CPUs (Google blog, May 2026; vendor figure) |
| **ExecuTorch, MLC, ONNX Runtime GenAI** | On-device alternatives | | | **Unverified**; no current sources were found |
| **[Text Generation Inference (TGI)](https://huggingface.co/docs/text-generation-inference/index)** | Avoid for new work | | | Hugging Face docs: maintenance mode (minor fixes only), recommending vLLM or SGLang. A third party says the repository was archived in March 2026; verify |

**Choosing a runtime in one line each:** a server with a GPU, many users, several adapters: vLLM. Mac or desktop product: MLX or llama.cpp. Phone or browser: LiteRT-LM. Quick evaluation on a developer machine: Ollama. Need NVIDIA-supported production with a support contract: NIM.

### Kubernetes layer

llm-d is a CNCF Sandbox project (accepted 12 March 2026) built on vLLM and the Gateway API Inference Extension ([CNCF](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)); KServe is described as the control plane that consumes it ([Red Hat article](https://developers.redhat.com/articles/2026/04/21/kserve-llm-d-optimized-gen-ai-inference), secondary). KubeAI is unverified. **Judgment:** for a first enterprise deployment, a single vLLM Deployment behind your existing gateway is enough; adopt these when you have several models and need routing and autoscaling.

## 3. Quantization formats

| Format | Where it runs | Quality note | Use when |
|---|---|---|---|
| GGUF Q8_0 | llama.cpp, Ollama | llama.cpp's quantize tool lists a perplexity change of +0.0026 on Llama-3-8B at 7.96 GB ([quantize.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/quantize.cpp)); varies by model and version | You have memory and want near-lossless |
| GGUF Q4_K_M | llama.cpp, Ollama | 4.8944 bits per weight on Llama-3.1-8B ([README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)); the same tool lists +0.1754 perplexity on Llama-3-8B at 4.58 GB; the k-quants design gives Q4_K_M the 6-bit type for half of the attention.wv and feed_forward.w2 tensors ([PR #1684](https://github.com/ggml-org/llama.cpp/pull/1684)) | Laptops, edge, small GPUs |
| [AWQ](https://arxiv.org/abs/2306.00978), [GPTQ](https://arxiv.org/abs/2210.17323) (with Marlin kernels) | vLLM and others | Comparative quality and speed was **not verified** in this pass | GPU servers; test both on your task |
| FP8 | vLLM, NIM, newer NVIDIA GPUs | Common production default on supporting hardware | Throughput on H100-class GPUs |
| MXFP4 (block of 32 with an 8-bit scale, [MX paper Table 1](https://arxiv.org/abs/2310.10537); 4.25 bits is this guide's arithmetic, 4 + 8/32, and matches [vLLM's table](https://docs.vllm.ai/en/latest/features/quantization/formats/)), NVFP4 (block of 16 with an FP8 scale, about 4.5 bits per value, [NVIDIA blog](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/)) | vLLM; NVFP4 needs Blackwell-class hardware (inferred, unverified) | NVIDIA reports 1% or less accuracy loss versus FP8 on one large model via post-training quantization (vendor figure, same blog); Marlin MXFP4 is not supported on Turing GPUs | You own the newest GPUs |

Two rules. **Re-run your evaluation on the exact quantized artifact** that will be served; a good 16-bit score does not carry over automatically. **Merge in 16-bit before quantizing** (**Judgment**): [Bedrock Custom Model Import](https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html) accepts only FP32, FP16 or BF16 safetensors, and merging an adapter into an already-quantized base is untested here. Quantization-aware training recovers more quality at 2 to 4 bits than post-training quantization, at the price of more engineering; a like-for-like comparison on one model was not found.

## 4. Channel: how users and agents reach it

The table below is **Judgment**: it summarises common delivery options and trade-offs; no source measures them against each other.

| Channel | Where the model runs | Pros | Cons | Typical enterprise use |
|---|---|---|---|---|
| **Private API in your cloud account or VPC** (virtual private cloud) | Your GPUs | Data stays in your boundary; shared by many apps; central ops | You run GPUs, scaling and on-call | The default for server-side agents and batch jobs |
| **Hosted endpoint from a vendor** | Vendor GPUs | Least operations | Data leaves your boundary; check weight export and region | Prototypes; low-sensitivity workloads |
| **On-premises or air-gapped server** | Your hardware | Strictest control | Capital cost, patching, slow hardware refresh | Regulated or classified data |
| **Desktop application** | The user's computer | No server; offline; strongest privacy claim | Weights on endpoints; hardware varies; updates are your job | Document tools, personal assistants |
| **Mobile or browser** | The user's device | Offline; zero server cost per call | Tightest size and memory limits (1 to 3 GB); hardest to update and test | Light classification, extraction, assistive features |
| **Sidecar next to an application** | Same host or pod as the app | Low latency; app-specific model | Duplicates memory per replica | Latency-critical single-purpose calls |

## 5. Role: what the SLM does in the agent system

**Judgment (this table has no measured source):** a tuned SLM rarely replaces the whole agent. It takes specific roles, and the role decides the channel and the risk.

| Role | What it does | Why a small model suits it | Risk control |
|---|---|---|---|
| **Router or classifier** | Picks the intent, the tool family, or which larger model to call | Narrow, high-volume, scorable | Always allow "unknown" and fall back to a larger model |
| **Extractor or parser** | Turns documents into structured records | Format and schema behaviour tunes well | Deterministic verifiers accept or reject each record |
| **Specialist worker** | Does one repeated sub-task inside an agent loop (tag, summarise, draft a query) | Cheap enough to call many times | Typed inputs and outputs; output checked before use |
| **Guard or filter** | Screens inputs and outputs (sensitive data, policy) | Always-on, so cost matters | Treat as one layer, not the only one |
| **Local first pass** | Handles requests on-device; escalates what it cannot | Privacy and latency | Explicit escalation rule and logging of what leaves the device |
| **The whole assistant** | Reasons across steps and tools | Only for narrow domains | Hardest to evaluate; the evidence base here is thinnest |

```mermaid
flowchart TB
  IN[Request] --> RT[SLM router]
  RT -->|known simple intent| W[SLM specialist worker]
  RT -->|unknown or hard| BIG[Larger model route]
  W -->|proposed record plus evidence pointer| V[Deterministic verifier]
  V -->|accepted| OUT[Result]
  V -->|rejected| BIG
  BIG --> OUT
```

Notice three things: the SLM never writes a result directly (the verifier gates it), "unknown" has a defined destination, and the larger model is an escalation path, not the default. The NVIDIA position paper argues SLMs are sufficiently powerful, more suitable and more economical for many agentic invocations ([arXiv 2506.02153, §2.2](https://arxiv.org/abs/2506.02153)); the escalation design here is this guide's **Judgment**. Note that sending traffic to a hosted larger model may conflict with a goal of keeping everything on open or local models, so choose the escalation target to match your privacy rule.
