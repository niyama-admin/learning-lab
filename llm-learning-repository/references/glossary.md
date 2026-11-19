# Plain-language glossary

- **Agent:** a model inside a loop that observes, decides, may use tools, and updates state.
- **Attention:** a learned way to weight relevant parts of the context.
- **Benchmark:** a repeatable test set and scoring procedure; it samples capability rather than proving general competence.
- **Channel:** a governed route through which messages move between people, models, agents, or tools.
- **Context window:** the tokens available to the model for one inference.
- **Embedding:** a vector whose geometry represents learned relationships.
- **Evaluation:** evidence about system behavior under defined conditions.
- **Fine-tuning:** changing model weights using task or preference data.
- **Hallucination:** an unsupported or false output presented as if reliable.
- **Inference:** running a trained model to produce an output.
- **MCP:** a client-server protocol for exposing tools, resources, and prompts to AI applications.
- **A2A:** a protocol for discovery and task-oriented collaboration between agents.
- **Parameter:** a learned number in a model.
- **RAG:** retrieving external evidence and providing it to a generator.
- **Token:** a unit of text processed by a model; it is not necessarily a whole word.
- **Training:** adjusting parameters to reduce a loss on data.
- **Harness:** the software around a model that builds its prompts, runs its tool calls, enforces permissions, manages context and decides when to stop. Everything in an agent product except the model weights.
- **Tool call:** a structured request from the model, such as a function name plus arguments, that the runtime executes and whose result is returned to the model.
- **Agent-computer interface (ACI):** the commands, output formats and error messages through which an agent operates a computer; the agent's equivalent of a user interface.
- **Context compaction (condensation):** replacing part of the conversation history with a shorter summary so a long task fits in the context window.
- **Playbook:** in Agentic Context Engineering, a structured, itemised set of strategies kept in the prompt and edited as the agent learns.
- **Trajectory:** the full sequence of model outputs, tool calls and observations for one task attempt.

