# Managed analytics and NL2SQL functions: what each platform exposes

What the major data platforms offer as a **callable function, API or tool** for an agent that needs analytics data, so it can use a managed natural-language service instead of writing and running its own SQL. This is the evidence base for the build-or-buy choice in the [data-access pattern](README.md).

**Provenance and limits.** Compiled on 2026-11-19 by an AI research agent from the vendors' own documentation pages (each fact carries its source URL and the date read) and the open Model Context Protocol (MCP) server repositories. It was not re-verified line by line by a human, nothing here was run against a live account, and vendor documentation changes quickly: treat anything older than about 90 days as a prompt to re-read, not a fact. Where a page could not be read or a number was not published, the report says "not verified" and does not fill the gap from memory; section 10 lists those gaps. No independent accuracy comparison of these products exists in this document, because none was found (see the [arXiv findings](README.md#5-build-or-buy-the-nl2sql-function)).

Read date for every source below: 2026-11-19. Method: curl (UA "learning-lab-curation") for official doc pages; WebSearch only to discover URLs (any fact taken only from a search summary is marked "search-summary, page also fetched" where I then fetched it, otherwise "not verified"). Customer-neutral. Product names change fast: Databricks "Genie Spaces" is now "Genie Agents", Amazon QuickSight is now "Amazon Quick".

Status words (GA, Beta, Preview) are quoted from the page where the page states them; where the page text I extracted did not state a status I write "status not stated".

## 1. Comparison table

| Capability | Databricks | Snowflake | Google (BigQuery / Gemini) | Microsoft Fabric | AWS |
|---|---|---|---|---|---|
| Managed NL-to-SQL callable | Genie Agent conversation API (chat mode, GA label on endpoints); Genie One API (Beta) | Cortex Analyst `POST /api/v2/cortex/analyst/message`; Cortex Agents `agent:run` | Conversational Analytics API (`geminidataanalytics.googleapis.com`), pages carry "Preview" banner; BigQuery MCP; Toolbox `ask_data_insights` | Fabric data agent, exposed as MCP server (one tool) once published; GA stated on concept page | Bedrock Knowledge Bases `GenerateQuery` (SQL only, `POST /generateQuery`); Retrieve / RetrieveAndGenerate for structured stores; Quick (QuickSight) Q embed |
| What it returns | Text attachment, SQL query attachment, row_count + statement_id (fetch result rows via query-result endpoint), optional visualization, "thoughts" (Public Preview) | Analyst: `sql` content block with `statement`, `text`, `suggestion`, `confidence.verified_query_used`, `warnings`, `response_metadata`. Does not execute SQL | Stream of messages: text, data, charts; QueryData (v1beta) for database sources | Natural-language answer grounded in data (tables, summaries); chat output capped at 25 rows x 25 columns | GenerateQuery: list of `{sql, type}` (type REDSHIFT_SQL). Does not execute |
| Semantic layer needed | Curated Genie Agent: tables (max 50), column descriptions, example SQL, SQL expressions, text instructions, benchmarks; or Genie Ontology for Genie One | Semantic view (recommended) or legacy semantic model YAML on a stage | Data agent context: system instructions, verified queries, glossary; search scope for BQ | Up to 5 data sources, table selection, agent instructions, up to 100 example queries per source | Knowledge base on Redshift or Glue Data Catalog; optional table/column descriptions, curated queries |
| Async / streaming | Async: start, then poll message status (FETCHING_METADATA ... COMPLETED/FAILED/CANCELLED); Genie One API streams SSE | Analyst: `stream` flag (SSE) or single response; Agents: streamed events; MCP long-running agent runs documented | Stream of messages; stateful or stateless chat | MCP tasks extension (`tasks/get`, `tasks/cancel`) for long requests; other clients get same-connection answer | GenerateQuery synchronous; quota 2 requests/second |
| Identity | OAuth U2M (user) or M2M (service principal); Genie evaluates data access with caller's UC permissions; Apps: app (service principal) or user authorization (Public Preview) | Snowflake roles; MCP uses OAuth (default) or External OAuth; PAT allowed | Data agent queries use the interacting user's credentials; MCP uses 3-legged OAuth, end-user credentials | Requesting user's identity and permissions; MCP token may be user or service principal; RLS/CLS apply for semantic models | IAM roles; knowledge base service role runs Redshift Data API statements |
| Pricing as stated | Genie One API billed as Genie One chat ("Genie pricing"); UC functions at serverless general compute pricing; DBSQL at DBSQL pricing; Genie Agent conversation API pricing not found | Analyst: credits per message processed (successful HTTP 200 only) plus warehouse cost for executing SQL; Agents: orchestration per token, Analyst per token, Search by index size/time | BigQuery compute pricing for queries the agent runs; other agent price on a separate "agent pricing" page not read | Token-based CU: 100 / 10 / 400 CU-seconds per 1,000 input / cached input / output tokens; query execution billed separately | Not verified for GenerateQuery; cross-Region inference stated to incur no additional charge |
| MCP / framework | Managed MCP URLs (Genie Agent, SQL, UC functions, AI Search); system.ai.genie_one_mcp; UCFunctionToolkit (LangChain, OpenAI, Anthropic, LlamaIndex) | `CREATE MCP SERVER` with CORTEX_ANALYST_MESSAGE, CORTEX_AGENT_RUN, CORTEX_SEARCH_SERVICE_QUERY, SYSTEM_EXECUTE_SQL, GENERIC | Remote MCP `https://geminidataanalytics.googleapis.com/mcp` (tools list_data_agents, get_data_agent, chat); `https://bigquery.googleapis.com/mcp`; local Toolbox; A2A | MCP endpoint `https://api.fabric.microsoft.com/v1/mcp/workspaces/{WorkspaceId}/dataagents/{DataAgentId}/agent`; Foundry (preview), Copilot Studio (preview), Python SDK (preview) | No managed MCP for GenerateQuery found; awslabs open-source Redshift MCP server |
| One documented caveat | Genie Agent MCP calls bypass Unity Gateway governance | Analyst has no access to previous SQL results in multi-turn | CA API table selection "isn't a security setting" for database sources | Capped at 25 rows x 25 columns; not for returning complete datasets | Executing LLM-generated SQL is called a security risk by AWS; accuracy varies |

