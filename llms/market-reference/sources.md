# Source register

**Checked:** 2026-08-29

Sources are grouped by authority. A link is evidence for the specific specification or benchmark definition attributed to it, not an endorsement of every claim on the page.

## Model catalogs, cards, and pricing

### OpenAI

- [All API models](https://developers.openai.com/api/docs/models/all) — current model families and lifecycle navigation.
- [GPT-5.6 Sol model page](https://developers.openai.com/api/docs/models/gpt-5.6-sol) — model ID, context, output, cutoff, modalities, tools, and price.
- [gpt-oss-120b official model card](https://huggingface.co/openai/gpt-oss-120b) — Apache 2.0, architecture/active parameters, memory positioning, tool/reasoning behavior, and model-card evaluations.

### Anthropic

- [Claude model overview](https://platform.claude.com/docs/en/models/overview) — current lineup, IDs, context/output, positioning, and summary pricing.
- [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) — token, cache, batch, long-context, tool, and tokenizer qualifications.
- [Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) — vendor examples of cost per completed task versus price per token. Treat its results as vendor-measured illustrations, not universal rankings.

### Google

- [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models) — current text, image, video, audio and embedding families and status.
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) — standard, batch, flex, priority, cache/storage, grounding, media, and effective-unit examples.
- [Gemma 4 official model card](https://huggingface.co/google/gemma-4-26B-A4B) — variant, modality, context, language, and Apache 2.0 information.

### Other representative model publishers

- [Grok 4.6](https://docs.x.ai/developers/models/grok-4.6) and [xAI pricing](https://docs.x.ai/developers/pricing) — current model purpose, context, modalities, tools, cache, and long-context rates.
- [Amazon Nova 2](https://docs.aws.amazon.com/nova/latest/nova2-userguide/what-is-nova-2.html) and [Amazon model cards](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards-amazon.html) — Bedrock access, multimodal Nova families, context and use cases.
- [Mistral model catalog](https://docs.mistral.ai/models/) — open-weight and commercial general, code, audio, OCR, embedding, and safety models.
- [Qwen3.5-397B-A17B official model card](https://huggingface.co/Qwen/Qwen3.5-397B-A17B) — Apache 2.0, multimodality, native/extended context and serving guidance.
- [DeepSeek-V3.2 official model card](https://huggingface.co/deepseek-ai/DeepSeek-V3.2) — MIT weights, model size and serving information.
- [Meta Llama 4 Maverick official model card](https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct) — multimodal model and custom Llama 4 license.

## Coding and agent benchmarks

- [SWE-bench](https://www.swebench.com/) and [official repository organization](https://github.com/swe-bench) — benchmark definitions, harness and variants.
- [SWE-bench paper](https://proceedings.iclr.cc/paper_files/paper/2024/file/edac78c3e300629acfe6cbe9ca88fb84-Paper-Conference.pdf) — construction from GitHub issues and pull requests.
- [SWE-bench Verified methodology](https://openai.com/index/introducing-swe-bench-verified/) — human validation and contamination caveat.
- [Terminal-Bench](https://www.frontierbench.ai/) and [official repository](https://github.com/harbor-framework/terminal-bench) — terminal tasks, leaderboard, tokens and cost.
- [Terminal-Bench 2.0 paper](https://arxiv.org/abs/2601.11868) — curated task set and evaluation discussion.
- [LiveCodeBench](https://livecodebench.github.io/) — continuously updated coding evaluation.
- [HumanEval](https://github.com/openai/human-eval) — function-generation evaluation and pass@k.
- [RepoBench](https://github.com/Leolty/repobench) — repository-level code completion and retrieval.
- [τ-bench](https://taubench.com/) and [paper](https://arxiv.org/abs/2406.12045) — tool-agent-user interaction.
- [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) — function-calling categories and evaluation.
- [CRMArena official repository](https://github.com/SalesforceAIResearch/CRMArena) and [paper](https://arxiv.org/abs/2411.02305) — professional CRM environments and tasks.
- [WorkArena official repository](https://github.com/ServiceNow/WorkArena) — ServiceNow knowledge-work tasks and WorkArena++.
- [OSWorld](https://os-world.github.io/) — real-computer task environment.
- [GAIA](https://gaia-benchmark.github.io/) — tool-using general-assistant evaluation.
- [MCP-Universe](https://github.com/SalesforceAIResearch/MCP-Universe) — MCP agent tasks and execution evaluation.

## Business, document, finance, and legal benchmarks

- [GDPval overview](https://openai.com/index/gdpval/) and [evaluation site](https://evals.openai.com/) — 1,320 tasks across 44 occupations, 220-task public gold subset, deliverables, grading and limitations.
- [DocVQA](https://www.docvqa.org/) and [DocVQA 2026](https://www.docvqa.org/challenges/2026) — document-image QA and newer multi-domain reasoning.
- [FinanceBench paper](https://arxiv.org/abs/2311.11944) — open-book financial question answering.
- [LegalBench official repository](https://github.com/HazyResearch/legalbench) and [NeurIPS paper](https://papers.neurips.cc/paper_files/paper/2023/hash/89e44582fd28ddfea1ea4dcb0ebbf4b0-Abstract-Datasets_and_Benchmarks.html) — 162 tasks across six legal-reasoning types.
- [VBench official repository](https://github.com/Vchitect/VBench) and [CVPR paper](https://openaccess.thecvf.com/content/CVPR2024/papers/Huang_VBench_Comprehensive_Benchmark_Suite_for_Video_Generative_Models_CVPR_2024_paper.pdf) — generation dimensions, prompts, metrics and human alignment.
- [aec-bench](https://www.aecbench.com/) and [documentation](https://www.aecbench.com/docs) — emerging AEC agent-task platform and reproducibility tooling.
- [AECBench official repository](https://github.com/ArchiAI-LAB/AECBench) — AEC-domain LLM benchmark.

## Maintenance note

Provider catalogs and prices are live mutable pages. When a decision relies on them, capture an internal dated snapshot or procurement quote and record currency, region, platform, volume tier, caching behavior, taxes, and contract discounts. Never edit historical experiment costs to match a later price.
