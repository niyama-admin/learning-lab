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
      id: "platform",
      name: "Platform",
      description: "Runtime, delivery, and operations",
      components: [
        {
          id: "runtime",
          name: "Application runtime",
          summary: "Compute placement, scaling, isolation, scheduling, and deployment unit.",
          options: [
            { name: "Virtual machines", examples: "Hardened VM images with autoscaling", scale: 2, reliability: 2, latency: 3, note: "Fits legacy and specialized workloads; the team owns more operating-system lifecycle work." },
            { name: "Managed application or container platform", examples: "App service, container apps, managed Kubernetes", scale: 3, reliability: 3, latency: 3, note: "A broad default when team maturity matches the selected abstraction level." },
            { name: "Serverless runtime", examples: "Functions and managed event runtimes", scale: 3, reliability: 2, latency: 2, note: "Fits bursty and event-driven workloads; validate cold starts, duration limits, and dependency behavior." }
          ]
        },
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
