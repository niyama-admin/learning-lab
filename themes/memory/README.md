# Memory

## Outcome

Preserve useful continuity across interactions without turning transient model context into an uncontrolled or inaccurate system of record.

## Scope

- Working, conversation, user, organizational, and workflow memory.
- Explicitly supplied facts, inferred preferences, summaries, commitments, and task state.
- Read and write policies, confidence, provenance, correction, expiration, and deletion.
- User consent, transparency, access control, tenant isolation, and data residency.
- Retrieval, ranking, conflict resolution, consolidation, and memory-quality evaluation.

## Memory taxonomy

| Memory type | Typical lifetime | Example | Default treatment |
|---|---|---|---|
| Working memory | One model or workflow execution | Intermediate plan or tool result | Discard after execution unless audit rules require a trace |
| Conversation memory | One session or case | Prior turns and unresolved questions | Retain for the session or case lifecycle |
| User memory | Across sessions | User-stated language or notification preference | Store only with a clear purpose and correction path |
| Workflow memory | Until process completion | Approval state or pending action | Keep in the authoritative workflow system |
| Organizational memory | Long-lived | Approved policy or reusable decision | Govern as knowledge; do not rely on model recollection |

## Core deliverables

- Memory taxonomy and purpose register.
- Read/write decision policy for each memory type.
- Data model with subject, scope, provenance, confidence, timestamps, and expiry.
- Consent, disclosure, correction, export, retention, and deletion experience.
- Consolidation and contradiction-handling rules.
- Evaluation suite for relevance, accuracy, leakage, staleness, and user control.

## Measures

- Memory retrieval usefulness and precision.
- Stale, contradictory, or incorrect memory rate.
- User correction, deletion, and opt-out rates.
- Cross-user or cross-tenant leakage incidents.
- Storage, retrieval latency, and token-cost impact.

## Guardrails

- Keep authoritative transactions, permissions, approvals, and case state in systems of record.
- Store the minimum information required for a declared purpose and retention period.
- Distinguish user-stated facts from model inferences and label confidence accordingly.
- Let authorized users inspect, correct, and delete persistent personal memory.
- Never allow memory retrieval to bypass current authorization or tenant boundaries.

## Arghyam reference material

- [AI system architecture](../../../2026/2026-08-Arghyam-1/docs/ai-system-architecture.md)
- [Prototype top-level agent](../../../2026/2026-08-Arghyam-1/prototype/src/top-agent.mjs)
