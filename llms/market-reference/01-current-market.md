# Current model market

**As of 2026-08-29.** Model aliases, preview status, quotas, and prices can change without the underlying product name changing. Follow the linked live catalog before implementation.

## Access categories

| Category | What the buyer receives | Typical strength | Main constraint |
|---|---|---|---|
| Hosted proprietary | API or application access; no weights | Fast access to frontier capability and managed tools | Vendor dependency, data terms, variable lifecycle |
| Hosted open-weight | API access to a downloadable model | Portability plus low operational burden | Hosted build may differ from the downloadable artifact |
| Self-hosted open-weight | Model weights under a stated license | Control, locality, tuning, predictable capacity | GPU, serving, security, upgrades, and operations are yours |
| Specialist generation | Image, video, audio, OCR, or embedding endpoint | Modality-specific quality and controls | Non-token units and specialist evaluation are common |

“Open-weight” describes weight access, not necessarily an open-source license, open training data, or reproducible training. See [open weights and Hugging Face](02-open-weights-and-hugging-face.md).

## Hosted frontier text, vision, and agent models

Prices below are standard API list prices in USD per million tokens for the named snapshot and may exclude batch discounts, long-context multipliers, cache storage, search/grounding, containers, and regional cloud markups.

| Provider | Current family / model ID | Positioning and modalities | Context / output | Input / cached / output | Best initial fit | Important qualification |
|---|---|---|---:|---:|---|---|
| OpenAI | `gpt-5.6-sol` | Highest GPT-5.6 capability; text output, text/image input; broad hosted tools | 1.05M / 128K | $4 / $0.40 / $20 | Complex coding, research, professional agents | Promotional price stated through at least 2026-11-21; long-context pricing changes above 272K input tokens |
| OpenAI | GPT-5.6 Terra | Capability/cost balance in current flagship family | See live model page | See live pricing | General production agents and professional workflows | Validate exact model ID, context, and price at implementation time |
| OpenAI | GPT-5.6 Luna | Cost-sensitive current flagship tier | See live model page | See live pricing | High-volume routing, extraction, simpler assistance | Do not infer task economics from family position alone |
| Anthropic | `claude-fable-5` | Highest current Claude capability; text/image input, tools, long-running agents | 1M / 128K | $10 / $1 cache hit / $50 | Long-horizon, high-value agents | Slower and premium-priced; validate completed-task cost |
| Anthropic | `claude-opus-5` | Complex agentic coding and enterprise work | 1M / 128K | $5 / see live cache / $25 | Coding and difficult enterprise work | Model plus Claude Code or another scaffold must be evaluated as a system |
| Anthropic | `claude-sonnet-5` | Speed/intelligence balance | 1M / 128K | $2 / $0.20 / $10 during current promotion | Interactive coding and broad business automation | Published price is promotional through 2026-08-31; standard price becomes $3 / $0.30 / $15 |
| Anthropic | `claude-haiku-4-5-20251001` | Fastest current Claude tier, text/image and tools | 200K / 64K | $1 / $0.10 / $5 | Classification, routing, responsive assistants | Lower price does not guarantee lower cost after escalations and retries |
| Google | Gemini 3.7 Flash | Current Flash upgrade target for coding/design and agentic multimodal use | See live model page | See live pricing | Fast multimodal and agentic applications | Confirm availability and stable/preview status by region |
| Google | Gemini 3.5 Flash | Multimodal speed/intelligence balance | See live model page | $1.50 / $0.15 / $9 | High-volume multimodal reasoning and agents | Output price includes thinking tokens; grounding and cache storage are separate |
| Google | Gemini 3.5 Flash-Lite | High-volume agentic tasks, translation, simple processing | See live model page | $0.30 / $0.03 / $2.50 | Routing, extraction, translation | Batch/flex prices differ; validate accuracy on structured output |
| Google | Gemini 3.1 Pro Preview | Pro reasoning, multimodal understanding, agents, coding | See live model page | See live pricing | Complex multimodal prototypes | Preview models are poor choices for an unqualified long-lived dependency |
| SpaceXAI / xAI | `grok-4.6` | Frontier coding, agentic tasks and knowledge work; text/image input | 500K / no stated text-output limit | $2 / $0.50 / $6 | Coding and tool-using knowledge work | Prompts at or above 200K use $4 / $1 / $12 long-context rates; cache routing affects realized hits |
| Mistral AI | `mistral-medium-3-5` | Frontier-class multimodal model for agentic and coding use; hosted API and weights | See model page | $1.50 / — / $7.50 | European-hosting options, agents, coding, weight portability | 128B dense weights use Modified MIT; self-hosting requires a separate TCO evaluation |
| Amazon | Nova 2 Lite | Cost-efficient multimodal reasoning through Bedrock; text/image/video/document input | Up to 1M / 65,536 | See Bedrock pricing | High-volume AWS-native document, video and agent workloads | Bedrock region, cross-region inference and platform pricing are part of the system |

