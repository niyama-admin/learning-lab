# Interactive Application Architecture Blueprint

## Purpose

The blueprint makes a generic application architecture explorable. Select scale, reliability, and latency profiles, then choose a component to see which technology patterns remain eligible. A component is greyed out when every option fails at least one selected threshold; it remains clickable so the rejection reasons can be inspected.

Live site: [https://niyama-admin.github.io/consulting/architecture-blueprint/](https://niyama-admin.github.io/consulting/architecture-blueprint/).

## Run locally

From the repository root:

```powershell
python -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/common/architecture-evolution/blueprint/
```

Validate the seed catalog:

```powershell
node common/architecture-evolution/blueprint/validate-catalog.mjs
```

## Current model

The seed catalog covers:

- Experience channels.
- Edge, API access, and identity.
- Application services, workflows, and integrations.
- LLM orchestration, RAG, and memory.
- Operational, cache, and analytical data.
- Compute abstraction, hosting responsibility, and scaling control.
- Observability and delivery platform capabilities.

Each option declares the maximum profile band it is assumed to support. The UI applies the selected profiles as hard gates and explains every rejection.

## Important limitation

The current values are illustrative priors, not validated product claims or procurement advice. Replace them with customer-specific evidence records following the [decision method](../decision-method.md). A production version should load a versioned catalog with sources, observation dates, confidence, costs, lifecycle state, exceptions, and customer allowlists.
