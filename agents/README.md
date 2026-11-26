# Agents

Start with [agentic engineering](../themes/agentic-engineering/README.md). Multi-agent papers, MCP/A2A material, and communication-channel tutorials live in the [LLM curriculum](../llm-learning-repository/README.md).

For how coding assistants are built (tools, harness, context), follow the [agent-systems stage](../llm-learning-repository/tutorials/06-agent-systems/README.md) of the LLM curriculum.

## Building an agent runtime

- [Implementation languages](languages/README.md): Python, Rust, C#, Go, Java and TypeScript (on Node) compared for the runtime layer, with evidence from eleven real harnesses, a language-neutral reference loop, and the experiment that would produce measurements.
- [Agent frameworks](frameworks/README.md): LangChain, LangGraph and others from an implementer's standpoint: what to write, what you get, what you still build, and when to write the loop yourself. Includes a deterministic [stub model server](frameworks/stub/server.mjs) for trying any framework without keys.
- [Selecting a language and framework](../architecture-evolution/language-and-framework-selection.md): the architecture-evolution decision method applied to this choice.
- [Runtime reference architecture and data design](runtime-architecture/README.md): the pipeline, connectors, and where conversation history, state, memory and data sources live (with an executed event-log schema).
- [Small language models for the enterprise](small-language-models/README.md): what it takes to fine-tune, deploy and operate an SLM: options with pros and cons (LoRA, QLoRA, preference tuning, RL with verifiable rewards, distillation), training and serving tools, the tools a tuned model can call, and the vehicle (artifact, runtime, channel, role) that carries it to users. Includes cost arithmetic and a measured case.
- [Team and agents for an SLM project](small-language-models/07-team-and-agents.md): which roles an SLM project needs, how team shape changes with organisation size, and what agents can and cannot do, with dated benchmark evidence.
- [tmux workspace for Claude Code sessions](../devtools/tmux-workspace/README.md): a one-command tmux layout (Kubernetes watch, agent view, five session panes) whose panes follow the sessions that matter, ranked by recent activity then status, with LRU eviction.
