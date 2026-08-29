# Open weights and the Hugging Face ecosystem

## Terminology that prevents expensive mistakes

| Term | Means | Does not automatically mean |
|---|---|---|
| Open weights | Parameters can be downloaded under stated terms | OSI open source, open data, reproducible training, unrestricted commercial use |
| Open-source model | Claim that should be checked against the exact code/data/weight licenses and the current Open Source AI definition | Every artifact is permissively licensed |
| Source-available | Some artifacts are visible but use is restricted | Open source |
| Hugging Face model | A repository on the Hugging Face Hub | A model created, audited, licensed, or hosted by Hugging Face |
| Quantization | Lower-precision representation intended to reduce memory/compute | Equal quality, equal context capacity, or compatibility with every serving engine |
| Fine-tune / adapter | A derivative that modifies model behavior | Same safety, license, evaluation, or provenance as the base model |

For procurement, record the publisher, repository revision, weight format, base model, derivative lineage, license, tokenizer, chat template, quantization, serving engine, and evaluation harness. A Hub display name alone is not an identity.

## Current representative open-weight families

This list favors consequential, documented families rather than every popular derivative.

| Publisher / artifact | Access and license | Scale / modality | Practical starting point | Cautions |
|---|---|---|---|---|
| OpenAI `gpt-oss-120b` | Downloadable, Apache 2.0 | 117B total / 5.1B active; text reasoning/tools; MXFP4 | High-capability local or private serving; model card says it fits one 80 GB GPU | A model-card benchmark is vendor evidence; validate chat template, reasoning budget, safety, and throughput |
| OpenAI `gpt-oss-20b` | Downloadable, Apache 2.0 | 21B total / 3.6B active; text reasoning/tools | Workstations and constrained private inference; model card targets 16 GB memory | Smaller footprint does not remove serving, security, or quality-review costs |
| Qwen `Qwen3.5-397B-A17B` | Downloadable, Apache 2.0 | 397B-class MoE with 17B active; image-text; native 262,144 context, extensible | Multilingual, multimodal, agentic and coding evaluation; official hosted counterpart available | Full serving example uses eight GPUs; million-token extension has memory and quality implications |
| DeepSeek `DeepSeek-V3.2` | Downloadable weights, MIT | 685B parameters; text generation | Large-scale reasoning/coding evaluation or managed inference | Extremely large self-host footprint; verify provider implementation and security controls |
| Google Gemma 4 family | Downloadable, Apache 2.0 | E2B through 31B variants; multimodal and multilingual capabilities vary by size | Smaller private multimodal deployments and research | Confirm modality and context for the exact variant, not family-level marketing |
| Meta Llama 4 Maverick | Downloadable under custom Llama 4 license | Multimodal MoE, 17B active / 128 experts in named variant | Ecosystem compatibility and private multimodal evaluation | Custom license: classify as open-weight/source-available, not automatically open source |
| Mistral Medium 3.5 | Hosted and downloadable, Modified MIT | 128B dense, multimodal | Agentic/coding evaluation with hosted-to-private portability | Published GPU-RAM range is substantial; compare hosted API with actual self-host TCO |

