# Evidence: MCP, A2A, authorization and gateway specifications

Supporting evidence for the [connectivity pattern](README.md). Compiled 2026-11-19 by an AI research agent from official specifications, IETF datatracker records and vendor documentation (source index at the end, each read 2026-11-19). Not re-verified line by line by a human; vendor features and preview status change fast, so treat anything older than about 90 days as a prompt to re-read. Section "What I could not verify" is part of the result.


Read date for every source below: 2026-11-19. Every fact carries a source tag like [M3]; the Source index at the end gives URL and read date (all 2026-11-19). Nothing was filled from memory. Where I infer, it says "inference". Page text was treated as data.

## Bottom line

1. MCP's current revision is 2026-07-28 (supersedes 2025-11-25). It is stateless: no initialize handshake, no Mcp-Session-Id, per-request version and capabilities in `_meta`, `server/discover` mandatory, long-running work via an official Tasks extension, server-to-client requests replaced by "multi round-trip requests" [M1][M2]. A runtime that still assumes sessions or SSE resumability will break against 2026-07-28 servers. Vendors are mixed: Kong, Cloudflare, Apigee, Microsoft MCP Gateway and AWS (tasks) already document 2026-07-28; Envoy's doc page still describes sessions and Last-Event-ID [K4][CF1][G4][MS5][A9][E1].
2. MCP authorization is a clear OAuth profile: MCP server = resource server, discovery by RFC 9728 protected resource metadata, RFC 8707 `resource` on every authorization and token request, server must validate audience, token passthrough is forbidden, scope step-up via 403 `insufficient_scope` [M3][M4][M6]. Dynamic Client Registration is now deprecated in favour of Client ID Metadata Documents [M1][M5]. Enterprise SSO-driven token issuance (ID-JAG) and client-credentials are stable extensions [M9][M10].
3. A2A is at v1.0 (v1.0.0 2026-03-12, v1.0.1 2026-05-28). Auth is deliberately outside the payload: the Agent Card declares OpenAPI-style security schemes, the client gets credentials out of band, the server authenticates every request. The spec says identity is NOT carried in A2A payloads and gives no standard way to propagate end-user identity or delegated authority across agents [A1][A2][A5][A6]. That gap is where RFC 8693 `act` chains, transaction tokens and the agent-auth drafts come in. None of them is final.
4. The official MCP/A2A relationship: MCP = agent to tools (vertical), A2A = agent to agent (horizontal); use both together [A8].
5. Gateways converge on the same pattern: terminate inbound OAuth/JWT, filter tools, rate-limit, audit, inject or exchange outbound credentials. They differ sharply on A2A (first-class at Google, Kong, Microsoft APIM, AWS-as-HTTP-target; preview-only at Envoy; not found in the Databricks pages I read) and on stated gaps (Databricks workspace MCP endpoints bypass Unity Gateway; Google Agent Gateway partly preview; Envoy A2A has no method-level authz) [D4][G1][E2].
6. IETF reality check: OAuth 2.1 is still an Internet-Draft (draft-ietf-oauth-v2-1-17, WG Document) while MCP cites -13; CIMD is draft-ietf-oauth-client-id-metadata-document-03 (MCP cites -00); every agent-specific delegation/identity item is a draft, most individual and several expired [I1][I2]. Design to the RFCs (9728, 8707, 8693, 9449, 9068, 7523, 9700) and treat drafts as direction, not contract.

---

## 1. MCP

### Current revision, transports, what changed
- Current protocol version is 2026-07-28 (marked "latest"); prior is 2025-11-25. Version strings are YYYY-MM-DD of last backwards-incompatible change [M2].
- Transports: stdio, Streamable HTTP (each message an HTTP POST to one endpoint; reply is JSON or a request-scoped SSE stream). HTTP+SSE (from 2024-11-05) is reclassified Deprecated [M1][M7].
- Major changes vs 2025-11-25 [M1]: protocol-level sessions and `Mcp-Session-Id` removed (servers needing state mint explicit handles passed as tool arguments); `initialize` handshake removed, each request carries `io.modelcontextprotocol/protocolVersion` and `clientCapabilities` in `_meta`; mandatory `server/discover`; `subscriptions/listen` replaces GET stream and resource subscribe; `ping`, `logging/setLevel`, `roots/list_changed` removed; Tasks moved to official extension `io.modelcontextprotocol/tasks` (poll with `tasks/get`, `tasks/update`); Multi Round-Trip Requests replace server-initiated `roots/list`, `sampling/createMessage`, `elicitation/create` (server returns `resultType: "input_required"`, client retries with `inputResponses`); SSE resumability (`Last-Event-ID`) removed, broken stream means re-issue as new request.
- Minor changes relevant to gateways [M1]: required HTTP headers `Mcp-Method` and `Mcp-Name` on POST (so intermediaries can route without parsing the body; body stays source of truth) and `x-mcp-header` for exposing tool parameters as headers; `ttlMs` and `cacheScope` ("public"/"private") on list results; deterministic `tools/list` order; OpenTelemetry `traceparent`/`tracestate`/`baggage` in `_meta`; RFC 9207 `iss` validation; `application_type` required in DCR; credentials keyed by issuer.
- Deprecated in 2026-07-28 [M1]: Roots, Sampling, Logging features; HTTP+SSE; DCR (RFC 7591) in favour of Client ID Metadata Documents (remains for backwards compatibility).
- Stateless means `tools/list` MUST NOT vary per connection but MAY vary by the authorization presented on the request (e.g. only tools the granted scopes allow) [M8].
- Streamable HTTP: servers MUST validate `Origin` (DNS rebinding); local servers should bind to 127.0.0.1 [M7].