## 2. Databricks

Sources:
- https://docs.databricks.com/aws/en/genie-agents/conversation-api (read 2026-11-19)
- https://docs.databricks.com/api/genie/v1/genie-start-conversation (REST reference, read 2026-11-19)
- https://docs.databricks.com/api/genie/v1/genie-space (read 2026-11-19)
- https://docs.databricks.com/aws/en/genie-agents/best-practices (curation, read 2026-11-19)
- https://docs.databricks.com/aws/en/genie-one/api (Genie One API, page says "Last updated on Oct 29, 2026", Beta)
- https://docs.databricks.com/aws/en/agents/mcp-tools/built-in-mcp-services (MCP, read 2026-11-19)
- https://docs.databricks.com/aws/en/agents/custom-agents/create-custom-tool (UC functions as tools)
- https://docs.databricks.com/aws/en/agents/custom-agents/agent-authentication (identity)
- https://docs.databricks.com/aws/en/agents/custom-agents/model-serving/multi-agent-genie (Genie in multi-agent)

Callable surface (REST, scope `genie`):
- Chat mode: `POST /api/2.0/genie/spaces/{space_id}/start-conversation`; `POST /api/2.0/genie/spaces/{space_id}/conversations/{conversation_id}/messages` (body: `content`, optional `enable_visualization`); `GET .../messages/{message_id}`; `GET .../messages/{message_id}/attachments/{attachment_id}/query-result`; `POST .../attachments/{attachment_id}/execute-query` (re-run when result expired); `POST .../attachments/{attachment_id}/downloads` (full result download).
- Management: `POST /api/2.0/genie/spaces` (create, with `serialized_space` JSON), `GET/PATCH/DELETE /api/2.0/genie/spaces/{space_id}`, list/delete conversations (conversation limit 200,000 per agent).
- Agent mode endpoints also exist (`/api/2.0/genie/agents/{agent_id}/conversations/{conversation_id}/responses/...`); agent-mode messages "return the answer as their only text attachment".
- Genie One API (Beta; admin must enable the preview): `POST /api/2.0/genie/one/responses`, returns `text/event-stream` (SSE); recover with `GET /api/2.0/genie/one/conversations/{conversation_id}/responses/{response_id}`. Works across all data the caller can access, grounded in Genie Ontology, "no need to set up a curated agent first".

