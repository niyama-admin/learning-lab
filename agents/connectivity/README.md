# Connecting an agent runtime: MCP tools, A2A agents, authorization and gateways

A design pattern for how an agent runtime calls **tools** (through the Model Context Protocol, MCP) and **other agents** (through Agent2Agent, A2A), and how identity, authorization and access gateways govern those calls. It extends the [runtime reference architecture](../runtime-architecture/README.md), where connectors and permission decisions first appear, and it feeds the **Agent connectivity** stage of the [paper curriculum](../../llm-learning-repository/tutorials/08-agent-connectivity/README.md).

Evidence labels: **(spec)** normative text of a specification, read 2026-11-19; **(doc)** vendor documentation, read 2026-11-19; **(draft)** an IETF Internet-Draft, not final; **(paper)** an arXiv abstract or guide; **(inference)** this document's reasoning. Sources are in [specs-evidence.md](specs-evidence.md) and [arxiv-evidence.md](arxiv-evidence.md). Diagrams are plain text so they render on GitHub Mobile.

## 1. The answer first

1. **Use MCP for tools and A2A for peer agents, and use both.** The A2A documentation says MCP is vertical (an agent to its tools and resources) and A2A is horizontal (agents to each other) (doc). Gateways treat them as separate traffic classes (doc).
2. **Build to MCP revision 2026-07-28, which is stateless.** It removes the `initialize` handshake and `Mcp-Session-Id`, sends the protocol version and capabilities on every request, makes `server/discover` mandatory, moves long-running work to an official Tasks extension, and removes SSE resumption (spec). A runtime that assumes sessions will break against servers on the new revision, and some gateway documentation still describes sessions, so negotiate the version per request.
3. **MCP authorization is an OAuth profile you can implement from RFCs.** The MCP server is an OAuth resource server; discovery is by RFC 9728 protected resource metadata; the client sends an RFC 8707 `resource` parameter on every authorization and token request; the server must check the token was issued **for it** (audience) and must never accept or pass on tokens meant for another service (spec). Token passthrough is explicitly forbidden.
4. **A2A does not carry the end user's identity.** The A2A documentation says message payloads carry no user or client identity and identity is handled at the HTTP layer; credentials are obtained out of band; it defines no field or token format for delegation across agents (spec and doc). Cross-agent delegation is therefore your design: today the stable building block is OAuth token exchange (RFC 8693) with an `actor` claim; everything agent-specific on top is a draft or a vendor feature in preview.
5. **Put an access gateway in front, but do not treat it as the whole answer.** Products converge on the same features (inbound authentication, tool allowlists, rate limits, audit, outbound credential injection) and differ on A2A, on MCP revision support, and on stated gaps. One documented gap is a bypass: Databricks workspace MCP endpoints do not pass through Unity Gateway governance (doc).
6. **Measured reality is worse than the specification.** A 2026 measurement of 7,973 live remote MCP servers found 40.55% exposing tools without authentication, and every one of the 119 OAuth servers it could test had at least one flaw, with dynamic client registration flaws in 96.6% (paper abstract, arXiv 2605.22333). An LLM-assisted analysis of the A2A specification reported 11 specification-level vulnerabilities, including identity loss across multi-hop delegation (paper, arXiv 2609.10871). Treat the count with care: the reviewers were the paper's own authors, only two findings were disclosed, and the identity-loss finding is the best supported because it matches the specification's own text.
7. **No independent evaluation of any commercial gateway exists on arXiv.** Gateway and guard papers are prototypes or specifications (Section 8). Choose a gateway on documented features and your own tests.

## 2. The picture

```
   user
    |  (1) user token, audience = the agent
    v
 +------------------+   (2) MCP    +---------------+   (3) upstream   +-------------+
 | AGENT RUNTIME    |------------->| MCP server    |----------------->| API / data  |
 | (MCP client,     |   token A    | (resource     |   token B        | source      |
 |  A2A client)     |   aud=server | server)       |   aud=upstream   +-------------+
 |                  |
 |                  |   (4) A2A    +---------------+
 |                  |------------->| Other agent   |
 +------------------+   credential | (A2A server)  |
          |             aud=agent  +---------------+
          |
   every hop can pass through an ACCESS GATEWAY:
   authenticate | allow-list tools | validate | rate limit | audit | inject or exchange credentials
```

**Four different tokens, four different audiences.** A token is valid for one recipient. The rules below exist so that a token for one hop cannot be replayed on another (the confused-deputy problem).

## 3. Calling tools through MCP

What the runtime does, in order (spec unless marked):

