# Agentic Engineering

## Outcome

Enable teams to use coding and delivery agents to accelerate software work while preserving human accountability, traceability, security, and production reliability.

## Scope

- Repository and instruction design for effective agent participation.
- Requirement-to-design-to-task-to-change traceability.
- Task decomposition, implementation, testing, review, and documentation workflows.
- Human approval boundaries for security, architecture, data, deployment, and destructive actions.
- Brown-field adoption in repositories with incomplete tests or documentation.
- Evaluation of quality, throughput, review burden, defects, and operational impact.

## Core deliverables

- Current-state readiness assessment and prioritized adoption roadmap.
- Repository instruction hierarchy and durable system context.
- Standard requirement, design, task, and architectural-decision templates.
- Agent-assisted delivery workflow with explicit human gates.
- Automated quality, security, test, and policy checks.
- Pilot backlog, measurement baseline, and scale-up criteria.

## Measures

- Lead time from accepted requirement to production.
- Review time and percentage of changes requiring substantial rework.
- Escaped defects, rollback rate, and security findings.
- Test coverage of changed behavior and traceability completeness.
- Developer time saved without a reduction in quality or accountability.

## Guardrails

- Do not grant agents broader access than the task requires.
- Never place secrets, personal data, or restricted customer data in unapproved models or tools.
- Require human ownership for requirements, material design decisions, reviews, and production changes.
- Treat generated code as untrusted until it passes the same checks as human-written code.
- Prefer small, reversible changes with observable outcomes.

## Arghyam reference material

- [Agentic engineering workflow](https://github.com/niyama-admin/consulting/blob/main/2026/2026-08-Arghyam-1/docs/agentic-engineering-workflow.md)
- [Brown-field adoption](https://github.com/niyama-admin/consulting/blob/main/2026/2026-08-Arghyam-1/docs/brown-field-agentic-engineering.md)
- [Prerequisites, metrics, and risks](https://github.com/niyama-admin/consulting/blob/main/2026/2026-08-Arghyam-1/docs/prerequisites-metrics-risks.md)
- [Reference repository](https://github.com/niyama-admin/consulting/blob/main/2026/2026-08-Arghyam-1/examples/agentic-engineering-reference/README.md)
