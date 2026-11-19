# Weekly curation workflow

Every Saturday at 09:00 Asia/Kolkata, GitHub Actions runs the weekly updater against `main`.

```mermaid
flowchart LR
  A[Latest arXiv feed] --> F[Previous 7 days]
  F --> D[Remove known paper IDs]
  D --> R[Rank within 5 categories]
  R --> S[Select at most 1 per category]
  S --> G[Generate 3-level tutorials]
  G --> P[Download PDFs and checksums]
  P --> V[Validate]
  V --> PR[Human-reviewed pull request]
```

## Weekly categories and days

- Monday: foundations and architecture.
- Tuesday: building, RAG, reasoning, alignment, and adaptation.
- Wednesday: evaluation and source-code benchmarks.
- Thursday: agents, swarms, MCP/A2A, protocols, and channels.
- Friday: small-business applications and human productivity.

If no qualifying paper exists for a category, that day becomes a catch-up, reproduction, and note-review day. The updater never fills a slot with an irrelevant paper merely to reach five.

## Selection policy

The workflow requests up to 300 recent records in `cs.CL`, `cs.AI`, `cs.LG`, `cs.SE`, `cs.MA`, and `cs.HC`, filters to the previous seven days, removes IDs already present in the core manifest or weekly metadata, and ranks title/abstract matches plus subject fit and recency. One unique paper is selected per category. Scores express relevance to this curriculum, not scientific quality.

## Summary modes

The updater extracts the downloaded PDF with Poppler and calls normal DigitalOcean Serverless Inference at `https://inference.do-ai.run`, using the Chat Completions or Responses endpoint supported by the selected model. The model receives paper text selected across the introduction, methods, evaluation, results, limitations, and appendices, then authors three self-contained tutorials and paper-specific prerequisite appendices. Set `DIGITALOCEAN_MODEL_ID` to force a serverless model ID from the DigitalOcean Model Catalog. If it is unset, the workflow tries a current documented preference list and skips models unavailable to the subscription tier. It does not create or invoke a DigitalOcean agent or dedicated inference deployment. Scheduled production runs fail instead of opening a PR when full-paper authoring or quality checks fail.

Create the model access key in DigitalOcean, then add it only as the `MODEL_ACCESS_KEY` secret in the GitHub `production` environment. Add `DIGITALOCEAN_MODEL_ID` as an optional variable in the same environment. Do not commit the key or place it in workflow inputs. All model inference for this workflow is billed through DigitalOcean.

Generated text must be checked against the PDF before merge. The workflow opens or refreshes a PR and never auto-merges.

## Repository settings

GitHub Actions must be allowed to create pull requests under **Settings → Actions → General → Workflow permissions**. The workflow requests only `contents: write` and `pull-requests: write`, and the curation job is bound to the `production` environment. Environment protection rules can require reviewers before the weekly job receives its model key.

## Manual operation

From `llm-learning-repository` in the common repository:

```text
node weekly-update.mjs --self-test
node weekly-update.mjs --week-ending=2026-08-29 --dry-run
node weekly-update.mjs --week-ending=2026-08-29
node weekly-update.mjs --verify
```

Use the workflow's manual-dispatch input to backfill a particular UTC week-ending date. Re-running the same date is idempotent because recorded arXiv IDs are excluded.

## Failure handling

The job used to abort the whole week when any single model call or quality check failed, discarding hours of authoring; it failed every Saturday from 12 September to 31 October 2026 and GitHub then disabled the schedule for inactivity. It now behaves as follows.

- **Model calls** time out after 300 s (`TUTORIAL_REQUEST_TIMEOUT_MS`), retry timeouts and 408/425/429/5xx on the same model with exponential backoff, then move to the next model, and repeat the whole candidate list for up to three rounds. A model that answers 404 "not a responses model" is switched to `/chat/completions` and remembered.
- **Quality gates** give each chapter part three attempts. A missing limitations discussion in the assembled guide no longer discards the paper; the guide is published with a `REVIEW NEEDED` banner.
- **Per-paper isolation:** a paper that cannot be authored is skipped and listed in `SKIPPED.md` and in the pull request body; the other papers are kept. If every paper fails, the job fails loudly and records nothing for that week.
- **Resume:** accepted chapter parts are cached (Actions cache) so a manual re-run with `week_ending` reuses them.
- **Offline tests:** `node test-weekly-resilience.mjs` exercises these behaviours against a stub inference server and runs before every weekly job.

Scheduled workflows are disabled by GitHub after 60 days without repository activity. If it happens again, re-enable with `gh workflow enable "Weekly LLM knowledge update"`.

The generated weekly guides are drafts in the older three-level format, written by an open model from the paper text. They are not held to the v2 standard in [guide-authoring-spec-v2.md](guide-authoring-spec-v2.md).