### Authorization end to end
- Scope: authorization is OPTIONAL. HTTP transports SHOULD conform; stdio SHOULD NOT (take credentials from the environment) [M3].
- Roles: MCP server = OAuth 2.1 resource server; MCP client = OAuth 2.1 client; authorization server (AS) issues tokens, may be separate from the MCP server [M3].
- Standards cited: OAuth 2.1 draft (-13), RFC 6750, 8414, 7591, 8707, 9728, 9207, Client ID Metadata Document draft -00, OIDC Discovery [M3].
- Discovery: MCP servers MUST implement RFC 9728 and the metadata MUST include `authorization_servers`. Two mechanisms: `resource_metadata` in the `WWW-Authenticate` header of a 401, or well-known URIs (`/.well-known/oauth-protected-resource[/path]`). Clients MUST support both and parse 401 challenges. AS metadata via RFC 8414 or OIDC Discovery, clients try a fixed priority order of endpoints; `issuer` in the document MUST equal the issuer used to build the URL [M4].
- Client registration, in client priority order [M5]: (1) pre-registered, (2) Client ID Metadata Documents if AS advertises `client_id_metadata_document_supported`, (3) DCR via `registration_endpoint` (deprecated), (4) prompt the user. CIMD: client_id is an https URL with a path hosting a JSON doc with at least `client_id`, `client_name`, `redirect_uris`; AS validates and caches. Credentials are bound to the issuing AS and must not be reused with another.
- Resource indicators: clients MUST send RFC 8707 `resource` (canonical URI of the MCP server) in both the authorization and token requests, even if the AS may not support it [M3][M6].
- Token audience binding: MCP servers MUST validate that tokens were issued for them as audience, MUST only accept tokens valid for their own resources, and MUST NOT accept or transit any other tokens. Clients MUST NOT send tokens issued by anything other than the server's AS [M3][M6].
- Token use: `Authorization: Bearer` on every HTTP request, never in the query string [M3].
- Code flow protections: PKCE with S256 required, and client must refuse to proceed if AS metadata lacks `code_challenge_methods_supported`; exact redirect-URI matching; `state`; RFC 9207 `iss` check before redeeming the code; HTTPS for AS endpoints, redirect URIs localhost or HTTPS [M3][M6].
- Scopes: server SHOULD put `scope` in the `WWW-Authenticate` challenge; client follows it, else falls back to `scopes_supported` [M3]. Token lifetimes: AS SHOULD issue short-lived access tokens; public-client refresh tokens MUST rotate [M6].
- Step-up: runtime shortfall returns 403 with `error="insufficient_scope"`, `scope=...`, `resource_metadata`. Clients SHOULD re-authorize with the union of previous and challenged scopes and cap retries. Servers SHOULD emit all scopes for the operation in one challenge and MUST honour scope hierarchies [M3].
- Extensions (stable, optional): Enterprise-Managed Authorization (client gets an ID-JAG from the enterprise IdP by RFC 8693 token exchange, presents it as an RFC 7523 JWT grant to the MCP server's AS; `audience` = resource AS issuer, `resource` = MCP server; admin policy is evaluated at the IdP; ID-JAG example `expires_in` 300) and OAuth Client Credentials (machine to machine, `private_key_jwt` recommended, pre-registered clients only, no DCR) [M9][M10].

### Token passthrough, confused deputy, session handling, best-practice list
- Token passthrough: MCP server accepting a token not issued to it and forwarding it downstream is "explicitly forbidden". Listed harms: control circumvention, accountability/audit loss, trust-boundary breaks, future-compat risk. Rule: MCP servers MUST NOT accept tokens not explicitly issued for them. If the server calls upstream APIs it acts as an OAuth client; the upstream token is a separate token and the inbound token MUST NOT be passed through [M6][M11].
- Confused deputy: arises in MCP proxy servers using a static client ID with a third-party AS plus DCR plus a consent cookie. Mitigations are normative: per-client consent registry checked before forwarding, consent UI naming the client, scopes and redirect URI, CSRF and clickjacking protection, `__Host-` cookies, exact redirect matching, single-use `state` set only after consent [M11].
- Sessions: in 2026-07-28 there are none at protocol level. New attack named "State handle hijacking": possession of a handle is not authentication; bind handles to the authenticated user server-side (key like `<user_id>:<handle>` from the verified token), use unguessable handles. 2025-11-25 session-hijacking guidance remains on the old page [M11].
- Other items on the Security Best Practices page [M11]: SSRF in OAuth discovery (block private/link-local/metadata IPs, HTTPS, validate redirects, egress proxy; also applies to an AS fetching CIMD URLs); local MCP server compromise (show exact command, sandbox, consent before one-click install); OAuth authorization URL validation (javascript: and shell-injection URLs); stdio proxy escalation; mix-up attacks; localhost redirect impersonation under CIMD; CIMD trust policies (allowlist or accept-any); scope minimization (no wildcard scopes, progressive elevation, log elevation events).
- Not found: the pages I read do not use the terms "tool poisoning" or "prompt injection" (grep over the Security Best Practices and Tools pages found none). Treat the protocol's stance as the "untrusted descriptions/annotations" rule below, not a named tool-poisoning section [M11][M8].

### How servers advertise tools; trust of descriptions and annotations; human in the loop
- Servers declare the `tools` capability, answer `tools/list` (name, title, description, `inputSchema`, optional `outputSchema`, optional `annotations`); JSON Schema 2020-12 keywords allowed; `listChanged` notification optional; `server/discover` advertises versions, capabilities, identity [M1][M8].
- "Clients MUST consider tool annotations to be untrusted unless they come from trusted servers." The overview also says descriptions of tool behaviour such as annotations should be considered untrusted unless obtained from a trusted server, and tools represent arbitrary code execution [M8][M12].
- Human in the loop: "there SHOULD always be a human in the loop with the ability to deny tool invocations"; apps SHOULD show which tools are exposed, show indicators on invocation, present confirmation prompts. Overview: hosts must obtain explicit user consent before invoking any tool; protocol itself cannot enforce this [M8][M12].
- Tools page security list: servers MUST validate inputs, implement access controls, rate limit, sanitize outputs; clients SHOULD confirm sensitive operations, show inputs before calling (exfiltration), validate results before passing to the LLM, use timeouts, log for audit [M8].

---

## 2. A2A

- Version: spec page says v1.0.0 normative (proto is source of truth; JSON Schema generated). GitHub releases: v1.0.1 (2026-05-28), v1.0.0 (2026-03-12), v0.3.0 (2025-07-30) [A1][A3][A4]. Clients MUST send an `A2A-Version` header (Major.Minor); empty means 0.3 [A1]. Project is donated to the Linux Foundation; site banner says A2A joins the Agentic AI Foundation [A2][A1].
- Bindings: JSON-RPC over HTTP (with SSE), gRPC, HTTP+JSON/REST [A2].
- Agent Card (proto `AgentCard`) fields [A5]: `name`, `description`, `supported_interfaces[]` (url, protocol_binding, protocol_version, optional tenant; first = preferred), `provider`, `version`, `documentation_url`, `capabilities` (streaming, push_notifications, extensions, `extended_agent_card`), `security_schemes` (map), `security_requirements[]` (scheme to scopes), `default_input_modes`, `default_output_modes`, `skills[]`, `signatures[]` (JWS), `icon_url`.
- Security schemes: discriminated union "based on the OpenAPI 3.2 Security Scheme Object": API key (header/query/cookie), HTTP auth (e.g. Bearer, with `bearer_format` hint), OAuth2 (flows + `oauth2_metadata_url` RFC 8414), OpenID Connect (discovery URL), mutual TLS [A5]. v1.0 removed Implicit and Password OAuth flows, added Device Code (RFC 8628) and `pkce_required` [A7].
- How a caller authenticates [A1][A6]: discover requirements from `securitySchemes`; obtain credentials out of band; send them on every request in protocol-appropriate headers; server MUST authenticate every request, SHOULD return 401 with challenge info or 403. Production requires HTTPS/TLS; clients SHOULD verify the server certificate. Authorization is implementation specific and MAY consider skill, in-task action, data policy, OAuth scopes.
- Extended agent card: if `capabilities.extendedAgentCard` is true, an authenticated client calls `GetExtendedAgentCard` (REST `/extendedAgentCard`) with its credential and receives a richer card (e.g. extra skills) [A1][A5][A7].
- Signed cards: optional. JWS (RFC 7515) over the card canonicalized with JCS (RFC 8785), `signatures` field excluded; header carries alg/kid/jku. Clients SHOULD verify at least one signature, fetch keys over HTTPS or from a trusted store, MUST NOT use expired or revoked keys; multiple signatures allowed for rotation [A1].
- Identity and delegation: A2A "treats agents as standard enterprise applications"; "Identity information is handled at the protocol layer, not within A2A semantics"; enterprise page: payloads "don't carry user or client identity information directly", identity is at the transport/HTTP layer; authorization "could represent an end user, a client application, or both" [A1][A6]. There is no defined field or token format for carrying the end user or a delegation chain between agents (inference from the absence in spec sections 7 and 8; the docs only say identity is at the HTTP layer).
- In-task authorization: agent sets task state `TASK_STATE_AUTH_REQUIRED`, credentials SHOULD arrive out of band; an intermediate agent can forward by setting its own task to AUTH_REQUIRED, forming a chain. Spec says in-band credential exchange across a chain exposes credentials to every agent and recommends binding credentials to the originating agent and encrypting. "The A2A protocol does not define the scope, representation, validity, or revocation semantics" of that credential, and agents MUST NOT treat the state transition itself as authorization [A1].
- Task/stream model [A5][A1]: operations SendMessage, SendStreamingMessage, GetTask, ListTasks, CancelTask, SubscribeToTask, push-notification config CRUD, GetExtendedAgentCard. Task states: SUBMITTED, WORKING, COMPLETED, FAILED, CANCELED, REJECTED (terminal); INPUT_REQUIRED, AUTH_REQUIRED (interrupted). Streaming by SSE; async by webhook push (config carries `AuthenticationInfo` scheme + credentials). Objects: Task, Message, Part, Artifact. Multi-tenancy via `tenant` field routed from the interface entry.
- Discovery: `https://{domain}/.well-known/agent-card.json`, registries/catalogs, or direct configuration [A1]. The spec does not define a registry protocol.
- Enterprise guidance: TLS, authenticate every request, per-skill authorization by scope, least privilege, W3C trace context, audit task creation and state changes, and API-management integration "highly recommended" for central policy, rate limits, quotas, developer portals [A6].

## 3. MCP and A2A, per the docs

- A2A docs: "A2A is horizontal... MCP is vertical." MCP defines how an agent uses tools and resources (structured inputs/outputs, often stateless); A2A is for autonomous agents that reason, hold state and multi-turn dialogue. Each agent uses MCP internally for its tools; A2A connects agents to each other; "Use both together" [A8].
- An A2A skill can be exposed as an MCP tool when well-defined and stateless-like, "but A2A's main strength is stateful, collaborative interactions" [A8].
- Recommendation (inference): gateways treat them as separate traffic classes. AWS aggregates MCP targets into one virtual MCP server but proxies A2A as an HTTP target with no aggregation [A10]. Google Agent Gateway mediates MCP, A2A, REST and gRPC [G1].
- The MCP spec pages I read contain no guidance on A2A.

## 4. Identity patterns for agents

What the standards and docs say (strength labelled):
- On-behalf-of versus own identity. RFC 8693 (Proposed Standard) distinguishes delegation (A acts for B, A keeps its own identity, composite token with `act` claim, can express a chain) from impersonation (A is indistinguishable from B). Request carries `subject_token` (the party on behalf of whom) and optional `actor_token` (the delegate) [S1][S2].
- Auth0 documents three token shapes: client-credentials (agent is `sub`), standard login with agent-linked client (user is `sub`, one-level `act` = agent), OBO exchange (user `sub`, `act` = agent with nested `act` = originating client for multi-hop chains); also `sub_profile` and `client_profile` claims from draft-mcguinness-oauth-actor-profile. Marked Early Access [O1]. That draft is individual, rev 01 dated 2026-10-09 [I4].
- AWS AgentCore Identity: agents are "workload identities" in a directory; OBO token exchange supports RFC 8693 or RFC 7523 modes; exchanged token "carries both the agent's own identity and the original caller's identity"; token vault stores OAuth tokens/client credentials/API keys; a workload access token carries agent and end-user identity; IAM policies scope which workload identities can use which credential providers [A11][A12].
- Google Agent Identity: SPIFFE-based per-agent identity, not impersonable, access tokens "cryptographically bound to the agent's unique X.509 certificates", acts on own authority or user-delegated (3-legged OAuth via auth manager), audit logs record agent and delegating user [G2]. Agent Gateway text says identities are secured with mTLS and DPoP [G1].
- Microsoft Entra Agent ID: agent identities distinct from service principals and users; supports autonomous access (rights granted to the agent identity) and delegated access (rights delegated by a user); agents can authenticate incoming requests with Entra tokens; optional paired "agent user" accounts [MS6]. Note: extending Entra security features to agents is stated to need Microsoft Agent 365 licensing [MS6].
- Databricks: inbound is a Databricks token for a user (OAuth U2M) or service principal (M2M) or federated token; outbound to external MCP uses Unity Catalog connection credentials (shared bearer, shared M2M, shared or per-user OAuth, DCR); policy functions can see `actor.context.is_on_behalf_of` and the agent's OAuth `client_id` [D3][D2].
- Short-lived credentials and vaulting: MCP spec says AS SHOULD issue short-lived access tokens [M6]. AWS and Kong keep credentials in a vault (AgentCore token vault; Kong Token Vault) [A12][K3]. Docker injects secrets into server containers [DK1][DK2]. draft-hartman-credential-broker-4-agents (individual, rev 00, expired state) proposes proxy credentials from a broker [I3].
- Per-tool scopes: MCP scopes are per-resource with step-up, scope design guidance says no wildcards [M3][M11]. Gateways add per-tool controls above scopes (allowlists, ACLs, policies) [D4][E1][K1][A13]. Draft-niyikiza-oauth-attenuating-agent-tokens (individual, rev 02) proposes tool and argument-constrained, offline-attenuable delegation tokens [I3].
- Delegation chains in standards: RFC 8693 `act` nesting is the only stable standard representation I found. Drafts: transaction tokens (draft-ietf-oauth-transaction-tokens-11, WG state "WG Consensus: Waiting for Write-Up"); agent extension drafts for transaction tokens (draft-oauth-transaction-tokens-for-agents-06 is "Replaced"; draft-araut-oauth-transaction-tokens-for-agents-03 active individual); identity chaining (draft-ietf-oauth-identity-chaining-17, "RFC Ed Queue" with state Blocked); ID-JAG (draft-ietf-oauth-identity-assertion-authz-grant-06, WG document) [I2][I3].
- IETF best practice on agents: draft-klrc-aiagent-auth-03 ("AI Agent Authentication and Authorization") is now "Replaced" by draft-ietf-wimse-aims-01 ("AI Identity Management System", WG Document in WIMSE). It states static API keys are an antipattern for agent identity, recommends OAuth 2.0 as delegation framework, transaction tokens inside a trust domain, and token exchange for secondary credentials; notes TLS termination at gateways breaks transport-layer identity, so application-layer auth is needed; says an agent must not treat local UI confirmation alone as authorization and should translate it into an OAuth event (e.g. CIBA step-up) [I5][I6].

## 5. Gateways

### Comparison table (documented features only; "n/d" = not found in the pages I read, not "unsupported")

| Product | Inbound authn/authz | Tool allowlist / registry | Arg/schema validation | Rate limit | Audit / tracing | Guardrails / DLP | Outbound credential injection / token exchange | A2A | MCP revision stated |
|---|---|---|---|---|---|---|---|---|---|
| Databricks Unity Gateway | Databricks token (U2M, M2M, federation, PAT for gateway but not for Apps-hosted MCP); UC EXECUTE grants [D2][D3] | Tool selection (exact or prefix; no exclusion patterns); MCP registered as UC securable [D4] | n/d (service policies can inspect tool args) [D4] | QPM on `tools/call`, 429; per-user/group limits referenced [D4] | Usage table, audit log `mcpCall`, trace table [D4] | Service policies (Beta): PII, prompt injection, unsafe content, custom SQL function, external vendor; ASK = human approval [D1][D4] | UC connection: bearer, OAuth M2M, shared or per-user OAuth, DCR [D3] | n/d in pages read | n/d |
| AWS Bedrock AgentCore Gateway + Identity | OAuth/JWT (allowed audience, clients, scopes), IAM SigV4, authenticate-only, none; publishes PRM [A9][A13][A14] | MCP targets aggregated into one virtual MCP server; semantic tool search; interceptors; Cedar policy engine [A10][A15] | Interceptors (Lambda) and Cedar policies over tool-call arguments [A15][A16] | Rate limits by dimension (caller, target, tool), TPM for inference [A17] | CloudTrail data events [A10] | Guardrails inside Cedar policies [A15] | API key, OAuth client creds, 3LO, OAuth token exchange (OBO), IAM SigV4, token passthrough (not recommended for prod) [A14][A11] | HTTP target, no aggregation or protocol translation; Runtime A2A contract [A10][A18] | Tasks on 2026-07-28 [A9] |
| Microsoft API Management (MCP) | Subscription key; Entra JWT via `validate-azure-ad-token`; PRM samples [MS2] | Choose which operations become tools; API Center as private MCP registry [MS1] | n/d | `rate-limit` and quota policies, IP filtering, caching [MS1] | App Insights / Azure Monitor, correlation IDs, trace policy [MS1] | n/d on MCP page | Credential manager `get-authorization-context` injects OAuth tokens; header forwarding [MS2] | Import A2A agent API: JSON-RPC mediation, card rewriting, OTel attrs [MS4] | Streamable HTTP; tools only for REST-as-MCP [MS1][MS3] |
| Microsoft MCP Gateway (OSS, GitHub) | Entra ID bearer + app-role RBAC [MS5] | Adapters and tool registrations; tool router [MS5] | n/d | n/d | Telemetry mentioned [MS5] | n/d | Forwards identity headers to tool gateway with shared secret [MS5] | n/d | Requires 2026-07-28; no legacy fallback [MS5] |
| Google Agent Gateway + Agent Identity + Agent Registry (Apigee MCP separate) | Agent Identity (SPIFFE) with mTLS and DPoP; IAM policies, deny by default [G1] | Agent Registry of approved agents, MCP servers, endpoints [G1][G3] | Semantic governance policies; custom authz via Service Extensions [G1] | Token management policies (coming soon) [G1] | OTel traces, Cloud Logging/Trace [G1] | Model Armor [G1] | Auth manager handles OAuth 2.0 and WIF handshakes [G1][G2] | Mediates MCP, A2A, REST, gRPC [G1] | Apigee MCP: 2026-07-28 plus 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05 [G4] |
| Cloudflare MCP server portals (Access) | Access login (IdP) with OAuth for clients, service tokens for M2M [CF1] | Per-portal tool selection and aliasing [CF1] | n/d | n/d | Access request logs; optional Gateway HTTP logging [CF1] | Optional DLP via Cloudflare Gateway [CF1] | Attaches per-server credentials; upstream OAuth per server [CF1] | n/d in page read | Stateless 2026-07-28 and 2025 clients [CF1] |
| Kong AI Gateway | AI Auth Strategy: key-auth or openid-connect, optional protected resource metadata; ACLs; users/groups/IdP [K1][K3] | AI MCP Server entity aggregates and maps REST to tools; Catalog MCP registry (tech preview) [K1][K5] | Request size limiting for A2A; n/d for MCP args | Rate Limiting policy [K1] | AI audit logs, OTel metrics [K1][K2] | AWS Guardrails policy [K6] | Token Vault, virtual keys [K3] | A2A Traffic Gateway: proxy, card URL rewrite, auth strategy, OTel [K2] | 2025-03-26, 2025-06-18, 2025-11-25, 2026-07-28 from v2.1 [K4] |
| Agent Router (formerly Envoy AI Gateway) | OAuth, JWT claims/scopes, CEL access rules [E1] | `toolSelector` include/regex, aggregation with prefixed names [E1] | n/d | Envoy rate limiting [E1] | Access logs with MCP metadata, observability [E1] | n/d | Upstream API key injection, header forwarding [E1] | Preview, no A2ARoute; JSON-RPC validation filter; JWT/API key/ext-auth on RPC [E2] | Page text says June 2025 spec, sessions, Last-Event-ID [E1] |
| Docker MCP Gateway | Gateway proxies and manages access control (no inbound OAuth detail read) [DK1] | Profiles choose which servers are available [DK1] | n/d | n/d | Built-in logging and call tracing [DK1] | n/d | Secrets from Docker Desktop, OAuth flows, credential injection into server containers [DK1][DK2] | n/d | n/d |
| agentgateway (OSS, README) | JWT, API keys, OAuth; RBAC with CEL [AG1] | Tool federation [AG1] | n/d | Rate limiting [AG1] | OpenTelemetry [AG1] | Regex, OpenAI moderation, Bedrock Guardrails, Model Armor, webhooks [AG1] | n/d in README | A2A gateway [AG1] | n/d |
| IBM ContextForge (OSS, README) | Basic, JWT, custom; user-scoped OAuth tokens [FG1] | Registry federating MCP, A2A, REST/gRPC [FG1] | n/d | Rate limit, retries [FG1] | Distributed tracing [FG1] | Plugins [FG1] | `X-Upstream-Authorization` header support [FG1] | A2A integration [FG1] | n/d |

### Notable per-product statements and documented limits
- Databricks: Unity Gateway "authenticates the request, authorizes it against Unity Catalog, and routes it" and applies rate limits, service policies and usage recording [D1]. Limits stated: "Other workspace MCP endpoints, including the Genie Agent MCP, use permissions on the underlying resources without Unity Gateway governance"; those calls "bypass Unity Gateway, so they don't appear in its tracing tables or support MCP-level grants, policies, or guardrails" (endpoints `/api/2.0/mcp/genie|ai-search|sql|functions`) [D5]. Service policies on MCPs are Beta; external service policies fail closed; exclusion patterns like `!delete_*` unsupported; registering Genie, Apps or UC entity sources as your own MCP unsupported; PAT not supported for MCP servers on Databricks Apps; Databricks recommends `system.ai` MCPs over workspace endpoints for new integrations [D4][D5][D6][D3]. Granting `USE CONNECTION` to end users permits direct connection use outside the MCP's policies, so reserve it for authors [D4].
- AWS: HTTP targets get no capability sync or semantic search [A10]. `AUTHENTICATE_ONLY` and `NONE` inbound modes offload authorization to targets, policy or interceptors; JWT passthrough outbound is "not the recommended approach for production" because the same token is then accepted by gateway and target; identity-forwarding configs "rely solely on the downstream runtime" and are for testing/onboarding [A13][A14]. If a proxy fronts the gateway, advertised PRM hostname must be overridden or discovery and audience validation can fail [A13].
- Microsoft APIM: policies currently apply to all operations exposed as tools in the MCP server; MCP prompts unsupported; workspaces unsupported. Inconsistency: overview says tools only, the existing-server page says tools and resources [MS1][MS3]. Request headers auto-forwarded to tool calls except exclusions; forwarding the Authorization header must be explicit [MS2]. A2A import rewrites the card (hostname, JSON-RPC only, drops additional interfaces, rewrites security requirements to the APIM subscription key) [MS4].
- Google: Agent Gateway is available for Agent Platform and GKE; Cloud Run and non-Google Kubernetes in Limited Preview; token management policies and extension bindings "coming soon" [G1]. Apigee MCP exposes APIs as managed MCP tools (`tools/list`, `tools/call`, `server/discover`); hybrid from 1.17.0, stateless protocol from 1.17.4 [G4].
- Cloudflare: Code Mode collapses upstream tools into search and execute tools; portals aggregate servers on one endpoint [CF1].
- Kong: MCP Traffic Gateway documented; Token Vault and virtual keys require Konnect and `ai-gateway` 2.3+ [K3].
- Envoy/Agent Router: no first-class A2A route; "What you do not get yet: aggregation of several agents behind one card, rewriting of the backend's own card, method-level authorization, or support for the gRPC and HTTP+JSON bindings"; the A2A filter is alpha in Envoy [E2].
- Docker: "MCP Gateway as part of Docker AI Governance is an invite-only feature" while the open-source gateway is documented separately [DK1].
- Auth0 (Okta): Agent as Principal and Cross App Access are Early Access; Auth0 for MCP covers metadata discovery and CIMD for MCP clients; Token Vault for third-party APIs; CIBA for human approval; FGA for RAG authorization [O1][O2][O3].

## 6. Policy engines as the docs mention them
- Cedar: AWS "Policy in AgentCore" uses Cedar, evaluated at the Gateway against JWT claims and the MCP tool-call request, schema generated from the gateway's tool manifest; also Cedar for AgentCore Memory FGAC (per llms.txt summary, page itself not read) [A15][A16]. Temporal (session-history) policies and guardrails-in-policies are documented [A15].
- CEL: Envoy/Agent Router access control uses JWT claims, scopes and CEL [E1]; agentgateway README says "fine-grained RBAC with CEL policy engine" [AG1].
- OPA: appears in Kong Mesh (`MeshOPA`, access control for mesh services), not in the Kong AI Gateway MCP/A2A pages I read [K7].
- Databricks: ABAC GRANT policies plus SQL-function custom policies and external policy API [D1][D4]. Google: IAM unified access policies plus Service Extensions for custom authorization [G1]. Microsoft: APIM XML policies [MS1][MS2]. Cloudflare Access policies for portals [CF1].
- The MCP and A2A specs name no policy engine. The IETF agent-auth draft names "policy, attribute or role based authorization systems" generically, no OPA/Cedar [I5].

---

## What the specs say about authorization, in order of a request

Scenario: user asks Agent X; X calls an MCP tool and an A2A agent. "Spec" = normative text read; "Doc" = vendor documentation; "Draft" = Internet-Draft (not final).

1. User to Agent X (outside MCP and A2A).
   - Token: user session or access token for X, issued by the enterprise IdP/AS, audience X. Checked by X (or by a gateway in front of X; gateways such as Kong/AWS/Cloudflare terminate JWT/OIDC here) [K1][A13][CF1]. A2A treats X as a standard HTTP app; if the user is calling X over A2A, the A2A card's security schemes govern and credentials come out of band [A1].
2. Agent X (MCP client) to MCP server (directly or via a gateway). Spec.
   - X sends an unauthenticated request; server returns 401 with `WWW-Authenticate: Bearer resource_metadata=..., scope=...`; X fetches RFC 9728 metadata, picks an AS, fetches RFC 8414/OIDC metadata, validates `issuer` [M4].
   - Registration: pre-registered client, CIMD URL client_id, or DCR (deprecated) [M5].
   - Token A: access token issued by the MCP server's AS, audience = MCP server (RFC 8707 `resource` on authorization and token requests), PKCE S256, RFC 9207 `iss` check; subject = the user (authorization code flow) or X's own client (client-credentials extension) [M3][M6][M10]. Enterprise variant: IdP issues ID-JAG (audience = resource AS, resource = MCP server, ~300s) by token exchange; AS exchanges it for an access token with no browser consent [M9]. Draft ID-JAG -06 is still a WG draft [I2].
   - Sent as `Authorization: Bearer` on every request [M3].
   - Checked by: MCP server (token valid, audience is itself, scopes sufficient, state handles belong to the caller) [M3][M6][M11]; a gateway in front can also pre-check audience/scope, allowlist tools, rate-limit [D4][A13][E1]. Insufficient scope gives 403 `insufficient_scope` and a step-up re-authorization with scope union [M3].
   - Client-side checks by X's runtime: treat tool annotations/descriptions as untrusted unless server trusted; confirm sensitive calls with the user; show inputs [M8][M12].
3. MCP server to upstream API. Spec.
   - Token B: a separate token issued by the upstream AS to the MCP server acting as OAuth client. The inbound Token A MUST NOT be passed through [M6]. For user-attributed calls, an RFC 8693 exchange (subject_token = Token A) is the standards-based route; vendor docs implement it (AWS OBO, Auth0 OBO, agentgateway token exchange per its blog, not read) [A11][O1]. The MCP spec itself does not specify the exchange (inference: no such text in the pages read).
4. Agent X (A2A client) to Agent Y (directly or via a gateway). Spec.
   - X reads Y's Agent Card (`/.well-known/agent-card.json`, optionally verifies the JWS signature) and its `securitySchemes`/`securityRequirements` [A1].
   - Token C: credentials for Y obtained out of band per the declared scheme (OAuth2, OIDC, API key, HTTP bearer, mTLS), audience Y. A2A defines no audience rule beyond the scheme; use RFC 8707/8693 for it (inference) [A1][A6].
   - Whose identity? A2A payloads carry none. If Y must know the end user, the only documented options are: a token-exchange or OBO token with `act` claims (RFC 8693, Auth0 doc, AWS doc), a transaction-token style context token (drafts), or an A2A extension; the A2A spec defers all of it [S1][O1][A11][I3][A1].
   - Y authenticates every request, then authorizes by skill, task action, scopes, data policy [A1][A6]. Extended card requires the credential [A1].
   - If Y needs another credential mid-task it moves the task to AUTH_REQUIRED; X must obtain it out of band; spec warns about in-band credentials crossing chains and that AUTH_REQUIRED is not itself authorization [A1].
   - Push notification webhook calls carry a separate credential from `AuthenticationInfo` (Y authenticates to X's webhook) [A5].
5. Gateway enforcement points, if used. Doc.
   - Inbound to the gateway: validate JWT/IAM/Entra/OIDC [A13][MS2][K1]. Policy decision: Cedar, CEL, UC ABAC, IAM policies [A15][E1][D1][G1]. Outbound from the gateway: inject a vaulted credential or exchange the inbound token (no passthrough in production) [A14][MS2][D3]. Log and trace each call [D4][K2].
   - Caveat: a gateway that terminates TLS breaks transport-layer identity, so application-layer tokens must carry identity downstream [I5].

Token summary:

| Token | Issuer | Audience | Subject / actor | Checked by |
|---|---|---|---|---|
| User login token | Enterprise IdP | Agent X | User | X or front gateway |
| MCP access token (A) | MCP server's AS (or IdP via ID-JAG then AS) | MCP server | User (or X as client) | MCP server, gateway |
| Upstream token (B) | Upstream AS | Upstream API | MCP server as client, optionally user via exchange | Upstream API |
| A2A credential (C) | Y's declared auth provider | Y | X (workload) and possibly user via exchange/act | Y, gateway |
| ID-JAG (ext.) | Enterprise IdP | Resource AS | User plus client | Resource AS |

## Gaps and disagreements

- OAuth 2.1 is not final. MCP cites draft -13 [M3]; datatracker shows -17 (2026-10-31), WG Document [I1]. MCP's CIMD citation is -00; current is -03 (2026-11-02). Enterprise-managed authorization cites ID-JAG -04; current -06 [M3][M9][I2]. Pin behaviour to the spec revision, watch the drafts.
- A2A has no standard user-delegation propagation. Docs say payloads carry no identity; AUTH_REQUIRED credentials have undefined scope and revocation [A1][A6]. Everything cross-agent is vendor or draft: Auth0 `act`/`sub_profile` (Early Access, built on an individual draft), AWS OBO, transaction-token drafts [O1][A11][I3].
- MCP protocol-level mismatch across products: Envoy page describes sessions and Last-Event-ID which 2026-07-28 removes; Microsoft MCP Gateway has no downgrade path; Kong, Apigee and Cloudflare serve both [E1][MS5][K4][G4][CF1]. A runtime must negotiate versions per request.
- MCP says authorization is optional and stdio SHOULD NOT use it; AWS `NONE` and `AUTHENTICATE_ONLY` modes make gateways pass-through, the docs themselves say production should enforce at the gateway [M3][A13].
- Token passthrough: forbidden by MCP, offered by AWS as an outbound option (not recommended for production), and Microsoft documents explicit Authorization header forwarding [M6][A14][MS2]. Product docs and spec disagree in letter, not in warning.
- Gateway bypass is documented only by Databricks (workspace MCP endpoints). For the others, bypass depends on network design (inference); AWS adds a "restrict direct access" page for Memory behind a gateway (title only seen) [D5].
- Microsoft docs conflict on whether APIM supports MCP resources (overview: tools only; existing-server page: tools and resources) [MS1][MS3].
- Vendor agent identity is licensed or preview-gated: Entra extension to agents needs Agent 365; Google Agent Gateway partly preview; Auth0 features Early Access; Databricks service policies Beta; MCP-based Docker governance invite-only [MS6][G1][O1][D1][DK1].
- IETF agent drafts overlap and churn: klrc replaced by WIMSE aims; transaction-tokens-for-agents-06 replaced; several individual drafts expired [I3][I5].

## What I could not verify

- Okta's own developer docs: `developer.okta.com` llms.txt and the Cross App Access guide URL I guessed returned 404; Okta/Auth0 content comes only from auth0.com docs [O1][O2].
- Databricks: no A2A page found, and the "Govern" pages did not state input argument schema validation. Absence of evidence only. I did not read Databricks service-policy reference or rate-limit pages.
- Kong, Cloudflare, Envoy: argument validation and DLP details for MCP not seen. Cloudflare A2A not found in the portals page. I did not read Kong ai-mcp-server entity details (ACL syntax, PRM fields).
- Docker: grepping the gateway README for interceptor, signature and policy keywords found none; I did not read the full GitHub docs. Docker's inbound auth model unread.
- agentgateway: README only; its docs site blog posts (token exchange, Entra OBO) were listed in llms.txt but are blogs and not read.
- Microsoft: Entra agent ID OBO/token flows and the MCP Gateway migration doc not read. APIM A2A authz specifics beyond card rewriting not read.
- Google: `agent-gateway` limits page and Apigee MCP auth/policy pages not read; Cloud API Gateway (legacy) MCP support not checked.
- AWS: I read headings and summaries from llms.txt for the Memory-gateway and Cedar schema pages; the Policy getting-started and `resource-based-policies` pages were not fetched. Gateway interceptor payload fields summarised from one page.
- A2A: full spec sections on push-notification security, extensions, and the Agent Discovery topic page were fetched but not read line by line; registry/curated discovery details unverified. Whether a normative A2A extension for delegated user identity exists was not checked in the extensions repo.
- IETF: I confirmed existence, revision, date and WG/individual state through the datatracker API for the items named, but did not read the full text of the on-behalf-of, attenuating-token, credential-broker and transaction-token drafts beyond their abstracts. RFC status (Proposed Standard / BCP) came from the API's `std_level` field. I did not verify DPoP (RFC 9449) text beyond its abstract, or RFC 9068 beyond existence.
- MCP: `basic/index` and `lifecycle`/`discover` pages read only via changelog and transport pages; the MRTR and tasks extension pages not read; MCP registry docs not read.
- Datatracker RFC `std_level` printed as stdlevel URIs; I mapped /ps/ to Proposed Standard and /bcp/ to BCP.

---

## Source index (all read 2026-11-19)

MCP
- M1 https://modelcontextprotocol.io/specification/2026-07-28/changelog.md
- M2 https://modelcontextprotocol.io/specification/versioning
- M3 https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/index.md
- M4 https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery.md
- M5 https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration.md
- M6 https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations.md
- M7 https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/index.md and .../streamable-http.md
- M8 https://modelcontextprotocol.io/specification/2026-07-28/server/tools.md
- M9 https://raw.githubusercontent.com/modelcontextprotocol/ext-auth/main/specification/stable/enterprise-managed-authorization/2026-07-28/enterprise-managed-authorization.mdx
- M10 https://raw.githubusercontent.com/modelcontextprotocol/ext-auth/main/specification/stable/oauth-client-credentials/2026-07-28/oauth-client-credentials.mdx (and README listing stable extensions)
- M11 https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices.md
- M12 https://modelcontextprotocol.io/specification/2026-07-28/index.md
- Index: https://modelcontextprotocol.io/llms.txt

A2A
- A1 https://a2a-protocol.org/latest/specification/ (sections 6.9, 7, 8, versioning)
- A2 https://a2a-protocol.org/llms.txt
- A3 https://api.github.com/repos/a2aproject/A2A/releases
- A4 https://a2a-protocol.org/latest/specification/ (versioning section)
- A5 https://raw.githubusercontent.com/a2aproject/A2A/main/specification/a2a.proto
- A6 https://a2a-protocol.org/latest/topics/enterprise-ready/
- A7 https://a2a-protocol.org/latest/whats-new-v1/
- A8 https://a2a-protocol.org/latest/topics/a2a-and-mcp/

AWS
- A9 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-features.md
- A10 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-core-concepts.md and gateway-targets-http.md
- A11 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.md
- A12 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/key-features-and-benefits.md
- A13 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-inbound-auth.md
- A14 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-outbound-auth.md
- A15 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-authorization-flow.md and llms.txt Policy section (https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/llms.txt)
- A16 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-fine-grained-access-control.md and gateway-interceptors-types.md
- A17 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-rate-limits.md
- A18 https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a-protocol-contract.md

Databricks
- D1 https://docs.databricks.com/ai-gateway/ai-governance/ (last updated Oct 27, 2026 per page)
- D2 https://docs.databricks.com/unity-gateway/ and https://docs.databricks.com/agents/mcp-tools/
- D3 https://docs.databricks.com/aws/en/agents/mcp-tools/authentication-networking
- D4 https://docs.databricks.com/aws/en/ai-gateway/govern-mcp-service (updated Nov 16, 2026 per page)
- D5 https://docs.databricks.com/aws/en/agents/mcp-tools/built-in-mcp-services
- D6 https://docs.databricks.com/aws/en/ai-gateway/register-mcp-service

Microsoft
- MS1 https://learn.microsoft.com/en-us/azure/api-management/mcp-server-overview
- MS2 https://learn.microsoft.com/en-us/azure/api-management/secure-mcp-servers
- MS3 https://learn.microsoft.com/en-us/azure/api-management/expose-existing-mcp-server
- MS4 https://learn.microsoft.com/en-us/azure/api-management/agent-to-agent-api
- MS5 https://raw.githubusercontent.com/microsoft/mcp-gateway/main/README.md
- MS6 https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/what-is-agent-id

Google
- G1 https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview
- G2 https://docs.cloud.google.com/iam/docs/agent-identity-overview
- G3 https://docs.cloud.google.com/agent-registry/overview
- G4 https://docs.cloud.google.com/apigee/docs/api-platform/apigee-mcp/apigee-mcp-overview

Others
- CF1 https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/ and https://developers.cloudflare.com/agents/model-context-protocol/authorization/
- K1 https://developer.konghq.com/ai-gateway/mcp.md
- K2 https://developer.konghq.com/ai-gateway/a2a.md
- K3 https://developer.konghq.com/ai-access-management.md
- K4 https://developer.konghq.com/ai-gateway/mcp-version-support.md
- K5 https://developer.konghq.com/llms.txt (catalog MCP registry, tech preview)
- K6 https://developer.konghq.com/llms.txt (AI AWS Guardrails policy listing)
- K7 https://developer.konghq.com/llms.txt (meshopa listing)
- E1 https://aigateway.envoyproxy.io/docs/capabilities/mcp/ (page header: Agent Router, version 1.2)
- E2 https://aigateway.envoyproxy.io/docs/capabilities/a2a/
- DK1 https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/
- DK2 https://raw.githubusercontent.com/docker/mcp-gateway/main/README.md
- AG1 https://raw.githubusercontent.com/agentgateway/agentgateway/main/README.md and https://agentgateway.dev/llms.txt
- FG1 https://raw.githubusercontent.com/IBM/mcp-context-forge/main/README.md
- O1 https://auth0.com/docs/ai-agents-mcp/agent-as-principal/agent-identity-in-tokens.md
- O2 https://auth0.com/docs/ai-agents-mcp/cross-app-access.md
- O3 https://auth0.com/docs/ai-agents-mcp.md and https://auth0.com/docs/llms.txt

IETF (datatracker API https://datatracker.ietf.org/api/v1/doc/document/?name=...; RFC text from rfc-editor.org)
- I1 draft-ietf-oauth-v2-1 rev 17, 2026-10-31, WG Document; draft-ietf-oauth-client-id-metadata-document rev 03, 2026-11-02, WG Document
- I2 draft-ietf-oauth-identity-assertion-authz-grant rev 06 (2026-10-31, WG Document); draft-ietf-oauth-identity-chaining rev 17 (2026-11-12, RFC Ed Queue, Blocked); draft-ietf-oauth-transaction-tokens rev 11 (2026-08-21, WG Consensus: Waiting for Write-Up)
- I3 individual drafts (all confirmed on datatracker): draft-oauth-ai-agents-on-behalf-of-user-02 (Expired); draft-oauth-transaction-tokens-for-agents-06 (Replaced); draft-araut-oauth-transaction-tokens-for-agents-03; draft-niyikiza-oauth-attenuating-agent-tokens-02; draft-hartman-credential-broker-4-agents-00 (Expired); draft-ni-wimse-ai-agent-identity-04
- I4 draft-mcguinness-oauth-actor-profile-01 (2026-10-09)
- I5 draft-klrc-aiagent-auth-03 (Replaced) text at https://www.ietf.org/archive/id/draft-klrc-aiagent-auth-03.txt
- I6 draft-ietf-wimse-aims-01 (2026-11-02, WG Document, replaces klrc); draft-ietf-wimse-arch-09 (2026-11-17)
- S1 RFC 8693 https://www.rfc-editor.org/rfc/rfc8693.txt (Proposed Standard; sections 1.1, 4.1 `act`, 4.4 `may_act`)
- S2 RFCs confirmed on datatracker, all Proposed Standard unless noted: 9728 (protected resource metadata), 8707 (resource indicators), 8693, 7591 (DCR), 9449 (DPoP, sender-constrains tokens, abstract read), 9068 (JWT access token profile), 9207, 7523, 8414, 6750; RFC 9700 is BCP (OAuth security BCP)

Datatracker also lists many other agent-related individual drafts (agent identity, gateways, discovery, MCP/A2A applicability); I did not evaluate them. Examples confirmed to exist: draft-liu-rtgwg-agent-gateway-requirements-01, draft-liu-oauth-a2a-profile-00, draft-chen-agent-decoupled-authorization-model-00, draft-song-oauth-ai-agent-collaborate-authz-02, draft-nelson-agent-delegation-receipts-15.