Async: messages are "processed asynchronously"; poll Get message until COMPLETED, FAILED or CANCELLED. Status values listed: FETCHING_METADATA, FILTERING_CONTEXT, ASKING_AI, PENDING_WAREHOUSE, EXECUTING_QUERY, FAILED, COMPLETED, SUBMITTED, QUERY_RESULT_EXPIRED, CANCELLED. Docs say poll every 1 to 5 seconds, cap at 10 minutes, exponential backoff up to one minute, and implement own retry (API does not retry for you).

Outputs: attachments of type text (AI message), query (AI-generated SQL, `statement_id` for the Statement Execution API, `row_count`, `thoughts` Public Preview), visualization (`viz`). Rows come from the query-result call.

Limits stated: 200,000 conversations per agent; 50 tables/views/metric views per agent (docs recommend five or fewer); `serialized_space` string elements 25,000 chars, arrays 10,000 items; Genie One API question max 25,000 UTF-8 bytes, one active response per conversation (HTTP 409), "rate limited per workspace" with HTTP 429. A numeric requests-per-minute figure for the Genie Agent conversation API: not found on pages read (not verified).

Identity: Genie "evaluates data access with your own Unity Catalog permissions". Needs at least CAN VIEW on the Genie Agent, SELECT on UC objects, CAN USE on a pro or serverless SQL warehouse. Docs: OAuth U2M for production where a user is present, service principal (OAuth M2M) otherwise. Agent-framework side: "App authorization" (auto-created service principal) vs "User authorization" (previously On-Behalf-Of; Public Preview, admin must enable, enforces row filters and column masks).

Curation by a human: table/column descriptions in UC, synonyms, example SQL, SQL expressions/snippets (filters, measures, expressions), join specs, text instructions "only when other methods don't suffice", benchmarks; docs say start with minimal setup and iterate. Docs: "users might still receive incorrect results even with a correct API integration" if the agent is incomplete.

