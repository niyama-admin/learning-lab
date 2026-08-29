# Weekly market change reports

The Saturday workflow writes a report here only when it finds an evidence-backed material change to the model inventory. Each report contains the applied CSV changes, short exact evidence excerpts, official links, retrieval timestamps, source SHA-256 fingerprints, updater token usage, and a reviewer checklist. It estimates inference cost when the production environment defines `DIGITALOCEAN_INPUT_USD_PER_MILLION`, `DIGITALOCEAN_CACHED_INPUT_USD_PER_MILLION`, and `DIGITALOCEAN_OUTPUT_USD_PER_MILLION`.

Reports are discovery and audit artifacts. The automated branch never merges itself. A reviewer must open the live official source and confirm model identity, lifecycle, access, license, modality, context, pricing basis, long-context/cache/tool/media qualifications, region, and effective date.

No report is created when no qualifying change is found.
