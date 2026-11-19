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

The paths above are for the consulting repository. In the learning-lab repository the same files are at `architecture-evolution/blueprint/`.

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
- Agent runtime: loop ownership, session execution model, isolation for commands and generated code, conversation history and state, access to business data sources, and implementation language.
- Operational, cache, and analytical data.
- Compute abstraction, hosting responsibility, and scaling control.
- Observability and delivery platform capabilities.

Each option declares the maximum profile band it is assumed to support. The UI applies the selected profiles as hard gates and explains every rejection.

## Agent runtime layer

The "Agent runtime" layer sits between the AI capabilities and the data layers. It encodes what was learned comparing implementation languages, agent frameworks, and data stores for an agentic runtime. The bands are illustrative priors like every other value here; the notes carry the evidence. Sources, all in the public [learning-lab](https://github.com/niyama-admin/learning-lab) repository:

- [Reference architecture and data design](https://github.com/niyama-admin/learning-lab/blob/main/agents/runtime-architecture/README.md): the pipeline, eight kinds of data, and the choice of store for each.
- [Implementation languages](https://github.com/niyama-admin/learning-lab/blob/main/agents/languages/README.md): six languages compared, including Node's concurrency model against Python's global interpreter lock.
- [Agent frameworks](https://github.com/niyama-admin/learning-lab/blob/main/agents/frameworks/README.md): sixteen profiles for implementers.
- [Language and framework selection method](https://github.com/niyama-admin/learning-lab/blob/main/architecture-evolution/language-and-framework-selection.md): this decision method applied to the choice, with defaults by deployment shape.

How to read the components:

- **Agent loop, session execution model, isolation, conversation state, data access.** The three bands separate these options, so filtering works. At the strictest profile the session execution model and the isolation component grey out: no single option is best on every axis, which is the point. Combine them (for example one process per session plus a container).
- **Implementation language.** The bands do **not** separate languages, because an agent loop spends nearly all its time waiting on the model, a tool, or a person. Every option passes at every band by design. Decide by deployment shape, official SDKs, protocol SDK tier, packaging, sandboxing, and team, using the selection method above. Node has no global lock but runs JavaScript on one thread per process, which the session execution model component captures.
- **What this cannot say.** No benchmark of language suitability for an agent runtime exists, and none was run. The values are reasoned from documentation, framework profiles that were installed and run against a scripted stub model, and two third-party source-code studies of coding agents. Replace them with measurements from your own spike.

## Important limitation

The current values are illustrative priors, not validated product claims or procurement advice. Replace them with customer-specific evidence records following the [decision method](../decision-method.md). A production version should load a versioned catalog with sources, observation dates, confidence, costs, lifecycle state, exceptions, and customer allowlists.

## Where this copy is published

This repository holds a copy of the blueprint. The live site is built from the **consulting** repository by its own workflow, which publishes `common/architecture-evolution/blueprint/**` when a change reaches that repository's `main` branch. Changing the files here does not update the live site; the same files must be copied to the consulting repository. The two copies were identical before the agent runtime layer was added, so check for drift before copying.