Sources: [OpenAI model catalog](https://developers.openai.com/api/docs/models/all), [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Claude model overview](https://platform.claude.com/docs/en/models/overview), [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Gemini models](https://ai.google.dev/gemini-api/docs/models), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Grok 4.6](https://docs.x.ai/developers/models/grok-4.6), [Amazon Nova 2](https://docs.aws.amazon.com/nova/latest/nova2-userguide/what-is-nova-2.html), and [Mistral models](https://docs.mistral.ai/models/).

### Tokenizer comparability warning

Tokens are not a universal unit of text. Anthropic documents that Claude 4.7-and-later families use a tokenizer that can produce roughly 30% more tokens for the same text, with workload-specific variation. Compare the bill for the same corpus and task, not only price per million tokens.

## Specialist modality market

This is a routing map, not a complete product list. Specialist systems should be evaluated in their natural billing unit—accepted image, usable video-second, correct document, or intelligible audio-minute—rather than forced into a text-token comparison.

| Need | Representative current families | Natural outcome unit | Evaluation focus | Cost traps |
|---|---|---|---|---|
| Image understanding | GPT-5.6, Claude 5, Gemini 3.x, Qwen 3.5, Gemma 4 | Correctly handled image/document | OCR, charts, spatial relations, refusal and citation | Image tokenization, resolution tiers, repeated page context |
| Image generation/editing | OpenAI GPT-Image-2; Google Nano Banana families; specialist providers | Accepted asset or approved edit | Prompt adherence, text rendering, identity/style consistency, rights and safety | Variants, retries, upscaling, storage and human selection |
| Video generation/editing | Google Veo/Gemini Omni; specialist providers such as Runway | Accepted second or approved clip | Temporal consistency, physics, motion, prompt adherence, brand safety | Billing per second, discarded generations, resolution, extension calls |
| Speech-to-text | OpenAI transcription; Gemini Transcribe; Mistral Voxtral | Correct audio-minute | Word error, speakers, timestamps, language and noise | Audio token conversion, streaming duration, post-correction |
| Real-time voice | OpenAI Realtime; Gemini Live; voice-specialist APIs | Successful call or contained minute | Interruption, latency, task completion, escalation, safety | Separate audio input/output rates and idle session time |
| OCR/document structure | Mistral OCR 4.1 and multimodal frontier models | Correct page/document | Layout, tables, handwriting, reading order, confidence | Page fees plus downstream LLM tokens and exception review |
| Embeddings/reranking | OpenAI, Google, Cohere, Mistral, open embedding models | Relevant retrieval at target recall | Recall@k, NDCG, language/domain coverage, latency | Re-embedding corpus, vector storage, reranker calls |

Google’s current pricing page illustrates why natural units matter: Gemini Omni Flash video output is expressed in video tokens but also approximately $0.10 per second at 720p; image-generation prices are also translated into approximate cost per image. Always preserve both the billed unit and the business outcome unit.

## Selection by operating mode

| Operating mode | Start with | Also test | Why |
|---|---|---|---|
| Highest-value, low-volume expert task | Top frontier reasoning model | Balanced frontier model | Determine whether premium reasoning reduces review and retries enough to pay for itself |
| High-volume structured task | Low-cost/fast hosted model | Small open-weight model and a frontier fallback | Routing and escalation often dominate a single-model strategy |
| Sensitive local workload | Appropriately licensed open-weight model | Private managed endpoint | Compare governance and operating costs, not only GPU price |
| Interactive application | Fast balanced model | Higher tier for difficult turns | Time-to-first-token and tail latency affect adoption and productivity |
| Long-running agent | Frontier model with reliable tools | Less expensive model under the same scaffold | Failure compounding and tool errors dominate long tasks |
| Batch enrichment | Batch/flex pricing tier | Self-hosted continuously batched model | Utilization and deadlines determine the economic winner |

## Commercial and deployment checks

Before shortlisting a model, record:

- exact version rather than a moving alias;
- availability in the intended region and platform, including DigitalOcean if used;
- retention, training-use, residency, encryption, and deletion terms;
- throughput quotas, rate limits, batch support, cache semantics, and service level;
- input, cached input, output/reasoning, storage, grounding, tool, and media charges;
- deprecation and preview policy;
- indemnity, acceptable-use, and generated-content terms;
- portability of prompts, tool schemas, eval traces, and fallback behavior.

## What not to infer

- A larger context window does not prove reliable use of all context.
- A high coding score does not establish repository conventions, source-control safety, or review quality.
- A multimodal label does not establish document, CAD, chart, or video competence.
- A low API price does not establish low total cost.
- A vendor benchmark result does not establish performance under a different scaffold or token budget.
