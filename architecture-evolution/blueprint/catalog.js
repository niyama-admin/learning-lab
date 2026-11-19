window.ARCHITECTURE_CATALOG = {
  profiles: {
    scale: ["Pilot", "Regional", "National/global"],
    reliability: ["Standard", "High", "Mission-critical"],
    latency: ["Relaxed", "Interactive", "Low"]
  },
  layers: [
    {
      id: "experience",
      name: "Experience",
      description: "User and system touchpoints",
      components: [
        {
          id: "web-ui",
          name: "Web interface",
          summary: "Browser-based presentation, interaction, and accessibility boundary.",
          options: [
            { name: "Server-rendered web", examples: "Laravel Blade, Rails, Django, Spring MVC", scale: 3, reliability: 3, latency: 3, note: "A strong default when interaction complexity is moderate and server ownership is desirable." },
            { name: "Single-page application", examples: "React, Vue, Angular", scale: 3, reliability: 3, latency: 2, note: "Useful for rich client interaction; adds client-state, API, and delivery complexity." },
            { name: "Static or edge-rendered web", examples: "Astro, Next.js static output, CDN-hosted HTML", scale: 3, reliability: 3, latency: 3, note: "Fits content-heavy experiences and read-dominant flows with limited server interaction." }
          ]
        },
        {
          id: "mobile",
          name: "Mobile experience",
          summary: "Mobile delivery, device capabilities, offline behavior, and app lifecycle.",
          options: [
            { name: "Progressive web application", examples: "Standards-based PWA", scale: 3, reliability: 2, latency: 2, note: "Reduces delivery overhead but has uneven access to native capabilities and background execution." },
            { name: "Cross-platform application", examples: "Flutter, React Native", scale: 3, reliability: 3, latency: 2, note: "Balances shared implementation with deeper device integration." },
            { name: "Native application", examples: "Swift, Kotlin", scale: 3, reliability: 3, latency: 3, note: "Best control over device performance and capabilities at the highest delivery cost." }
          ]
        },
        {
          id: "channels",
          name: "Assisted channels",
          summary: "Messaging, email, voice, and human-service interaction surfaces.",
          options: [
            { name: "Messaging provider APIs", examples: "WhatsApp Business, Teams, Slack adapters", scale: 3, reliability: 2, latency: 2, note: "Provider delivery guarantees and rate limits remain external dependencies." },
            { name: "Email and SMS providers", examples: "SMTP service, transactional email, SMS gateway", scale: 3, reliability: 2, latency: 1, note: "Appropriate for asynchronous notifications, not strict interactive latency." },
            { name: "Contact-center platform", examples: "Cloud contact center with bot and agent handoff", scale: 3, reliability: 3, latency: 2, note: "Adds governed routing and human escalation with material integration and operating cost." }
          ]
        }
      ]
    },
    {
      id: "access",
      name: "Edge and access",
      description: "Traffic protection, identity, and policy",
      components: [
        {
          id: "edge-delivery",
          name: "Edge delivery",
          summary: "Ingress, content delivery, web protection, and traffic termination.",
          options: [
            { name: "Managed CDN and WAF", examples: "Cloudflare, Front Door, CloudFront", scale: 3, reliability: 3, latency: 3, note: "Provides globally distributed protection and caching with provider dependency." },
            { name: "Self-managed reverse proxy", examples: "NGINX, Envoy, HAProxy", scale: 2, reliability: 2, latency: 3, note: "Offers control but shifts capacity, patching, failover, and DDoS operations to the team." },
            { name: "Platform ingress", examples: "Kubernetes ingress or gateway implementation", scale: 3, reliability: 3, latency: 3, note: "Fits a mature container platform with tested multi-zone operation." }
          ]
        },
        {
          id: "api-gateway",
          name: "API gateway",
          summary: "API routing, authentication enforcement, quotas, transformation, and observability.",
          options: [
            { name: "Managed API gateway", examples: "Azure API Management, AWS API Gateway, Apigee", scale: 3, reliability: 3, latency: 2, note: "Reduces platform operations and adds policy capabilities; validate added request latency." },
            { name: "Gateway platform", examples: "Kong, Tyk, Gravitee", scale: 3, reliability: 3, latency: 3, note: "Flexible and portable with a meaningful control-plane and upgrade burden." },
            { name: "Lightweight reverse proxy", examples: "NGINX, Envoy", scale: 2, reliability: 2, latency: 3, note: "Fits simpler routing needs but requires custom governance for API products and policies." }
          ]
        },
        {
          id: "identity",
          name: "Identity and access",
          summary: "Authentication, federation, authorization inputs, and identity lifecycle.",
          options: [
            { name: "Managed OIDC identity", examples: "Microsoft Entra ID, Auth0, Cognito", scale: 3, reliability: 3, latency: 3, note: "Preferred when provider controls, residency, and commercial terms meet requirements." },
            { name: "Self-hosted identity platform", examples: "Keycloak", scale: 3, reliability: 3, latency: 3, note: "Supports control and portability but makes identity availability and security an internal responsibility." },
            { name: "Application-managed sessions", examples: "Framework session and local account store", scale: 1, reliability: 1, latency: 2, note: "Suitable only for constrained pilots without federation or complex identity lifecycle needs." }
          ]
        }
      ]
    },
    {
      id: "application",
      name: "Application",
      description: "Business behavior and integration",
      components: [
        {
          id: "api-backend",
          name: "API and services",
          summary: "Business capabilities, transaction boundaries, and externally visible service contracts.",
          options: [
            { name: "Modular monolith", examples: "Laravel, Spring Boot, .NET, Django", scale: 3, reliability: 3, latency: 3, note: "A strong default when module boundaries and deployment discipline are maintained." },
            { name: "Independently deployed services", examples: "Service-oriented or microservice architecture", scale: 3, reliability: 3, latency: 2, note: "Justified by independent change, scaling, ownership, or isolation—not scale alone." },
            { name: "Function-oriented backend", examples: "Functions or Lambda with managed services", scale: 3, reliability: 2, latency: 2, note: "Fits event-driven and bursty workloads; validate cold starts, limits, and local operability." }
          ]
        },
        {
          id: "workflow",
          name: "Workflow and jobs",
          summary: "Long-running processes, schedules, retries, approvals, and durable state transitions.",
          options: [
            { name: "In-process scheduler and queue", examples: "Framework jobs, cron, worker queue", scale: 1, reliability: 1, latency: 2, note: "Simple for low-consequence work; durability and recovery behavior must be explicit." },
            { name: "Durable workflow engine", examples: "Temporal, cloud durable functions", scale: 3, reliability: 3, latency: 2, note: "Fits code-centric long-running processes with retries and observable state." },
            { name: "BPMN workflow platform", examples: "Camunda and comparable engines", scale: 3, reliability: 3, latency: 1, note: "Fits governed human and system processes where explicit models matter more than sub-second response." }
          ]
        },
        {
          id: "integration",
          name: "Integration",
          summary: "Coupling and data exchange with internal and external systems.",
          options: [
            { name: "Direct synchronous APIs", examples: "REST, GraphQL, gRPC", scale: 2, reliability: 2, latency: 3, note: "Simple and immediate, but dependency failures and temporal coupling require explicit handling." },
            { name: "Queues and event streams", examples: "Kafka, Event Hubs, Service Bus, RabbitMQ", scale: 3, reliability: 3, latency: 2, note: "Adds buffering and decoupling with delivery, ordering, schema, and replay responsibilities." },
            { name: "Integration platform", examples: "Managed iPaaS or enterprise integration suite", scale: 3, reliability: 3, latency: 1, note: "Useful for connector-heavy workflows; evaluate cost, lock-in, throughput, and debugging." }
          ]
        }
      ]
    },
    {
      id: "intelligence",
      name: "AI capabilities",
      description: "Probabilistic reasoning and knowledge",
      components: [
        {
          id: "llm-orchestration",
          name: "LLM orchestration",
          summary: "Model routing, tools, agents, policy gates, retries, tracing, and human approval.",
          options: [
            { name: "Direct model SDK", examples: "Provider SDK behind an application service", scale: 1, reliability: 1, latency: 2, note: "Fits experiments and narrow use cases; application code owns policy, fallback, and observability." },
            { name: "Workflow orchestration", examples: "Semantic Kernel, LangGraph, durable custom workflow", scale: 2, reliability: 2, latency: 2, note: "Fits multi-step model and tool workflows with explicit state and evaluation." },
            { name: "AI gateway plus orchestrator", examples: "Governed gateway, model router, workflow engine", scale: 3, reliability: 3, latency: 2, note: "Supports multi-model governance and resilience; every hop must justify its latency and cost." }
          ]
        },
        {
          id: "rag",
          name: "Retrieval and grounding",
          summary: "Authoritative corpus ingestion, retrieval, citations, access filters, and evaluation.",
          options: [
            { name: "Relational full-text retrieval", examples: "PostgreSQL full-text with metadata filters", scale: 1, reliability: 2, latency: 2, note: "A pragmatic start for small, structured corpora and modest semantic-retrieval needs." },
            { name: "Search and vector service", examples: "OpenSearch, Elasticsearch, Azure AI Search", scale: 3, reliability: 3, latency: 3, note: "Supports hybrid retrieval and scale with index lifecycle and relevance-engineering work." },
            { name: "Lakehouse retrieval pipeline", examples: "Object storage, table format, embedding and search serving", scale: 3, reliability: 2, latency: 1, note: "Fits very large or multiformat corpora; requires a separate low-latency serving strategy." }
          ]
        },
        {
          id: "memory",
          name: "Memory",
          summary: "Permitted continuity across turns, sessions, workflows, and user relationships.",
          options: [
            { name: "Conversation-scoped store", examples: "Relational or document session history", scale: 2, reliability: 2, latency: 3, note: "Good default for bounded session continuity with explicit retention." },
            { name: "Dedicated memory service", examples: "Memory API with policy, ranking, expiry, and audit", scale: 3, reliability: 3, latency: 2, note: "Fits shared cross-channel memory when consent and correction controls are mature." },
            { name: "System-of-record personalization", examples: "CRM or profile service with approved attributes", scale: 3, reliability: 3, latency: 3, note: "Use authoritative attributes rather than model inference for consequential personalization." }
          ]
        }
      ]
    },
    {
      id: "agent-runtime",
      name: "Agent runtime",
      description: "Loop, sessions, isolation, and the data an agent keeps",
      components: [
        {
          id: "agent-loop",
          name: "Agent loop: own it or adopt a framework",
          summary: "Who owns the turn loop, the session log, the permission gate, and cancellation. Evidence: the loop is about a hundred lines; most of a production harness is around it.",
          options: [
            { name: "Own loop on provider SDKs", examples: "About 100 lines plus conformance tests; official model SDKs and an MCP SDK", scale: 3, reliability: 3, latency: 3, note: "Full control of the log, permissions, and cancellation. You build durability, tracing, and approvals. The default when the runtime is the product." },
            { name: "Thin framework library", examples: "Vercel AI SDK, OpenAI Agents SDK, PydanticAI", scale: 3, reliability: 2, latency: 3, note: "Saves provider adapters, schema generation, and an MCP client. Keep it behind an interface: several ship breaking changes monthly (pre-1.0 or fast majors)." },
            { name: "Durable graph or workflow framework", examples: "LangGraph, Mastra, Microsoft Agent Framework, Google ADK", scale: 3, reliability: 3, latency: 2, note: "Checkpoints, pause and resume, and approvals as features. Heavy dependency trees and framework-shaped state; hard-kill durability was not verified." },
            { name: "Embedded vendor harness", examples: "Claude Agent SDK (one Claude Code process per session)", scale: 2, reliability: 2, latency: 2, note: "Inherits a mature permission and compaction system. A closed binary of about 354 MB, one model family, and near-daily releases." }
          ]
        },
        {
          id: "agent-execution-model",
          name: "Session execution model",
          summary: "How concurrent sessions share CPU. The language runtime's threading model decides what one busy session can do to the others.",
          options: [
            { name: "One session per process", examples: "Local agents; the Claude Agent SDK", scale: 1, reliability: 3, latency: 3, note: "Crash and memory isolation for free. Footprint grows with sessions." },
            { name: "Many sessions on one event loop", examples: "Node, Python asyncio", scale: 2, reliability: 2, latency: 2, note: "Node has no global lock, but runs JavaScript on one thread per process: a long CPU task stalls every session in it (Python adds the GIL). Fine while the work is I/O; offload CPU work. Measure the noisy-neighbour case." },
            { name: "Shared-memory threads or lightweight tasks", examples: "Go, Rust, Java virtual threads, C#", scale: 3, reliability: 2, latency: 3, note: "Uses all cores; a CPU-heavy session does not stall the others. Shared mutable state needs care (Rust rejects data races at compile time) and one crash can take the process down." },
            { name: "Worker pool behind a queue", examples: "Background and long-running tasks", scale: 3, reliability: 3, latency: 1, note: "Durable, scalable, retryable, but not interactive. Combine with one of the above for chat." }
          ]
        },
        {
          id: "agent-sandbox",
          name: "Isolation for commands and generated code",
          summary: "What stops a model-chosen command or generated code from harming the host. Needed whenever the agent can execute.",
          options: [
            { name: "In-process interpreter with an allow-list", examples: "smolagents local executor", scale: 1, reliability: 1, latency: 3, note: "Not a security boundary. In a test, an authorised os module let os.system write a file, and a 2-second timeout took 8 seconds. Trusted input only." },
            { name: "OS sandbox primitives", examples: "Landlock, seccomp, macOS seatbelt", scale: 2, reliability: 2, latency: 3, note: "Direct and fast, one implementation per operating system. Codex and Gemini CLI ship a native sandbox for all three desktop systems." },
            { name: "Container per session or task", examples: "Docker, Podman", scale: 2, reliability: 3, latency: 2, note: "Strong isolation if configured. Defaults can add no resource or capability limits, so set them explicitly." },
            { name: "Hosted sandbox or microVM service", examples: "E2B, Modal and similar", scale: 3, reliability: 3, latency: 2, note: "Strongest isolation and elastic capacity. Adds a service dependency, cost, and a network hop." }
          ]
        },
        {
          id: "agent-state-store",
          name: "Conversation history and state",
          summary: "The append-only session log, snapshots, resume, and fork. Cross-session personalization belongs under Memory. Compaction is a read-time view over an unchanged log.",
          options: [
            { name: "JSONL file per session", examples: "Claude Code transcripts", scale: 1, reliability: 1, latency: 3, note: "Zero operations and human-readable. One writer, no cross-session queries, retention and erasure by hand." },
            { name: "Embedded SQL", examples: "SQLite, libSQL", scale: 1, reliability: 2, latency: 3, note: "ACID with JSON functions and one writer. The default in several frameworks that were run (LangGraph, ADK, Mastra). An executed example showed a sequence number as the concurrency token, idempotent tool calls, compaction as a view, and fork." },
            { name: "Relational server with JSON columns", examples: "PostgreSQL", scale: 2, reliability: 3, latency: 3, note: "Transactions across events and an outbox, SQL audit across sessions, row-level tenant isolation. One primary limits write scale." },
            { name: "Document or key-value database", examples: "MongoDB, DynamoDB, Firestore, Cosmos DB", scale: 3, reliability: 3, latency: 3, note: "Horizontal scale and managed multi-region. Design the ordered append deliberately (partition by session, sort by sequence, conditional writes); cross-session queries need indexes or export. Offered as a backend by ADK, Microsoft Agent Framework, the OpenAI Agents SDK and Spring AI; not evaluated here." }
          ]
        },
        {
          id: "agent-data-access",
          name: "Access to business data sources",
          summary: "How the agent reaches systems of record. Whatever the pattern, retrieved content is untrusted input: documents can carry instructions aimed at the model.",
          options: [
            { name: "Query in place through a tool", examples: "MCP server or API connector, live", scale: 2, reliability: 2, latency: 2, note: "Always fresh and permission-faithful when the source is. Latency and load fall on the source." },
            { name: "Indexed copy in a knowledge store", examples: "Search or vector index fed from the source", scale: 3, reliability: 3, latency: 3, note: "Fast semantic search. Stale by construction, and a second copy of sensitive data with its own permissions, residency, and erasure duties." },
            { name: "Hybrid: index to discover, fetch live on use", examples: "Index for retrieval, connector for the current record", scale: 3, reliability: 3, latency: 2, note: "The usual best answer for documents. Two paths to build and test." }
          ]
        },
        {
          id: "agent-analytics-access",
          name: "Analytics and warehouse questions",
          summary: "How the agent answers a business question from warehouse data. Public benchmarks are weak evidence (best agent 21.36% on Spider 2.0; 52.8% annotation errors reported for BIRD Mini-Dev), and no independent study evaluates the vendor services. Own the semantic layer, a gold evaluation set, and the tool interface; run every option behind the same adapter. See the data-access pattern.",
          options: [
            { name: "Certified function or approved metric", examples: "Reviewed parameterised query, stored procedure, Unity Catalog function, metrics API", scale: 3, reliability: 3, latency: 3, note: "No model-written SQL, so the safest and most predictable path for numbers that drive decisions. Covers only the questions someone curated." },
            { name: "Managed answer service", examples: "Databricks Genie, Fabric data agent, Google Conversational Analytics API", scale: 2, reliability: 2, latency: 2, note: "Vendor model writes, runs and explains. Needs curated context; documented caps (Fabric 25 rows by 25 columns; Google 30 chat calls per minute) and async or streaming delivery. Queries only its own platform. No independent accuracy study found; several parts are Preview." },
            { name: "Managed SQL generator", examples: "Snowflake Cortex Analyst, Amazon Bedrock GenerateQuery", scale: 2, reliability: 2, latency: 2, note: "Returns SQL; you execute, validate and cap it, which keeps the boundary in your hands. Needs a semantic model or curated knowledge base. Per-message or per-request limits and cost." },
            { name: "Own NL2SQL over a semantic layer", examples: "Open or hosted model, schema selection, execution-feedback repair, voting", scale: 2, reliability: 2, latency: 1, note: "Works across platforms and with open models, and you control evaluation and access. Most to build. Staged agents cost several model calls per question (about 3.5 per candidate in one study)." },
            { name: "Free-form read-only SQL tool", examples: "Reference Postgres or ClickHouse MCP server; run_readonly_sql", scale: 1, reliability: 1, latency: 2, note: "Prototype default. No semantic layer, and read-only is configuration: the database role is the boundary. Add row, time and cost caps and a query validator before real data." }
          ]
        },
        {
          id: "agent-language",
          name: "Implementation language",
          summary: "Capacity bands do not separate these: an agent loop is I/O-bound, so every option passes at every band. Decide by deployment shape, official SDKs, protocol SDK tier, packaging, sandboxing, and team. See the selection method.",
          options: [
            { name: "Python", examples: "asyncio; richest model and evaluation ecosystem", scale: 3, reliability: 3, latency: 3, note: "Fastest iteration; five of eleven studied harnesses. Global interpreter lock and one thread per event loop: isolate CPU work. Awkward to ship without an interpreter." },
            { name: "TypeScript on Node", examples: "Claude Code, Gemini CLI, OpenCode", scale: 3, reliability: 3, latency: 3, note: "Five of eleven studied harnesses; official Anthropic SDK and a Tier 1 MCP SDK. Needs Node or a bundled runtime; one JavaScript thread per process, so use process-per-session." },
            { name: "Go", examples: "Gateways and orchestrators", scale: 3, reliability: 3, latency: 3, note: "Cheap concurrency, context cancellation, one static binary, Tier 1 MCP SDK. No sum types for the state machine." },
            { name: "Rust", examples: "Codex", scale: 3, reliability: 3, latency: 3, note: "Single binary, memory safety, direct OS sandbox access, Tier 1 MCP SDK. No official Anthropic SDK; slowest to iterate." },
            { name: "C#", examples: ".NET services; Microsoft Agent Framework", scale: 3, reliability: 3, latency: 3, note: "Official Anthropic SDK and Tier 1 MCP SDK; best when the platform is .NET. Smaller agent open-source community." },
            { name: "Java", examples: "Spring AI, LangChain4j, virtual threads", scale: 3, reliability: 3, latency: 3, note: "Best when the platform is the JVM. The MCP SDK is Tier 2, behind the others on protocol features." }
          ]
        }
      ]
    },
    {
      id: "data",
      name: "Data",
      description: "Transactional state and analytical history",
      components: [
        {
          id: "operational-store",
          name: "Operational store",
          summary: "Authoritative transactional state, consistency, recovery, and concurrency.",
          options: [
            { name: "Self-managed relational database", examples: "PostgreSQL, MySQL", scale: 2, reliability: 2, latency: 3, note: "Powerful and portable; the team owns high availability, patching, backup, and recovery." },
            { name: "Managed relational database", examples: "Managed PostgreSQL, MySQL, or SQL service", scale: 3, reliability: 3, latency: 3, note: "A strong default when service limits, topology, residency, and commercial terms fit." },
            { name: "Distributed SQL database", examples: "CockroachDB, Spanner-class service", scale: 3, reliability: 3, latency: 2, note: "Justified by multi-region consistency or horizontal write scale; evaluate latency and complexity." }
          ]
        },
        {
          id: "cache",
          name: "Cache",
          summary: "Latency reduction, load shielding, sessions, ephemeral state, and invalidation.",
          options: [
            { name: "In-process cache", examples: "Application memory and bounded local caches", scale: 1, reliability: 1, latency: 3, note: "Very low latency with weak sharing and consistency across instances." },
            { name: "Self-managed distributed cache", examples: "Redis-compatible cluster", scale: 2, reliability: 2, latency: 3, note: "Provides shared low-latency state while shifting failover and persistence operations to the team." },
            { name: "Managed distributed cache", examples: "Managed Redis-compatible service", scale: 3, reliability: 3, latency: 3, note: "Reduces operational burden; validate network topology, failover, persistence, and cost." }
          ]
        },
        {
          id: "analytics",
          name: "Analytics platform",
          summary: "Historical data, governed measures, dashboards, exploration, and advanced analytics.",
          options: [
            { name: "Read replica or extracts plus BI", examples: "SQL replica, scheduled extracts, Metabase or Power BI", scale: 1, reliability: 1, latency: 2, note: "Fits small operational reporting but offers limited history and governance." },
            { name: "Data warehouse", examples: "Cloud warehouse or analytical relational platform", scale: 3, reliability: 3, latency: 2, note: "Strong for governed SQL, certified metrics, dashboards, and statutory reporting." },
            { name: "Lakehouse or hybrid", examples: "Object storage, open tables, SQL engines, warehouse serving", scale: 3, reliability: 2, latency: 1, note: "Fits high-volume, streaming, multiformat, AI, and ML workloads with greater platform complexity." }
          ]
        }
      ]
    },
    {
      id: "compute",
      name: "Compute",
      description: "Execution, hosting, and scaling responsibility",
      components: [
        {
          id: "compute-abstraction",
          name: "Execution abstraction",
          summary: "The unit that executes application code and the infrastructure detail exposed to the team.",
          options: [
            { name: "Serverless functions", examples: "Azure Functions, AWS Lambda, Google Cloud Functions", scale: 3, reliability: 2, latency: 2, note: "Fits event-driven and bursty work; validate cold starts, duration, concurrency, networking, and portability limits." },
            { name: "Managed application platform", examples: "App Service, Cloud Run, Heroku-class PaaS", scale: 3, reliability: 3, latency: 3, note: "A strong default for request-serving applications when the supported runtime and networking model fit." },
            { name: "Managed container runtime", examples: "Container Apps, ECS/Fargate, managed container services", scale: 3, reliability: 3, latency: 3, note: "Adds image portability and workload control without requiring the team to operate the full scheduler." },
            { name: "Virtual machines", examples: "Hardened VM images, VM scale sets, autoscaling groups", scale: 3, reliability: 3, latency: 3, note: "Fits legacy, specialized, or highly controlled runtimes; the team owns more operating-system and capacity lifecycle work." },
            { name: "Bare-metal process runtime", examples: "Physical hosts with system services or a process supervisor", scale: 2, reliability: 2, latency: 3, note: "Reserve for hardware, licensing, isolation, or deterministic-performance requirements supported by evidence." }
          ]
        },
        {
          id: "hosting-model",
          name: "Hosting responsibility",
          summary: "Where compute runs and which party owns infrastructure availability, patching, capacity, and recovery.",
          options: [
            { name: "Provider-managed cloud service", examples: "Managed serverless, PaaS, database, and container services", scale: 3, reliability: 3, latency: 3, note: "Prefer when residency, service limits, commercial terms, and the provider responsibility model satisfy the scenarios." },
            { name: "Customer-managed public cloud", examples: "Customer-operated VMs or Kubernetes in a cloud account", scale: 3, reliability: 3, latency: 3, note: "Provides configuration control while retaining elastic infrastructure; requires mature platform and security operations." },
            { name: "Private cloud or on-premises", examples: "VMware, OpenStack, OpenShift, self-hosted Kubernetes", scale: 3, reliability: 3, latency: 3, note: "Fits sovereignty, legacy integration, or control requirements only when capacity and recovery ownership are funded." },
            { name: "Edge or branch hosting", examples: "Appliance, edge Kubernetes, ruggedized or disconnected node", scale: 2, reliability: 2, latency: 3, note: "Fits local processing, intermittent connectivity, or strict proximity needs; design synchronization and remote operations explicitly." }
          ]
        },
        {
          id: "compute-control-plane",
          name: "Scaling and scheduling",
          summary: "How capacity is allocated, workloads are placed, failures are recovered, and utilization is controlled.",
          options: [
            { name: "Platform-managed autoscaling", examples: "Function, PaaS, or managed container autoscaling", scale: 3, reliability: 3, latency: 2, note: "Minimizes capacity operations; verify scaling signals, warm capacity, quotas, and failure behavior." },
            { name: "VM groups and image automation", examples: "VM scale sets, autoscaling groups, immutable images", scale: 3, reliability: 3, latency: 3, note: "Fits VM-bound workloads when image, patch, health, scaling, and replacement automation are mature." },
            { name: "Managed container orchestration", examples: "Managed Kubernetes or provider container scheduler", scale: 3, reliability: 3, latency: 3, note: "Fits diverse container workloads when scheduling and platform capabilities justify its complexity." },
            { name: "Self-hosted orchestration", examples: "Self-managed Kubernetes, OpenShift, Nomad, batch scheduler", scale: 3, reliability: 3, latency: 3, note: "Choose only when control requirements and platform capability justify ownership of the control plane and upgrades." },
            { name: "Static or manually managed capacity", examples: "Fixed VM or physical-host pool", scale: 1, reliability: 1, latency: 3, note: "Acceptable for constrained pilots or stable isolated workloads with explicit spare capacity and recovery procedures." }
          ]
        }
      ]
    },
    {
      id: "platform",
      name: "Platform",
      description: "Delivery, observability, and operations",
      components: [
        {
          id: "observability",
          name: "Observability",
          summary: "Metrics, logs, traces, profiles, alerts, service levels, and operational evidence.",
          options: [
            { name: "Centralized logs and basic metrics", examples: "Structured logs, host metrics, alert rules", scale: 1, reliability: 1, latency: 1, note: "Minimum viable operations; insufficient for complex distributed or mission-critical systems." },
            { name: "OpenTelemetry observability stack", examples: "OpenTelemetry with metrics, logs, and traces backends", scale: 3, reliability: 3, latency: 3, note: "Portable instrumentation with platform and data-lifecycle responsibilities." },
            { name: "Managed APM and security analytics", examples: "Managed APM, log analytics, SIEM integration", scale: 3, reliability: 3, latency: 3, note: "Accelerates operations; control telemetry volume, sensitive data, retention, and cost." }
          ]
        },
        {
          id: "delivery",
          name: "Delivery and configuration",
          summary: "Build, test, security, infrastructure, release, configuration, secrets, and rollback.",
          options: [
            { name: "Scripted deployment", examples: "Versioned scripts with manual approval", scale: 1, reliability: 1, latency: 1, note: "Suitable for pilots only when rollback and audit evidence remain explicit." },
            { name: "CI/CD and infrastructure as code", examples: "Pipeline, policy checks, IaC, secret manager", scale: 3, reliability: 3, latency: 2, note: "Baseline for repeatable environments and governed production change." },
            { name: "Progressive delivery platform", examples: "GitOps, canary analysis, feature flags, paved roads", scale: 3, reliability: 3, latency: 3, note: "Fits frequent, high-consequence change when platform investment and ownership are justified." }
          ]
        }
      ]
    }
  ]
};
