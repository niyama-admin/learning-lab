# Stage 08 - Agent connectivity: MCP, A2A, authorization and gateways

How should an agent runtime call tools through the Model Context Protocol (MCP) and other agents through Agent2Agent (A2A), and who checks what: authentication, authorization on behalf of a user, access gateways and policy enforcement? This stage reads eight papers on that question. The pattern that results, with what the specifications and vendor documentation say, is in [agents/connectivity](../../../agents/connectivity/README.md).

Every guide uses the v2 format in [guide-authoring-spec-v2.md](../../references/guide-authoring-spec-v2.md). Read [ReAct](../02-building/10-react.md) and the earlier [interoperability guide](../04-agents-and-protocols/21-interoperability.md) (MCP and A2A basics) first. The data-agents stage's [prompt-to-SQL injection guide](../07-data-agents/39-prompt-to-sql-injection.md) is the same problem inside one database.

## What the stage says, in five parts

| # | Question | What the papers show | Strength of evidence |
|---|---|---|---|
| 1 | What can go wrong with MCP? | A catalogue of 16 threats across four attacker types and a four-phase server lifecycle, each with a proof-of-concept and a defence ([MCP landscape](41-mcp-landscape-threats.md)). It measures no attack success rates. | Catalogue, not measurement |
| 2 | Is it going wrong in practice? | A scan found 7,973 live remote MCP servers, 3,233 (40.55%) exposing tools without authentication; of 119 hand-verified OAuth servers, every one had at least one flaw, 325 in total ([MCP authentication measurement](42-mcp-auth-measurement.md)). | Real measurement; a single snapshot, one search method, ethics statement not found in the text |
| 3 | Is A2A's identity story sound? | An LLM-assisted analysis of the A2A specification reports 11 specification-level vulnerabilities; the best supported is that user identity is lost across multi-hop delegation ([A2ABreak](43-a2abreak.md)). The reviewers were the authors, and only two findings were disclosed. | Moderate for the identity gap; weaker for the count |
| 4 | How should delegation work? | A design paper proposes a signed delegation token naming user, agent and limits, on OAuth and OpenID Connect ([Authenticated delegation](44-authenticated-delegation.md)). It has no experiment or implementation. | Proposal only |
| 5 | What stops prompt injection and over-broad actions? | Policy on tool calls: per-task least-privilege rules cut attack success from 39.9% to 1.0% on AgentDojo with gpt-4o ([Progent](40-progent.md)); a design that tracks where data came from solved 77.3% of tasks versus 84.5% undefended with the best model ([CaMeL](45-camel-prompt-injection-by-design.md)); a specification defines five decisions and signed receipts but reports no measurements ([AARM](46-aarm.md)). The yardstick for the first two is [AgentDojo](47-agentdojo.md). | Moderate for Progent and CaMeL on one benchmark; none for AARM |

## What the stage does not establish

- **Nothing independent about gateway products.** No paper here, and none found on arXiv, evaluates a commercial MCP or agent gateway or agent-identity service. See [agents/connectivity](../../../agents/connectivity/README.md#8-what-arxiv-adds-and-what-it-does-not).
- **The protocols have moved.** MCP's current revision (2026-07-28) is stateless and deprecates dynamic client registration; A2A is at v1.0. The papers studied earlier revisions, and each guide says which and what may differ now, labelled as the guide's inference.
- **One benchmark carries the defence results.** Progent and CaMeL both report on AgentDojo; a later paper (arXiv 2510.05244, read only as an abstract) argues such benchmarks saturate easily. The AgentDojo guide lists its own internal inconsistencies.
- **No open or local model was tested as the policy writer** in Progent; its headline run also auto-approves every policy expansion.
- **Small and single-author work** is included on purpose (AARM, the delegation paper); the guides say what each does and does not show.

## Reading order

| Order | Guide | The question it answers | Time |
|---:|---|---|---|
| 41 | [MCP landscape and threats](41-mcp-landscape-threats.md) | What is the map of MCP risks? | 1-2 sessions |
| 42 | [MCP authentication measurement](42-mcp-auth-measurement.md) | How bad is it in the wild? | 1-2 sessions |
| 43 | [A2ABreak](43-a2abreak.md) | Where does A2A's specification leak identity? | 1-2 sessions |
| 44 | [Authenticated delegation](44-authenticated-delegation.md) | How could an agent carry a user's authority? | 1 session |
| 47 | [AgentDojo](47-agentdojo.md) | How do we measure injection attacks and defences? | 1-2 sessions |
| 45 | [CaMeL](45-camel-prompt-injection-by-design.md) | Can the design make injection harmless? | 1-2 sessions |
| 40 | [Progent](40-progent.md) | Can per-task least privilege be enforced on tool calls? | 1-2 sessions |
| 46 | [AARM](46-aarm.md) | What would a runtime enforcement standard require? | 1 session |

## If you can only use open or smaller models

The security results here mostly used closed models, and the defences that need a model (Progent's policy writer, CaMeL's two models) were not shown with small open ones. Test three things on your own model: whether it can write a correct task policy without over-granting, whether the quarantined-extraction step still works, and your utility loss on your own tool suite. Design-level controls that need no model (audience checks, token exchange, allow-lists, signed receipts) apply unchanged.

## How these were checked

Each figure was checked against the arXiv HTML rendering of the paper, because the local PDF could not be rendered in the authoring environment. Several figures are images and could not be read; the guides say which. One paper (Progent) reports only bar charts, which the writer rendered and read. Constructed examples (all run, standard library only, no network) are labelled. The guides were drafted by language-model agents and spot-checked by the maintainer, not reviewed by the papers' authors.
