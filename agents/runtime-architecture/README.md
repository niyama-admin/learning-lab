# Reference architecture for an agentic runtime, and where its data lives

What the runtime looks like as a system: a processing pipeline, connectors to external APIs and data sources, and the stores that hold conversation state, history, memory and artifacts. It extends the [language treatise](../languages/README.md) (which picks the implementation language) and the [framework comparison](../frameworks/README.md) with the part they leave out: **the data design**.

Status: written 2026-11-19. **Diagrams here are plain text on purpose.** GitHub Mobile shows Mermaid diagrams as raw source (confirmed by [a reported GitHub issue](https://www.github.com/github/markup/issues/1771); no official fix found), so everything in this document renders everywhere. The SQL in Section 5 was executed on SQLite 3.51.0; the Postgres and document-store statements are descriptions, not tested.

## 1. The picture

```
                  users, UIs, schedulers, other agents
                                  |
                                  v
  +--------------------------------------------------------------+
  | INGRESS         authenticate, resolve tenant, rate limit      |
  +--------------------------------------------------------------+
                                  |
                                  v
  +--------------------------------------------------------------+
  | SESSION MANAGER   one writer per session; cancel; resume;     |
  |                   fork or rewind                              |
  +--------------------------------------------------------------+
        |  load history / append events                 ^
        v                                               |
  +-------------+     +----------------------------------------+
  | STATE STORE |<--->| TURN PIPELINE (the loop)                |
  | event log   |     |  1 assemble context                     |
  | snapshots   |     |  2 call the model (stream)              |
  +-------------+     |  3 parse tool requests                  |
                      |  4 permission gate                      |
  +-------------+     |  5 execute tool or connector            |
  | MEMORY and  |<----|  6 record the result; loop or finish    |
  | KNOWLEDGE   |     +----------------------------------------+
  | (retrieval) |            |            |              |
  +-------------+            v            v              v
                      +-----------+ +------------+ +--------------+
                      | MODEL     | | TOOLS and  | | SANDBOX      |
                      | GATEWAY   | | CONNECTORS | | commands and |
                      | providers | | MCP, APIs  | | generated    |
                      +-----------+ +------------+ | code         |
                                          |        +--------------+
                                          v
                              external systems and data sources

  Cross-cutting: policy and config | observability (traces, cost)
                 secrets | queue or scheduler for background work
```

The shape is not invented. The Harness Engineering study finds that every studied system takes a position on seven subsystems: loop, model integration, tools, memory and context, safety, orchestration, extensibility ([guide](../../llm-learning-repository/tutorials/06-agent-systems/29-harness-engineering.md)). The Dive into Claude Code analysis describes the same pipeline for one product: context assembly, model call, permission gate, tool execution, result, persistence ([guide](../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md)). Both papers are third-party preprints; see their guides for limits.

## 2. One turn through the pipeline

```
 user message
     |
 [1] Session manager   take the session's write lease; read the last
     |                 snapshot and the events after it
 [2] Context assembly  instructions + history view + retrieved knowledge
     |                 + tool list (compaction happens here, as a read)
 [3] Model gateway     stream tokens; assemble partial tool calls
     |
 [4] Parse             text only?  --> record, reply, release the lease
     |                 tool calls? --> continue
 [5] Permission gate   rules, modes, hooks, approval; denied calls still
     |                 produce a result for the model
 [6] Execute           read-only calls in parallel, writers in turn;
     |                 sandbox for commands; connectors for APIs
 [7] Record            append: tool_call, permission, tool_result
     |                 (large outputs stored as artifacts, referenced)
 [8] Loop to [2], or stop on: no tool calls / budget / interrupt
```

| Step | Reads | Writes |
|---|---|---|
| 1 | session row, latest snapshot, events after it | write lease |
| 2 | event log (as a view), knowledge store, instructions | nothing |
| 3 | nothing | usage and cost counters |
| 5 | policy and rules | a `permission` event |
| 6 | external systems | artifacts (large outputs) |
| 7 | nothing | `tool_call`, `tool_result` events; periodic snapshot |

The eight conformance invariants in the [language treatise](../languages/README.md#8-a-language-neutral-reference-specification) (a result for every call, a denied call never runs, replay reproduces state, and so on) are the properties this pipeline and the event log in Section 5 are designed to give you.

## 3. Components and what each owns

| Component | Job | Notes from the evidence |
|---|---|---|
| Ingress | Authenticate, resolve tenant and user, rate limit, accept cancel | Identity decides which connectors and data a session may touch |
| Session manager | Single writer per session; resume, fork, rewind | Claude Code's `--resume` rebuilds the conversation but **not** permission grants (Dive guide): grants are a decision, not data to restore |
| Turn pipeline | The loop in Section 2 | About a hundred lines; most of the code is around it |
| Context assembler | Build the model input; compaction; retrieval | Compaction is best a **read-time view** over an unchanged log (Section 5) |
| Model gateway | Provider adapters, streaming, retries, model routing, cost metering | Keep it behind an interface; provider APIs and model names change (the weekly job's four built-in model names all returned 404 on 2026-11-19) |
| Permission gate | Allow, deny, ask; log every decision | Deny-first with pre-filtering of the tool list is the cheapest pattern the Dive guide recommends adopting |
| Tools and connectors | MCP clients, API connectors, internal functions | Section 6 |
| Sandbox | Run commands or generated code with limits | No profiled framework supplies one except by embedding a product (frameworks README) |
| State store | Event log, snapshots, session metadata | Section 5 |
| Memory and knowledge | Long-term notes, documents, retrieval | Section 4 and 5 |
| Observability | Traces, token and cost accounting, audit | OpenTelemetry is supported by several profiled frameworks |

## 4. What data exists

Eight kinds of data, with the properties that drive the storage choice. Treat "the database" as eight decisions, not one.

| # | Data | Access pattern | Size and rate | Needs |
|---|---|---|---|---|
| 1 | **Event log** (conversation history: messages, tool calls, results, permission decisions) | Append at the tail; read in order; replay | Small records, many per turn | Ordered per session, atomic append, no lost writes, retention and erasure |
| 2 | **Session state and snapshots** (derived: current view, checkpoints, compaction markers) | Read at turn start; rewritten rarely | Small | Fast read; reproducible from 1 |
| 3 | **Memory and knowledge** (notes, documents, embeddings, summaries) | Search by meaning and by keyword; read-heavy | Large | Permission trimming, freshness, provenance |
| 4 | **Artifacts** (large tool outputs, files, exports) | Write once, read by reference | Large blobs | Cheap storage; referenced from events so events stay small |
| 5 | **Audit and telemetry** | Append; query during investigations | High volume | Immutable, retained, often a separate system |
| 6 | **Coordination** (leases, idempotency keys, rate limits, caches) | Very hot, short-lived | Tiny | TTL, atomic compare-and-set |
| 7 | **Business data sources** (systems of record) | Queried by tools; not owned by the runtime | Whatever they are | The source's own permissions, residency and freshness |
| 8 | **Policy and configuration** | Read often; versioned | Tiny | Review trail, rollback |

## 5. Choosing the stores

### 5.1 The premise to challenge: it does not have to be a NoSQL store

A conversation is an **append-only, ordered sequence per session**. That fits a document database, and it fits a relational table with a composite key just as well. The deciding questions are not "document or relational" but: how many writes per second across all sessions, whether you need transactions across more than one record, whether you need to query across sessions (audit, analytics), and what you already know how to operate. The evidence from real systems leans toward **boring and embedded or relational**:

- Claude Code keeps an append-only JSONL transcript per session, and "append-only durable state" is one of its thirteen design principles ([Dive guide](../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md)).
- The frameworks we installed chose SQL stores for sessions and checkpoints: LangGraph (SQLite checkpointer ran; Postgres saver documented), Mastra (libSQL, ran), Google ADK (a SQLite-backed session service, ran), Spring AI (JDBC chat memory, documented) ([profiles](../frameworks/profiles/)).
- **No framework requires a document database, but several offer one.** Google ADK lists MongoDB and Firestore session services, Microsoft Agent Framework has Cosmos DB and Redis packages, the OpenAI Agents SDK has MongoDB and Redis sessions, and Spring AI's chat memory supports Cassandra, Neo4j, MongoDB and Redis alongside JDBC ([profiles](../frameworks/profiles/)). Document and key-value stores are an ordinary, supported option; SQL and embedded stores are the **defaults** in what we ran.

That is evidence about defaults and availability, not about scale limits. It does not show where a relational store stops being enough.

### 5.2 Store the history as an event log; derive everything else

One table of events per session, never updated, with a sequence number that doubles as the concurrency token. Executed on SQLite 3.51.0:

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
  parent_session TEXT, forked_at_seq INTEGER     -- fork or rewind: new session sharing history to a seq
);
CREATE TABLE events (
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  seq        INTEGER NOT NULL,                   -- gapless per session; the optimistic-concurrency token
  ts         TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('user','assistant','tool_call','tool_result','permission','summary','checkpoint')),
  payload    TEXT NOT NULL CHECK (json_valid(payload)),
  idem_key   TEXT,                               -- tool-call idempotency key (at-least-once delivery)
  PRIMARY KEY (session_id, seq)
) WITHOUT ROWID;
CREATE UNIQUE INDEX events_idem ON events(session_id, idem_key) WHERE idem_key IS NOT NULL;
```

What running it showed:

| Property | What happened |
|---|---|
| Replay | `SELECT ... WHERE session_id = 's1' ORDER BY seq` returned the six events in order |
| One writer per session | Two writers both appending `seq = 7`: the second failed with `UNIQUE constraint failed: events.session_id, events.seq` (the loser re-reads and retries) |
| At-least-once tools | Re-delivering tool call `call-1` failed on `events_idem`; the tool is not run twice |
| Compaction as a view | After a `summary` event covering seq 1 to 5, the read returned `[summary, seq 6, seq 7]` and **8 rows were still stored** for audit and rewind |
| Fork or rewind | A second session with `forked_at_seq = 4` returned events 1 to 4 from the parent plus its own seq 5 |
| Audit across sessions | `GROUP BY json_extract(payload,'$.decision')` over `permission` events worked in one query |

Properties to preserve on **any** store, relational or not: ordered per session, atomic conditional append (the seq or version check), a unique idempotency key per tool call, and snapshots as an optimisation rather than the source of truth. A document store can do the same: on DynamoDB, for example, the partition key would be the session and the sort key the sequence with a conditional write. That mapping is an inference from how the service works and was not tested here.

### 5.3 Candidates, and where each one fits

| Store | Good for | Costs | Evidence here |
|---|---|---|---|
| **JSONL file per session** | Local agents; human-readable, trivially portable | One writer; no cross-session query; erasure and retention by hand | Claude Code's transcript |
| **SQLite or libSQL** | Local and single-node; ACID; JSON functions | One writer at a time; network access is awkward | Ran in LangGraph, ADK, Mastra; SQL above |
| **Postgres** (JSONB; full-text search; vector extension) | Server default: transactions across events and an outbox, constraints, SQL audit, row-level tenant isolation, one system for history, state and first-cut memory | Write scale of one primary; you operate it | LangGraph Postgres saver and Spring AI JDBC memory are documented, not run |
| **Document database** (MongoDB, DynamoDB, Firestore, Cosmos DB and similar) | Horizontal write scale, managed multi-region, flexible schema | Cross-session queries need indexes or an export; weaker multi-record transactions; design the ordered append deliberately | Offered as a backend by ADK, Microsoft Agent Framework, the OpenAI Agents SDK and Spring AI; none requires one; not evaluated or run here |
| **Key-value store** (Redis and similar) | Leases, idempotency, rate limits, caches | Not a system of record unless persistence is configured | General knowledge |
| **Log or stream** (Kafka and similar) | Fan-out of events to analytics and audit consumers | Not for interactive reads | General knowledge |
| **Object store** | Artifacts and large tool outputs | No queries | Claude Code replaces oversized tool output with a reference (Dive guide) |
| **Vector index** (an extension of the main store, or a dedicated database) | Memory and knowledge retrieval | Another system if dedicated; keep permissions in sync | See the [RAG guide](../../llm-learning-repository/tutorials/02-building/06-rag.md) |

### 5.4 Defaults by deployment shape

Shapes are those of the [selection method](../../architecture-evolution/language-and-framework-selection.md#21-deployment-shape-the-replacement-for-the-capacity-profile). Defaults, to be tested in a spike, not decisions.

| Shape | History and state | Memory and knowledge | Artifacts | Coordination |
|---|---|---|---|---|
| A. Local agent | SQLite file, or JSONL if human-editable transcripts matter | Files plus SQLite full-text search | Files | In-process |
| B. Server gateway | Postgres (events, sessions, snapshots, idempotency) | Postgres with a vector extension first; split out only on evidence | Object store | Postgres advisory locks or a small key-value store for leases |
| C. Embedded in a product | The product's existing database, using the same event-table design | The product's search or existing vector facility | The product's file store | The product's cache |
| D. Research or open-model tuning | SQLite or DuckDB plus files | Files and local indexes | Files | None |
| E. Edge or offline | SQLite | SQLite full-text search | Files | None |

**When a document database earns its place** (reopen the choice on these, using the base method's evolution triggers): your measured sustained append rate exceeds what a single Postgres primary handles with batching; you need active-active multi-region writes; your organisation's operational standard is a managed document store you already run well; or event payloads vary so much that a schema is a constant cost. Measure first: the stub server and the specification make a write-load test cheap.

### 5.5 Questions to settle per data kind, using the base method

Write these as quality scenarios in the [decision method](../../architecture-evolution/decision-method.md) format and test each candidate against them. They are the ones that bite:

| Scenario | Measure |
|---|---|
| Append a message while another process resumes the same session | No lost or duplicated events; loser retries cleanly |
| Resume after a crash mid-tool | Replay reproduces state; the tool is not run twice |
| Load the last N turns for a session with 100,000 events | p95 under your turn-start budget |
| Erase one user's data | Complete across events, artifacts, memory and backups, with proof |
| Query "every denied permission for tenant X last month" | One query, not an export job |
| Tenant isolation | A bug in the runtime cannot read another tenant's events (enforce in the store, not only in code) |

## 6. Connectors and data sources

**Connectors** are how the pipeline reaches external systems. In practice that means MCP clients (the MCP SDK is Tier 1 in five of the six languages in the treatise; Java is Tier 2) plus direct API clients. Rules that follow from the pipeline:

- **Every connector call goes through the permission gate** and produces a logged result, including a denial.
- **Timeouts, retries with idempotency keys, and a size cap on results.** Large results become artifacts referenced from the event, not inlined.
- **Credentials belong to the connector, not the model.** The model never sees secrets; the gate chooses which connector identity a call uses.
- **Egress policy.** A connector that can reach the network is an exfiltration path; allow-list destinations per tool.

Tenant isolation (pool, schema, database or infrastructure per tenant, the standards, transcripts and caches under tenancy) is in the [tenant-isolation pattern](../tenant-isolation/README.md).

How the runtime calls tools and peer agents (MCP, A2A), and the identity, authorization and gateway layers around them, is in the [connectivity pattern](../connectivity/README.md).

For analytics and warehouse questions specifically (NL2SQL and its alternatives), see the [data-access pattern](../data-access/README.md).

**Business data sources** (kind 7) are the choice you asked to include. There are three ways to use one, and the right one depends on the source:

| Approach | Use when | Cost |
|---|---|---|
| **Query in place** through a tool (live) | Data changes often; the source has a faithful permission model; volumes per query are small | Latency and load on the source; every call is an API call; the model sees only what the tool returns |
| **Index into the knowledge store** (copy) | Read-heavy, large corpora; you need semantic search; the source cannot serve ad-hoc queries | Staleness; a second copy of sensitive data with its own permission model to keep in sync; residency and erasure duties follow the copy |
| **Hybrid**: index for discovery, fetch the live record on use | The usual best answer for documents | Two paths to build and test |

Decide per source with: **freshness required, volume, latency budget, fidelity of the source's permission model, residency, and change rate.** Whatever the approach, **retrieved content is untrusted input**: documents can carry instructions aimed at the model. The Dive guide notes that one studied system (Hermes) scans context files for injection patterns, which is the kind of control a document assistant needs and that Claude Code's design does not centre on ([Dive guide](../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md)).

## 7. How the shapes differ

```
 A. LOCAL AGENT                          B. SERVER GATEWAY
 user -> process -> model API            clients -> ingress -> workers
         |    |                                      |           |
         |    +-> sandbox (OS)                  Postgres     object store
         +-> SQLite or JSONL                     (events)     (artifacts)
                                                  |
                                          queue -> background tasks
 One user, one machine, one writer.      Many sessions; one writer per
 Permission prompts are interactive.     session via the seq check; the
                                         gate is policy, not a prompt.

 C. EMBEDDED IN A PRODUCT                E. EDGE OR OFFLINE
 product service -> runtime library      device -> runtime -> local model
         |                                        |
 product database + product identity      SQLite + local files
 Reuse operations; keep the loop and      No network assumptions; footprint
 the permission gate yours.               dominates.
```

## 8. Where the frameworks fit

| Box | What the profiled frameworks supply | What you build |
|---|---|---|
| Turn pipeline | All of them have a loop; LangGraph, Mastra and Microsoft Agent Framework add graph or workflow engines | The loop and its invariants, if the runtime is your product |
| State store | LangGraph checkpointers, ADK session service, Mastra storage, OpenAI SDK sessions, Spring AI and LangChain4j chat memory | The event-log schema, concurrency, retention and erasure |
| Memory and knowledge | LlamaIndex (the strongest), Mastra memory, LangChain retrievers | Permission trimming and freshness |
| Model gateway | Every framework has provider adapters; the Vercel AI SDK is mostly this | Routing, cost caps, discovery of current models |
| Permission gate and sandbox | Almost none (Claude Agent SDK by embedding Claude Code) | Both |
| Connectors | Every framework has an MCP client | Egress policy, credential isolation |

This is the same finding as the [framework comparison](../frameworks/README.md#3-what-the-frameworks-give-you-and-what-nobody-does): the frameworks help least where the architecture is heaviest.

## 9. What this does and does not establish

- It is a **synthesis** of what two third-party source-code studies, sixteen framework profiles and an executed SQLite experiment support. It was not validated by building and running a full runtime.
- The SQL was run on SQLite only. The Postgres, document-store and key-value rows are reasoned from how those systems work and from framework documentation; none was benchmarked.
- **No scale numbers** are given, deliberately: the evidence does not contain any for conversation stores, and inventing thresholds would mislead. Section 5.5 lists the measurements that would produce them.
- The "defaults by shape" are hypotheses to test in a spike, consistent with the [selection method](../../architecture-evolution/language-and-framework-selection.md).
- Open question the evidence does not answer: how much of the knowledge store should be a separate vector database. Start inside the primary store and split on measured need.

## Related

- [Language treatise](../languages/README.md): the reference loop, conformance invariants and the bake-off specification
- [Framework comparison](../frameworks/README.md) and [selection method](../../architecture-evolution/language-and-framework-selection.md)
- [Dive into Claude Code](../../llm-learning-repository/tutorials/06-agent-systems/28-dive-into-claude-code.md), [Harness Engineering](../../llm-learning-repository/tutorials/06-agent-systems/29-harness-engineering.md), [RAG](../../llm-learning-repository/tutorials/02-building/06-rag.md)
