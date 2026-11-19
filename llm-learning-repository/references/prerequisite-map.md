# Just-in-time prerequisite map

Do not postpone the papers until all mathematics is mastered. Learn the prerequisite beside the paper that makes it useful.

| Papers | Learn just before or alongside | Concrete checkpoint |
|---|---|---|
| Transformer, BERT, GPT-3 | vectors, matrices, dot products, softmax, conditional probability | Calculate a three-item softmax and one attention-weighted average by hand |
| Scaling Laws, Chinchilla | logarithms, power laws, linear regression on log scales, constrained optimization | Explain an iso-compute curve and fit a line to log-log toy data |
| RAG | cosine similarity, nearest-neighbor retrieval, precision/recall, conditional probability | Separate retrieval recall from answer correctness on ten questions |
| Chain-of-Thought, ReAct | search trees, state, actions, observations, conditional branching | Draw one successful and one failed trajectory |
| InstructGPT | expected reward, pairwise preference models, KL divergence, policy optimization | Explain why optimizing a proxy can damage the real objective |
| LoRA | matrix rank, factorization, parameter counting | Compute parameter savings for a rank-8 update to a 4096-by-4096 matrix |
| MMLU, TruthfulQA, HELM | sampling, confidence intervals, calibration, construct validity | Add uncertainty and an error taxonomy to an aggregate score |
| HumanEval, RepoBench, SWE-bench | unit tests, repositories, dependency graphs, containers, pass@k | Reproduce one task in an isolated environment from a pinned commit |
| CAMEL, AutoGen, MetaGPT, survey | graphs, queues, state machines, distributed failure basics | Label nodes, edges, state owners, termination, and retry behavior |
| MCP/A2A | HTTP, JSON-RPC, schemas, OAuth concepts, threat modeling | Trace identity and authority across one tool call and one delegated task |
| Toolformer, CodeAct | self-supervised labels, perplexity as a loss, JSON versus code as an interface, sandboxing | Show one task as a JSON tool call and as code; list what could go wrong when running the code |
| SWE-agent, Agentic Tool Use survey | command-line tools, linters, output truncation, taxonomy of training signals | Redesign one noisy tool output so a model can act on it, and say what you would measure |
| Dive into Claude Code, Harness Engineering | permission models, process isolation, queues and event loops, source-code study method | Draw the loop and list every component that sits outside it |
| Context as a Tool, Agentic Context Engineering | token budgets, summarisation loss, versioned notes, feedback signals | Compute how many turns fit in a window and what a summary at turn N drops |
| Business studies | randomization, causal diagrams, heterogeneous effects, external validity | State the treatment, outcome, comparison, confounders, and transfer limits |

## Deepening sequence

1. **Linear algebra:** geometric intuition → matrix notation → low-rank factorization → eigenspaces/SVD.
2. **Probability:** conditional probability → likelihood/cross-entropy → estimation → Bayesian reasoning and calibration.
3. **Optimization:** derivatives → gradient descent → stochastic optimization → constrained and policy optimization.
4. **Statistics:** sampling → uncertainty → experimental design → causal inference and heterogeneous effects.
5. **Systems:** APIs → concurrency/state → distributed failures → security boundaries and reproducibility.