Primary model cards: [gpt-oss-120b](https://huggingface.co/openai/gpt-oss-120b), [Qwen3.5-397B-A17B](https://huggingface.co/Qwen/Qwen3.5-397B-A17B), [DeepSeek-V3.2](https://huggingface.co/deepseek-ai/DeepSeek-V3.2), [Gemma 4](https://huggingface.co/google/gemma-4-26B-A4B), and [Llama 4 Maverick](https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct).

## How to use Hugging Face safely

```mermaid
flowchart LR
  H[Hub repository] --> P[Publisher and revision]
  P --> L[License and lineage]
  L --> A[Artifact and tokenizer]
  A --> R[Runtime and quantization]
  R --> E[Reproducible eval]
  E --> D[Deployment decision]
```

1. Prefer a verified official publisher and pin a commit revision.
2. Read the repository license and upstream base-model license; a derivative cannot grant rights it did not receive.
3. Inspect model card gaps: training data, intended use, languages, safety, known limits, and benchmark harness.
4. Verify files and formats. Safetensors reduces a class of arbitrary-code risk, but custom loaders and `trust_remote_code` still need review.
5. Reproduce the exact tokenizer, chat template, generation settings, reasoning mode, and tool parser used by the reported evaluation.
6. Scan dependencies and container images; isolate evaluation from production credentials and data.
7. Measure on the exact quantization and serving stack intended for production.
8. Preserve model revision, runtime revision, configuration, prompts, and output traces in the evaluation record.

## Self-hosting economics

“No per-token license charge” is not “free inference.” Normalize the following into the same accepted-outcome ledger used for APIs:

```text
hourly_platform_cost = gpu + cpu + ram + storage + network + orchestration
effective_hourly_cost = hourly_platform_cost / useful_utilization

served_token_cost = effective_hourly_cost / completed_tokens_per_hour

total_self_host_cost = platform
                     + engineering_operations
                     + evaluation_and_safety
                     + idle_and_failover_capacity
                     + review_and_remediation
```

### Variables that dominate

- **Weights and KV cache:** model weights occupy memory even when idle; concurrent sequences and long context expand KV-cache demand.
- **Precision and quantization:** lower precision reduces memory and can increase throughput, but may change quality or supported kernels.
- **Active versus total parameters:** mixture-of-experts compute can depend on active parameters while storage and memory still reflect a much larger model.
- **Batching:** continuous batching improves throughput but can worsen interactive latency.
- **Prompt caching:** serving stacks differ in prefix-cache sharing, eviction, and accounting.
- **Speculative decoding and kernels:** runtime implementation can change tokens/second more than a superficial parameter comparison suggests.
- **Utilization:** a powerful GPU used 15% of the time can be more expensive per outcome than an API with a higher nominal token price.
- **Reliability:** redundancy, rolling upgrades, observability, abuse controls, and incident response are production costs.

### Break-even calculation

For a defined workload and quality gate:

```text
api_cost_per_accepted = api_total_cost / api_accepted_outcomes
self_host_cost_per_accepted = self_host_total_cost / self_host_accepted_outcomes

break_even_accepted_outcomes_per_month =
  fixed_self_host_monthly_cost /
  (api_variable_cost_per_accepted - self_host_variable_cost_per_accepted)
```

The denominator is valid only if both systems meet the same acceptance criteria. Include a managed open-weight endpoint as a third candidate; it often reveals whether the value comes from weight portability or from operating the infrastructure yourself.

## Deployment shortlist by constraint

| Constraint | Candidate direction | Proof required |
|---|---|---|
| Single workstation | Smaller gpt-oss, Gemma, Qwen, or other compact variant | Memory at target context; latency; task acceptance; license |
| Single 80 GB accelerator | gpt-oss-120b or a quantized model that explicitly supports it | Sustained concurrency, KV cache, exact quantization quality |
| Multi-GPU server | Large Qwen/DeepSeek/Llama/Mistral family | Tensor parallel efficiency, failure handling, utilization |
| Air-gapped or regulated | Permissively licensed artifact with auditable runtime | Complete artifact supply chain, security hardening, data controls |
| Bursty production | Hosted API or managed open-weight endpoint | Quota, cold start, data terms, accepted-outcome economics |
| Stable high-volume batch | Self-hosted or reserved managed capacity | Utilization forecast, batch deadline, operations budget |

## License and risk checklist

- Is commercial use allowed for the intended organization size, geography, and use?
- Are redistribution, derivative, attribution, or acceptable-use obligations compatible?
- Does the tokenizer, adapter, quantization, or dataset carry an additional license?
- Can the organization document provenance and revision for an audit?
- Are generated-output terms and training-data allegations acceptable to legal counsel?
- Does the deployment require export-control, sanctions, sectoral, privacy, or content review?

This reference is technical guidance, not legal advice. Preserve exact license texts and obtain counsel for material deployments.
