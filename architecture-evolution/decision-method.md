# Evidence-Driven Architecture Decision Method

## 1. Define the decision charter

State the decision to be made, its owner, affected stakeholders, deadline, scope, expected lifetime, and reversibility.

Record:

- The business outcome and decisions the architecture must enable.
- The architectural component or boundary under consideration.
- Existing constraints, dependencies, commitments, and migration limits.
- Whether the decision is easy, costly, or practically impossible to reverse.
- Who recommends, approves, implements, operates, and reviews the decision.

## 2. Describe measurable quality-attribute scenarios

Avoid labels such as “high scale” or “low latency” without workload context. Use a scenario with six fields:

| Field | Question | Example |
|---|---|---|
| Source | What produces the stimulus? | Authenticated users in three regions |
| Stimulus | What happens? | Submit and retrieve a case during the daily peak |
| Environment | Under what conditions? | One availability zone unavailable |
| Artifact | Which component is affected? | Public API and operational database |
| Response | What must the system do? | Accept writes without data loss and return reads |
| Measure | How is success measured? | 99.9% monthly availability and p95 under 500 ms at 1,000 requests/second |

Define at least the normal, peak, degraded, recovery, growth, and change scenarios relevant to the decision.

## 3. Establish architecture profiles

Create a small number of named profiles that express real operating conditions. The seed blueprint uses three bands for each of scale, reliability, and latency; customer profiles should replace these illustrative values.

| Dimension | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Scale | Pilot: below 100 requests/second and 10,000 active users | Regional: 100–5,000 requests/second or up to 1 million active users | National/global: above 5,000 requests/second or 1 million active users |
| Reliability | Standard: 99.5% target, restore in hours | High: 99.9% target, zonal resilience, restore in under one hour | Mission-critical: 99.99% target, automated failover, tightly bounded recovery and data loss |
| Latency | Relaxed: responses may exceed one second | Interactive: p95 between 200 ms and one second | Low: p95 below 200 ms for the measured operation |

Profiles are not universal limits. Apply them to a specified operation, percentile, time window, traffic distribution, data volume, and failure mode.

## 4. Build the candidate and constraint model

For each application component, list viable patterns and technologies. Evaluate them against:

- Functional fit and integration compatibility.
- Data classification, residency, retention, and regulatory requirements.
- Measured or contractually supported scale, reliability, latency, and recovery.
- Security controls and identity model.
- Delivery skills, operational burden, support model, and organizational fit.
- Total cost across build, migration, operation, support, and exit.
- Portability, interoperability, lock-in, and migration path.

Classify every criterion as either:

- **Hard gate**: failure eliminates the option unless an accountable authority approves an explicit exception.
- **Trade-off**: contributes to comparative value after all gates pass.

## 5. Maintain an evidence register

Each material option claim should use a record such as:

```yaml
claim: Managed relational option sustains the peak write workload
component: operational-store
candidate: managed-relational
scenario: regional-peak-write
observed_value: 3200 writes_per_second
required_value: 2500 writes_per_second
method: production-shaped load test
environment: two-zone staging, dataset 500 GB
source: benchmark run BR-042
observed_at: 2026-08-18
owner: platform-team
confidence: high
valid_until: 2027-02-18
```

Use confidence levels consistently:

- **High**: independently reproduced production evidence, a binding service commitment, or a representative controlled test.
- **Medium**: relevant vendor evidence, a partial test, or comparable internal production experience.
- **Low**: expert judgment, an unverified claim, or evidence from a materially different workload.

Low-confidence evidence can support an experiment; it should not silently support a high-consequence irreversible decision.

## 6. Apply gates, then score trade-offs

First eliminate candidates that fail any hard gate. Never allow a high preference score to compensate for a failed security, compliance, reliability, compatibility, or performance minimum.

For eligible option `o`, calculate a transparent weighted utility:

```text
utility(o) = sum(weight(c) × normalized_score(o,c) × confidence(o,c)) - transition_cost(o) - risk_penalty(o)
```

Recommended conventions:

- Weights across trade-off criteria sum to 1.0.
- Normalized scores use one documented direction and range, such as 0–100 where higher is better.
- Confidence factors are agreed before scoring, for example high `1.0`, medium `0.75`, and low `0.5`.
- Transition cost and risk penalties use the same normalized scale and show their underlying evidence.
- Publish raw observations alongside normalized scores so reviewers can challenge assumptions.

## 7. Test sensitivity and combinations

Architecture components interact. The individually highest-scoring technologies may form a poor system.

Evaluate:

- Whether the result changes under credible alternative weights.
- End-to-end latency and availability budgets across dependent components.
- Failure correlation and shared dependencies.
- Skills, deployment, observability, identity, and data-flow compatibility.
- Migration sequence, coexistence period, rollback, and exit cost.
- Cost under normal, peak, and failure conditions.

If small weight changes reverse the ranking, treat the decision as sensitive: gather better evidence, prefer the more reversible option, or run a time-boxed experiment.

## 8. Decide and define evolution triggers

Capture the result in an architecture decision record containing:

- Decision and status.
- Scenarios, gates, weights, evidence snapshot, and confidence.
- Selected and rejected options with reasons.
- Consequences, risks, assumptions, and required controls.
- Migration, rollback, and exit approach.
- Decision owner, approval, review date, and evidence expiry.
- Observable triggers that reopen the decision.

Useful evolution triggers include:

- A sustained SLO breach or error-budget exhaustion.
- p95 or p99 latency crossing its budget for a defined number of periods.
- Volume, concurrency, data size, or geographic reach crossing a measured threshold.
- Recovery time or recovery point objectives not being met in exercises or incidents.
- Unit cost increasing beyond an agreed band.
- A security, residency, regulatory, licensing, support, or end-of-life change.
- Delivery lead time or operational toil exceeding its target.
- Evidence expiring or a core assumption becoming false.

## 9. Operate the decision as a feedback loop

Connect each scenario and trigger to telemetry, ownership, and a review cadence. A decision remains valid only while its assumptions and evidence remain valid.

Use three review modes:

- **Continuous**: automated SLOs, error budgets, cost, capacity, security, and dependency health.
- **Triggered**: an agreed threshold, incident, policy change, or new workload opens a review.
- **Scheduled**: review expensive or long-lived decisions even when no trigger fires.

## Minimum decision dataset

The interactive blueprint should eventually load a versioned dataset with these entities:

| Entity | Required fields |
|---|---|
| Component | ID, layer, responsibilities, interfaces, owner |
| Candidate | ID, component, pattern, technologies, lifecycle state |
| Scenario | Source, stimulus, environment, artifact, response, measure |
| Criterion | ID, type (`gate` or `trade-off`), unit, direction, threshold or weight |
| Observation | Candidate, scenario, value, environment, method, source, date |
| Evidence | Provenance, owner, confidence, validity period |
| Decision | Selected option, rejected options, rationale, approver, date |
| Trigger | Metric, threshold, duration, owner, resulting review action |

## Governance rule

The tool supports a decision; it does not own the decision. Accountable people approve architecture choices and exceptions, and the underlying evidence remains inspectable and challengeable.
