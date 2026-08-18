# Analytics

## Outcome

Turn operational data into governed measures, explanations, forecasts, and decisions without weakening production systems or creating conflicting versions of truth.

## Scope

- Business questions, decisions, KPIs, dimensions, and reporting obligations.
- Source-system inventory, data contracts, quality, lineage, and ownership.
- Operational reporting, warehouse, lakehouse, and hybrid architecture choices.
- Batch, incremental, streaming, and change-data-capture ingestion patterns.
- Semantic models, SQL access, dashboards, scheduled reports, and controlled exports.
- Advanced analytics and the data foundations required for AI and ML.

## Core deliverables

- Decision and KPI catalogue with owners and calculation rules.
- Source-to-metric lineage and data-quality controls.
- Target data architecture and phased evolution plan.
- Dimensional or domain data models and semantic layer.
- Dashboard portfolio with audiences, refresh targets, and access controls.
- Operating model for data ownership, incident handling, and change management.

## Scale and architecture principle

Use the simplest architecture that meets reliability, history, governance, latency, and workload requirements. Separate analytics from production when reporting creates operational risk. Adopt lakehouse capabilities when sustained volume, streaming, multiformat data, or advanced analytics justifies their additional platform cost.

## Measures

- Data freshness and pipeline success rate.
- Percentage of certified metrics with named owners and lineage.
- Data-quality incidents, reconciliation differences, and time to resolution.
- Dashboard adoption, query performance, and decision-cycle time.
- Platform cost per workload or data volume.

## Guardrails

- Do not expose production databases directly to uncontrolled analytical workloads.
- Apply least-privilege access, masking, retention, and audit controls throughout the data path.
- Publish KPI definitions alongside dashboards and APIs.
- Reconcile curated analytical data to authoritative source systems.
- Treat architecture scale thresholds as planning heuristics, not universal limits.

## Arghyam reference material

- [Data architecture options and scale thresholds](../../../2026/2026-08-Arghyam-1/docs/data-architecture-options.md)
- [AI in business operations and the application landscape](../../../2026/2026-08-Arghyam-1/docs/ai-in-business-operations-and-application-landscape.md)