| Step | Detail |
|---|---|
| Discover | Call `server/discover` for versions, capabilities and identity. Send the protocol version and client capabilities on every request. `tools/list` must not vary per connection but may vary by the authorization presented, so the tool list can reflect granted scopes |
| Authenticate | On a `401`, read `WWW-Authenticate` for `resource_metadata` (or fetch the well-known protected-resource URL), pick an authorization server, fetch its metadata and validate the issuer |
| Register the client | In priority order: pre-registered client; **Client ID Metadata Document** (an https URL as the client ID); dynamic client registration (**deprecated** in 2026-07-28); ask the user |
| Get a token | Authorization code flow with PKCE (S256), exact redirect matching, `state`, the RFC 9207 `iss` check, and RFC 8707 `resource` = the server's canonical URI. Short-lived access tokens; public-client refresh tokens rotate |
| Call | `Authorization: Bearer` on every HTTP request, never in the query string. Streamable HTTP needs `Origin` validation on the server side |
| Step up | A `403` with `insufficient_scope` returns the needed scopes; re-authorize with the union and cap retries |
| Treat results as untrusted | Tool descriptions and annotations are untrusted unless the server is trusted. There should be a human able to deny tool calls. Confirm sensitive operations, show inputs before sending, validate results before they reach the model, set timeouts, log for audit |

Three behaviours to design for:

- **Enterprise single sign-on without a browser consent step.** Stable extensions cover enterprise-managed authorization (the identity provider issues an assertion by RFC 8693 token exchange, which the MCP authorization server accepts as a JWT grant) and client-credentials for machine-to-machine use with pre-registered clients (spec; the assertion format is still a WG draft).
- **Servers that need state** mint an explicit handle that is passed as a tool argument. A handle is not authentication: bind it to the verified user on the server (spec security guidance).
- **stdio servers** should take credentials from the environment, not run the OAuth flow (spec). A local server is code running on the user's machine: show the exact command, sandbox it, and get consent before a one-click install.

## 4. Calling agents through A2A

| Topic | What A2A defines (spec unless marked) |
|---|---|
| Version | v1.0.0 normative; v1.0.1 released 2026-05-28. Clients send an `A2A-Version` header; empty means 0.3 |
| Bindings | JSON-RPC over HTTP with SSE, gRPC, HTTP+JSON |
| Discovery | `https://{domain}/.well-known/agent-card.json`, a registry, or direct configuration. The specification defines no registry protocol |
| Agent card | Name, supported interfaces (URL, binding, version, tenant), capabilities, security schemes, security requirements, skills, optional JWS signatures, optional authenticated extended card |
| Security schemes | Based on the OpenAPI 3.2 Security Scheme Object: API key, HTTP (for example bearer), OAuth 2.0 (device code added in v1.0; implicit and password flows removed), OpenID Connect, mutual TLS |
| Authenticating | Read the card's schemes, **obtain credentials out of band**, send them on every request. The server must authenticate every request. Authorization (by skill, action, scope, data policy) is implementation-specific |
| Signed cards | Clients should verify at least one JWS signature (over the card canonicalised per RFC 8785), fetch keys over HTTPS or from a trusted store, and refuse expired or revoked keys |
| Tasks | Operations to send messages, stream, get, list, cancel, subscribe; states include submitted, working, completed, failed, canceled, rejected, **input-required**, **auth-required** |
| Mid-task credentials | An agent that needs another credential sets the task to auth-required; the spec warns that credentials passed in-band along a chain are exposed to every agent in it, and that the state change is **not** itself authorization. The scope, validity and revocation of that credential are undefined |

What to do about the identity gap (inference, built on the stable standards):

1. When agent X calls agent Y for a user, X obtains a token for Y by **RFC 8693 token exchange**: the subject is the user, the actor is X, the audience is Y. The result carries both identities (an `act` claim, which nests for a chain).
2. Y authorizes on the user's rights **and** X's rights, and logs both.
3. Never forward X's own token to Y, and never forward the user's token as if it were Y's.
4. Treat auth-required credentials as bound to the originating agent; do not pass them along a chain.
5. Verify signed cards where the peer publishes them, and pin or allow-list the agents you will call.

## 5. Authorization patterns

| Pattern | Standard or source | When to use |
|---|---|---|
| **On behalf of the user** | RFC 8693 token exchange with actor; vendor on-behalf-of features (AWS, Auth0 early access) | The action should be limited by the user's own rights and attributed to them |
| **The agent's own identity** | Workload identity, client credentials (MCP extension), SPIFFE-based agent identity (Google), Entra Agent ID | Autonomous or scheduled work with no user present; grant the agent the least rights it needs |
| **Short-lived, audience-bound tokens** | RFC 8707, RFC 9068 (JWT access tokens), RFC 9449 (DPoP) for sender-constrained tokens | Always. Do not use static API keys for agent identity (the IETF agent-authentication draft calls this an antipattern) |
| **Credential vaulting at the gateway** | AWS token vault, Kong Token Vault, Docker secret injection (docs) | The model and the runtime should never see long-lived third-party secrets |
| **Per-tool scopes and policy** | MCP scopes with step-up (no wildcards); gateway allowlists; policy engines | Least privilege per tool and per argument |
| **Human approval** | MCP human-in-the-loop guidance; CIBA step-up; gateway approval actions | Sensitive or irreversible actions. The IETF draft says an agent must not treat local UI confirmation alone as authorization and should turn it into an OAuth event |