MCP (https://docs.databricks.com/aws/en/agents/mcp-tools/built-in-mcp-services):
- Unity Gateway MCPs: `system.ai.genie_one_mcp` (GA, "recommended for natural-language analytics"), `system.ai.dbsql` (Beta; runs specific SQL with the caller's UC and warehouse permissions), `system.ai.sandbox`, `system.ai.web_search`.
- Workspace endpoints (Public Preview; admin enables Managed MCP Servers): Genie Agent `https://<host>/api/2.0/mcp/genie/{genie_space_id}`; AI Search `/api/2.0/mcp/ai-search/{catalog}/{schema}/{index_name}`; Databricks SQL `/api/2.0/mcp/sql`; UC functions `/api/2.0/mcp/functions/{catalog}/{schema}/{function_name}`.
- Caveat quoted: workspace endpoints "bypass Unity Gateway, so they don't appear in its tracing tables or support MCP-level grants, policies, or guardrails."
- UC functions as tools in code: `UCFunctionToolkit` for LangChain/LangGraph, OpenAI, Anthropic, LlamaIndex; needs USE CATALOG, USE SCHEMA, EXECUTE; Python function creation via `client.create_python_function`. Pricing stated: UC functions use serverless general compute pricing; Databricks SQL uses DBSQL pricing.
- Genie as a sub-agent in a Custom Agent: described on the multi-agent-genie page.

Pricing: Genie One API "billed the same way as Genie One chat. See Genie pricing" (the Genie pricing page not read; amounts not verified).

Caveat: see MCP bypass above; also docs advise a new conversation per session because reuse "can reduce accuracy".

## 3. Snowflake

Sources:
- https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst
- https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst/rest-api
- https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents
- https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp
- https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-search/cortex-search-overview
- https://docs.snowflake.com/en/user-guide/views-semantic/overview
(all read 2026-11-19)

Callable surface:
- Cortex Analyst: `POST /api/v2/cortex/analyst/message`. Inputs: `messages[]` (role must be `user`, content type `text`), one of `semantic_view` (fully qualified name), `semantic_model_file` (stage path), `semantic_model` (inline YAML), or `semantic_models[]` (several; Analyst picks one), optional `stream` (SSE). Auth header plus optional `X-Snowflake-Authorization-Token-Type`.
- Output: `message.content[]` of type `text`, `sql` (`statement`, `confidence.verified_query_used` with name, question, sql, verified_at, verified_by) or `suggestion`; `warnings[]`; `response_metadata` (`model_names`, `cortex_search_retrieval`, `question_category`). Docs: the SQL "is then executed in your Snowflake virtual warehouse" by the caller; Analyst itself returns SQL. Multi-turn: pass history in `messages`.
- Cortex Agents: agent object plus `agent:run` REST API, threads for context; tools include Cortex Analyst, Cortex Search, code execution, Data to Chart, custom tools (stored procedures and UDFs), MCP connectors, analytical search (Public Preview). Agents "generate SQL over structured data using Cortex Analyst semantic views".
- Cortex Search: Search service query; the search overview page is marked "Preview Feature - Open".
- Managed MCP server: `CREATE MCP SERVER`; endpoint `https://<account_url>/api/v2/databases/{database}/schemas/{schema}/mcp-servers/{name}`; tool types CORTEX_AGENT_RUN, CODING_AGENT, CORTEX_SEARCH_SERVICE_QUERY, CORTEX_ANALYST_MESSAGE, SYSTEM_EXECUTE_SQL, GENERIC (UDF/procedure). MCP supports `tools/list` and `tools/call`. "A directly exposed Cortex Analyst tool generates SQL and returns the statement to the client." Analyst tool supports semantic views only, not semantic models.

Identity: needs SNOWFLAKE.CORTEX_USER (granted to PUBLIC by default) or SNOWFLAKE.CORTEX_ANALYST_USER database role; SELECT on tables in the semantic model, USAGE on Search services; Agents need CORTEX_USER or CORTEX_AGENT_USER plus agent and tool object privileges. MCP: OAuth 2.0 by default, External OAuth optional, no dynamic client registration; USAGE on MCP server for discovery and calls, and "Access to the MCP Server does not give access to the tools" (grant per tool). Analyst page: "fully integrates with Snowflake's role-based access control (RBAC) policies". Row access policy and masking policy behaviour is not named on the pages I read: not verified.

Curation: semantic view (business-friendly layer: facts, dimensions, metrics, relationships, verified query examples, custom instructions); YAML semantic models still supported for backward compatibility.

Limits stated: Agents REST API default 1,000 requests/minute per account with 500-request burst, shared by all agents; each agent:run counts once, including via MCP; HTTP 429 beyond. MCP recursion depth max 10. SYSTEM_EXECUTE_SQL tool `query_timeout` setting exists. Not-supported-in-SiS-warehouse-runtime note for Agents APIs. Analyst-specific numeric rate limit: not verified.

Pricing as stated: Analyst credits based on messages processed (only HTTP 200 counted); token count affects cost only when called via Cortex Agents; extra warehouse cost to execute the SQL; view usage in `CORTEX_ANALYST_USAGE_HISTORY`. Agents: orchestration by tokens, Analyst per token, Search by index size and time persisted, custom tools by warehouse. Exact credit rates sit in the Service Consumption Table (not read).

Safety: SYSTEM_EXECUTE_SQL `read_only` defaults to true; account parameter `CORTEX_MCP_SERVER_FORCE_SQL_EXEC_READ_ONLY` forces read-only. Docs recommend exposing a Cortex Agent as the only client-facing tool, because exposing SQL execution lets the client "bypass the agent's semantic views, verified queries, and orchestration". Tool annotations (readOnlyHint etc.) are "client-facing hints, not security controls". "Tool results leave Snowflake."

Caveats: Analyst has no access to results of earlier SQL queries in multi-turn, and is "limited to answering questions that can be resolved with SQL". GA/Preview status of Analyst, Agents and MCP server: status not stated in the extracted text (not verified).

## 4. Google Cloud (BigQuery, Gemini, Conversational Analytics API)

Sources:
- https://docs.cloud.google.com/gemini/data-agents/conversational-analytics-api/overview
- .../quotas, .../known-limitations, .../access-control, .../connect-mcp, .../manage-costs, .../key-concepts
- https://docs.cloud.google.com/bigquery/docs/conversational-analytics
- https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- https://docs.cloud.google.com/bigquery/docs/pre-built-tools-with-mcp-toolbox (page "Last updated 2026-11-10 UTC")
(all read 2026-11-19)

Callable surface (Conversational Analytics API, host `geminidataanalytics.googleapis.com` or regional endpoints):
- `POST /v1/projects/*/locations/*/dataAgents` (create), `.../dataAgents:createSync`, get/list/update/IAM policy endpoints, `POST /v1/projects/*/locations/*/conversations`, `POST /v1/projects/*/locations/*:chat` (three modes: conversation reference stateful; data agent reference stateless; inline context stateless), list conversations and messages, `POST /v1beta/projects/*/locations/*/conversations:queryData` (single-turn NL query for AlloyDB, Spanner, Cloud SQL; "does not support BigQuery or Looker data sources").
- Data sources: BigQuery, Looker, Data Studio; databases are Preview in v1beta. Pages carry a "Preview ... Pre-GA Offerings Terms" banner (quotas and known-limitations pages).
- Output: "a stream of messages, which can contain text, data, or charts" with citations; visualizations not supported for database sources. Supports A2A protocol (agent card endpoint).
- Remote MCP server for data agents: `https://geminidataanalytics.googleapis.com/mcp`, tools `list_data_agents`, `get_data_agent`, `chat`; 3-legged OAuth 2.0 propagates end-user credentials to BigQuery. Looker-backed agents require Looker API credentials passed in the `chat` credentials object, and docs warn not to place the client secret in prompts. Looker UI-created agents are not reachable through this server.
- BigQuery remote MCP: `https://bigquery.googleapis.com/mcp`; tools `list_dataset_ids`, `list_table_ids`, `get_dataset_info`, `get_table_info`, `execute_sql`, `execute_sql_readonly`. "The only MCP tool that isn't read-only is execute_sql" and access can be denied with a deny policy. Limits stated: 3-minute query timeout, max 3,000 rows, no Google Drive external tables. Needs MCP Tool User role (`roles/mcp.toolUser`), OAuth scopes, optional Model Armor, audit logging.
- MCP Toolbox for Databases (open source binary, run locally; documented on the BigQuery page): tools `analyze_contribution`, `ask_data_insights`, `execute_sql`, `forecast`, `get_dataset_info`, `get_table_info`, `list_dataset_ids`, `list_table_ids`, `search_catalog`; uses Application Default Credentials and a `BIGQUERY_PROJECT` env var.

Identity: IAM roles (e.g. Gemini Data Analytics Data Agent Creator/Owner, Query Data User) control access to agents, "not to the underlying data sources"; the API queries the source "by using that user's credentials".

Curation: agent system instructions, verified queries (formerly golden queries), glossary terms, authored context; BigQuery docs advise joining tables in a view and cleaning data first, and note direct (non-agent) conversations "can be less accurate".

Limits (quotas page, Preview): 1,800 API requests/min/project; 600/min/project/user; chat requests 30/min/project (each chat counts as 8 units); A2A 100/min per agent. Search scope: up to 100 datasets and 100 projects, only in stateless inline-context chats. Cost control: `big_query_max_billed_bytes` per agent plus BigQuery quotas.

Pricing as stated: "charged at BigQuery compute pricing for queries that run" (BigQuery conversational analytics page); the separate "agent pricing" page was not read (not verified).

Caveat: for database sources, "Table selection isn't a security setting"; the user's general permissions can return data from other tables.

## 5. Microsoft Fabric

Sources (read 2026-11-19):
- https://learn.microsoft.com/en-us/fabric/data-science/concept-data-agent
- https://learn.microsoft.com/en-us/fabric/data-science/data-agent-mcp-server
- https://learn.microsoft.com/en-us/fabric/fundamentals/data-agent-consumption
- https://learn.microsoft.com/en-us/fabric/data-science/fabric-data-agent-sdk (Python SDK, preview)
- https://learn.microsoft.com/en-us/fabric/data-science/data-agent-foundry (preview), .../data-agent-microsoft-copilot-studio (preview)

Surface: a published data agent "becomes an MCP server that exposes a single MCP tool"; the published description becomes the tool description. URL: `https://api.fabric.microsoft.com/v1/mcp/workspaces/{WorkspaceId}/dataagents/{DataAgentId}/agent`. Streamable HTTP; client must send a Fabric bearer token (user or service principal), no dynamic client registration. Long runs: MCP tasks extension (`tasks/get`, `tasks/cancel`). Python example uses `mcp` and `azure-identity`. The page states it is not a plain REST API. Foundry and Copilot Studio consumption are preview; Foundry needs workspace-id and artifact-id of the published agent.

Behaviour: NL to SQL (lakehouse/warehouse), NL to DAX (semantic models), NL to KQL (KQL databases); read queries only. Concept page says "generally available feature". Prerequisites: paid F2 or higher (or P1+) capacity, cross-geo AI settings enabled, read access to a data source. Up to five data sources, up to 100 example queries per source.

Identity: uses requesting user's credentials and permissions; Purview policies (preview) constrain; RLS and CLS apply for semantic models; Read permission on the model suffices.

Curation: data source and table selection, agent instructions, example question-query pairs; Git integration and deployment pipelines for the agent config.

Limits stated: responses capped at 25 rows and 25 columns ("designed for conversational insights rather than for returning complete datasets"); English only; capacity region must match data source region; cross-geo processing needed.

Pricing as stated: 100 CU-seconds per 1,000 input tokens, 10 for cached input, 400 for output; generated query execution billed separately to the query engine item; "Copilot for data" generally (Fabric copilots) are separate preconfigured assistants with less customization (concept page). Rates "subject to change" per search summary only; not verified on the page.

Azure SQL / other Azure options: not researched beyond Fabric and Foundry/Copilot Studio consumption (not verified).

## 6. AWS

Sources (read 2026-11-19):
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_GenerateQuery.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-generate-query.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-prereq-structured.html
- https://docs.aws.amazon.com/quick/latest/userguide/embedding-gen-bi.html
- https://awslabs.github.io/mcp/servers/redshift-mcp-server (AWS Labs, open source)

Surface: `POST /generateQuery` (bedrock-agent-runtime `GenerateQuery`). Request: `queryGenerationInput {text, type}`, `transformationConfiguration {mode: TEXT_TO_SQL, textToSqlConfiguration {type: KNOWLEDGE_BASE, knowledgeBaseConfiguration {knowledgeBaseArn}}}`. Response: `queries[] {sql, type}`. It returns SQL only; execution is by the caller. Structured-store knowledge bases are also queried through Retrieve, RetrieveAndGenerate (uses GenerateQuery internally), InvokeAgent. Queries "must be written in English".
Limits: GenerateQuery quota 2 requests/second; with InvokeAgent/RetrieveAndGenerate only 10 retrieved results used.
Identity/safety: knowledge base service role executes Redshift Data API statements (`redshift-data:ExecuteStatement`); caller needs `bedrock:GenerateQuery` etc. AWS: "Executing arbitrary SQL queries can be a security risk ... use restricted roles, read-only databases, and sandboxing." Accuracy "can vary"; evaluate generated queries. Cross-Region inference used, "doesn't incur any additional charges".
Curation: per search summary (not verified on fetched page text): optional table/column descriptions and `curatedQueries` in QueryGenerationContext.
Pricing for GenerateQuery: not verified.
Amazon Quick (QuickSight): the documented developer path is embedding (`GenerateEmbedUrlForRegisteredUser` with a Generative Q&A experience and a topic ID) which yields a UI, not an answer payload for an agent. I did not find a documented callable API returning answers for Quick agents/chat (search summary only; not verified). Athena has no NL-to-SQL API found.
Redshift MCP server (AWS Labs): tools `list_clusters`, `list_databases`, `list_schemas`, `list_tables`, `list_columns`, `execute_query`; read-only by default (`ACCESS_MODE=read-only`, single statement, writes rejected), `read-write` opt-in with per-write confirmation, `MAX_RESULT_ROWS` default 1000; docs: "The database user's privileges are the security boundary, not this server."

## 7. Open-source and vendor MCP database servers

- PostgreSQL reference server: https://raw.githubusercontent.com/modelcontextprotocol/servers-archived/main/src/postgres/README.md (repo name says "servers-archived"). One tool `query` (`sql`), "executed within a READ ONLY transaction"; schema exposed as resources. Read 2026-11-19.
- ClickHouse Cloud remote MCP: https://clickhouse.com/docs/products/cloud/features/ai-ml/mcp/remote-mcp ; tools `get_services_list`, `list_databases`, `list_tables`, `run_select_query` ("only permits SELECT statements"); OAuth uses the signed-in user's SQL console role; API-key use needs endpoint binding. Read 2026-11-19.
- MongoDB MCP Server: https://www.mongodb.com/docs/mcp-server/ ; landing page says query, explore and manage (CRUD, admin); tool list and read-only setting not read (not verified).
- Official from cloud vendors: BigQuery remote MCP, Snowflake managed MCP, Databricks managed MCP, Fabric data agent MCP, AWS Labs Redshift MCP (above).

## 8. Cross-platform patterns

- Semantic layer or curated context is required or strongly advised on every platform: Genie Agent config, Snowflake semantic view, Google data agent context, Fabric agent instructions and examples, Bedrock KB table descriptions.
- Identity passthrough is the stated default: Databricks (user UC permissions, OAuth U2M), Google (user credentials, 3-legged OAuth), Fabric (requesting user), Snowflake (calling role). Service-principal paths exist on Databricks and Fabric and Snowflake PAT. AWS uses a service role.
- Async or streamed delivery: Databricks poll, Snowflake/Google/Databricks One stream, Fabric MCP tasks. Only AWS GenerateQuery and the Analyst non-stream mode are plain synchronous.
- Two shapes: "SQL generator" (Snowflake Analyst, Bedrock GenerateQuery; caller executes) versus "answer service" (Genie, Google CA API, Fabric agent; platform executes and returns text/data/charts).
- Read-only is a configuration, not universal: Snowflake `read_only` default true; BigQuery `execute_sql_readonly`; Redshift MCP default read-only; Fabric agent generates read queries only; Postgres reference READ ONLY transaction. Vendors repeatedly say privileges on the database identity are the real boundary.
- Result size caps: Fabric 25x25, BigQuery MCP 3,000 rows, Redshift MCP 1,000 rows, Bedrock 10 retrieved results.
- Rate limits are tight for chat-type calls: Google 30 chat/min/project, Bedrock 2 rps, Snowflake 1,000/min/account.

## 9. Build versus buy: facts that bear on the decision (docs only, no opinion)

- [Cost] Snowflake Analyst bills per message plus warehouse; Databricks Genie One API bills as Genie One chat; BigQuery bills query compute; Fabric bills tokens in CU-seconds plus query engines. All also bill the underlying query compute.
- [Curation effort] Databricks says the creator should be a SQL-proficient analyst and iterate with benchmarks; Snowflake and Google require authored semantic views, verified queries or context.
- [Accuracy disclaimers] AWS, Google ("validate all output"), Snowflake and Databricks each state output can be wrong; Bedrock says evaluate generated queries.
- [Governance] Databricks workspace MCP endpoints bypass Unity Gateway; Snowflake advises one governed agent tool rather than raw SQL; Google table selection is not a security control.
- [Lock-in/placement] Each service queries only its own platform's data (Fabric sources, BigQuery/Looker/Spanner/Cloud SQL, Snowflake objects, Redshift/Glue, UC tables). Cross-region and cross-geo processing settings apply (Snowflake cross-region inference, Fabric cross-geo AI, Bedrock cross-Region inference).
- [Status] Google CA API pages carry a Preview banner; Databricks Genie One API is Beta and workspace MCP endpoints Public Preview; Fabric SDK, Foundry and Copilot Studio paths are preview; Fabric data agent itself is stated GA.
- [Open alternative] Open MCP servers (Postgres reference, Redshift, ClickHouse) expose schema listing plus read-only SQL execution, so the model writes SQL itself; they do not provide a semantic layer.

## 10. What I could not verify

- Databricks: numeric rate limit for the Genie Agent conversation API; Genie pricing amounts; Genie Agent MCP tool names; Unity Catalog function execution limits.
- Snowflake: GA/Preview status of Analyst, Agents and managed MCP; row access / masking policy behaviour explicitly for Analyst; Analyst request limits; credit rates (Service Consumption Table not read); Cortex Search limits.
- Google: GA status of the CA API (pages say Preview); "agent pricing" page; BigQuery data agent quotas; exact outputs of Toolbox `ask_data_insights`.
- Fabric: Azure SQL and Azure SQL "Copilot" natural-language options; whether CU rates are current beyond the page text read; Fabric data agent API for non-MCP REST use (page says not plain REST).
- AWS: GenerateQuery pricing; curation fields (from search summary only); any Amazon Quick agent/chat API returning answers; Athena NL-to-SQL; Bedrock Managed Knowledge Base alternative.
- MongoDB MCP tool list and read-only flag; Supabase, Neon and other community servers not researched.
- Genie, Cortex Analyst and other accuracy benchmarks: not read; no accuracy figures are claimed here.