Policy engines the documentation actually mentions: **Cedar** (AWS AgentCore Gateway, evaluated against JWT claims and the tool-call request), **CEL** (Envoy-based Agent Router, agentgateway), **OPA** (Kong Mesh only, not the Kong AI Gateway pages read), Databricks attribute-based policies with SQL-function custom policies, Google IAM policies with Service Extensions, and Azure API Management XML policies. The MCP and A2A specifications name no policy engine.

### One request, hop by hop

| # | Token | Issuer | Audience | Subject / actor | Checked by |
|---|---|---|---|---|---|
| 1 | User login token | Enterprise identity provider | The agent | User | The agent, or a gateway in front of it |
| 2 | MCP access token (A) | The MCP server's authorization server (or the identity provider via an assertion) | The MCP server | User, or the agent as client | The MCP server and any gateway |
| 3 | Upstream token (B) | The upstream authorization server | The upstream API | The MCP server as client, optionally the user via exchange | The upstream API |
| 4 | A2A credential (C) | The peer agent's declared auth provider | The peer agent | The agent (workload), plus the user via exchange | The peer agent and any gateway |

A gateway that terminates TLS breaks transport-layer identity, so identity must travel at the application layer in tokens (draft).

## 6. Access gateways

What the documentation of each product says (n/d means not found in the pages read, not unsupported). The full table with sources is in [specs-evidence.md](specs-evidence.md#5-gateways).

| Product | Inbound auth | Tool allowlist | Policy / guardrails | Outbound credentials | A2A | Stated gap |
|---|---|---|---|---|---|---|
| Databricks Unity Gateway | Databricks tokens, Unity Catalog grants | Tool selection (no exclusion patterns) | Service policies (**Beta**) incl. prompt-injection and PII checks | Unity Catalog connections (bearer, OAuth, per-user OAuth) | n/d | Workspace MCP endpoints (including Genie) **bypass** the gateway |
| AWS Bedrock AgentCore Gateway and Identity | OAuth/JWT, IAM, or none | Aggregated virtual MCP server; semantic search | Cedar policies, interceptors | OAuth, on-behalf-of exchange, IAM; JWT passthrough **not recommended for production** | Proxied as an HTTP target | Passthrough and `NONE` modes shift enforcement to targets |
| Microsoft API Management and MCP Gateway | Subscription key, Entra JWT | Choose operations as tools; API Center registry | XML policies | Credential manager injects OAuth tokens | Import A2A agents with card rewriting (API Management) | Policies apply to all tools of a server; MCP Gateway requires 2026-07-28 |
| Google Agent Gateway and Apigee | Agent Identity (SPIFFE) with mTLS and DPoP; IAM | Agent Registry | Model Armor, Service Extensions | Auth manager | First-class (MCP, A2A, REST, gRPC) | Parts in preview |
| Cloudflare MCP server portals | Access login, service tokens | Per-portal tool selection | Optional DLP | Per-server credentials | n/d | n/d |
| Kong AI Gateway | Key auth or OpenID Connect, ACLs | MCP server entity, registry (tech preview) | Guardrails policy | Token Vault, virtual keys | A2A traffic gateway | Token Vault needs Konnect |
| Agent Router (Envoy AI Gateway) | OAuth, JWT, CEL rules | Include and regex selector | n/d | Key injection | **Preview**, no method-level authorization | Page still describes pre-2026 sessions |
| Docker MCP Gateway; agentgateway; ContextForge | Per README only | Profiles, federation, registry | Plugins, RBAC with CEL | Secret and header injection | agentgateway and ContextForge list A2A | Docker's governance product is invite-only |

How to use this:

- **Enforce at the gateway and again at the resource.** A gateway can pre-check audience and scope, allow-list tools, limit rates and log. The MCP server must still check its own audience; an internal bypass is the failure mode the Databricks documentation itself describes.
- **Do not forward the inbound token.** Exchange it, or inject a vaulted credential, per hop.
- **Keep the gateway swappable.** Hold the tool list, the policies and the audit schema in your runtime's own config, so the product is an adapter.
- **Version negotiation is part of the gateway choice.** Products differ on which MCP revisions they serve (Kong, Apigee and Cloudflare serve several; the Microsoft MCP Gateway requires 2026-07-28 with no fallback).

## 7. Threats and the controls that answer them

| Threat | Control | Evidence |
|---|---|---|
| Server exposes tools without authentication | Authenticate every remote server; deny by default at the gateway | 40.55% of 7,973 remote servers (paper 2605.22333) |
| OAuth flaws: registration, redirect, audience | Client ID Metadata Documents or pre-registration; exact redirect matching; PKCE; audience check | 325 flaws across 119 servers, registration flaws 96.6% (paper 2605.22333) |
| Token passthrough and confused deputy | Forbid passthrough; per-client consent; exchange per hop | Spec security best practices |
| Tool-description change or look-alike server (rug pull) | Pin a fingerprint of each tool description at approval; re-approve on change; trusted-server allow-list | Threat taxonomy (paper 2503.23278) |
| Prompt injection through tool results | Provenance of data, policy on tool calls, least privilege per task | CaMeL (arXiv 2503.18813) solved 77.3% of AgentDojo tasks with o3 against 84.5% undefended and cut successful attacks sharply; its abstract says "provable security" but the paper lists formal verification as future work and notes side channels; Progent (2504.11703) |
| Identity lost across agent hops | Token exchange with an actor chain; log both identities | A2ABreak (paper 2609.10871) |
| Over-broad scopes | No wildcard scopes; per-tool and per-argument policy; progressive step-up | MCP spec scope guidance |
| Local server compromise, SSRF in discovery | Sandbox local servers; block private and metadata addresses in discovery; egress proxy | MCP security best practices |
| Unaudited actions | Pre-execution mediation with tamper-evident records (one paper reports 8.3 ms median overhead) | arXiv 2604.05485 (abstract; position paper) |

## 8. What arXiv adds, and what it does not

The eight papers in the [stage](../../llm-learning-repository/tutorials/08-agent-connectivity/README.md) cover: a policy engine for least privilege (Progent), an MCP threat taxonomy, a measurement of authentication in real MCP servers, a protocol analysis of A2A, a delegation framework, a design that enforces policy on data flow (CaMeL), a runtime-enforcement specification (AARM), and the benchmark both defences report on (AgentDojo). The [arXiv evidence file](arxiv-evidence.md) lists 36 verified papers.

- **No independent evaluation of any commercial gateway or agent-identity product.** Searches returned only vendor pages. Gateway and guard papers are prototypes, self-evaluated or specifications only.
- **No controlled study of human-approval fatigue.** Only a qualitative paper; approval-rate figures in blogs are unverified and excluded.
- **Small and single-author preprints** are in the shortlist (AARM is one author and has no measurements); the guides say so.
- **Protocol papers age quickly.** A paper on MCP written against 2025 revisions describes a protocol that has since become stateless.

## 9. Defaults by situation

Hypotheses to test, not decisions.

| Situation | Starting point |
|---|---|
| Internal tools, one organisation | Enterprise identity provider, MCP servers behind a gateway, token exchange for upstream calls, gateway audit |
| Third-party MCP servers | Allow-list and pin them; treat descriptions as untrusted; per-tenant credentials from a vault; no passthrough |
| Calling partner agents over A2A | Verify signed cards, allow-list peers, token exchange with an actor chain, log both identities, a tenant per peer under the [tenant-isolation pattern](../tenant-isolation/README.md) |
| Prototype | Local stdio servers with a sandbox and human approval; OAuth only once a server is remote |
| Regulated data | Gateway enforcement plus resource-side checks, per-tenant keys, tamper-evident audit |

## 10. What this does and does not establish

- **No product was run.** Gateway facts come from vendor documentation read on 2026-11-19 by a research agent and were not re-verified line by line. Several features are preview, beta or early access.
- **The standards are moving.** OAuth 2.1 is still a draft (the MCP specification cites an older revision than the current one), the Client ID Metadata Document draft has advanced past the revision MCP cites, and every agent-specific delegation draft is a draft; several are individual submissions or expired. Design to the published RFCs and treat drafts as direction.
- **Parts of the research could not be verified:** Okta's own documentation, details of several gateways (argument validation, DLP), and the full text of the delegation drafts. The evidence file lists them.
- **The defaults and the on-behalf-of recipe for A2A are inference**, built from RFC 8693 and the documentation, not something the A2A specification prescribes.

## Related

- [Specifications evidence](specs-evidence.md) and [arXiv evidence](arxiv-evidence.md)
- [Agent connectivity stage](../../llm-learning-repository/tutorials/08-agent-connectivity/README.md)
- [Runtime reference architecture](../runtime-architecture/README.md) , [tenant isolation](../tenant-isolation/README.md) and [data access](../data-access/README.md)
- [Earlier MCP and A2A overview guide](../../llm-learning-repository/tutorials/04-agents-and-protocols/21-interoperability.md)
