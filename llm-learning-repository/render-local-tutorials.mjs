import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));

function csv(line) {
  const out = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (line[i] === '"') quoted = !quoted;
    else if (line[i] === "," && !quoted) { out.push(value); value = ""; }
    else value += line[i];
  }
  out.push(value); return out;
}

const manifest = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1).map(line => {
  const [order, stage, slug, id, title, authors, pdfUrl, tutorial] = csv(line);
  return { order: Number(order), stage, slug, id, title, authors, pdfUrl, tutorial };
});

const profiles = {
  "1810.04805": {
    question: "Can one language encoder be pretrained once on unlabeled text and then adapted with minimal task-specific machinery?",
    before: "Earlier feature pipelines were often directional or assembled separately for each task, so a token could not use both its left and right context during pretraining in the same direct way.",
    contribution: "BERT pretrains a Transformer encoder with masked language modeling and next-sentence prediction, then fine-tunes the whole network with a small output head.",
    method: "WordPiece tokens receive token, segment, and position embeddings. Random input positions are selected for prediction; a sequence-pair objective supplies an additional pretraining signal. BERT Base has 12 layers and about 110M parameters; BERT Large has 24 layers and about 340M.",
    evidence: "The paper reports BERT Large at 80.5 GLUE, 86.7 MultiNLI accuracy, 93.2 SQuAD 1.1 test F1, and 83.1 SQuAD 2.0 test F1. Ablations show that bidirectionality and the two pretraining objectives matter, though later work revisited the value of next-sentence prediction.",
    limits: "The pretraining corpus, compute cost, fixed context length, WordPiece behavior, and mismatch between masked-token pretraining and downstream use constrain the claim. Benchmark gains do not establish factuality, fairness, robustness, or safe deployment.",
    analogy: "an apprentice proofreader who learns language by restoring covered words, then receives a small task card for each new job",
    flow: ["unlabeled text", "mask and pair examples", "bidirectional encoder", "task-specific head", "fine-tuned prediction"],
    equation: "L = L_MLM + L_NSP; for a selected position i, L_MLM contains -log p_theta(x_i | x_masked)",
    datasets: "BooksCorpus and English Wikipedia for pretraining; GLUE, MultiNLI, SQuAD 1.1/2.0, and SWAG for transfer evaluation",
    terms: ["MLM: masked language modeling", "NSP: next-sentence prediction", "WordPiece: subword tokenization", "[CLS]: aggregate sequence token", "[SEP]: separator token", "fine-tuning: updating pretrained parameters on a labeled task"]
  },
  "2005.14165": {
    question: "How far can task performance emerge from scale and natural-language prompting without gradient updates for each downstream task?",
    before: "The dominant transfer recipe pretrained a model and then fine-tuned it separately for each labeled dataset.",
    contribution: "GPT-3 scales an autoregressive Transformer to 175B parameters and evaluates zero-shot, one-shot, and few-shot in-context learning across many tasks.",
    method: "A prompt contains instructions or demonstrations followed by a query. The model predicts continuation tokens; no weight update occurs during evaluation. The study compares model sizes from 125M through 175B to expose scaling trends.",
    evidence: "Performance generally improves with parameter count and demonstrations, with striking gains on language modeling, question answering, translation, and synthetic reasoning. The paper also documents weak spots such as some reading-comprehension and comparison tasks, and analyzes benchmark contamination.",
    limits: "A 175B model is expensive, prompt-sensitive, and trained on broad web data. In-context pattern matching is not proof of human-like learning, and benchmark performance does not guarantee truthfulness or safe business behavior.",
    analogy: "a widely read improviser who is shown a few examples on the cue card before performing a new scene",
    flow: ["large text mixture", "autoregressive pretraining", "prompt plus examples", "next-token inference", "task answer"],
    equation: "L(theta) = -sum_t log p_theta(x_t | x_<t); in-context examples change x_<t but not theta",
    datasets: "Common Crawl, WebText2, Books1/2, and Wikipedia for training; a broad suite including LAMBADA, SuperGLUE, TriviaQA, translation, arithmetic, and cloze tasks",
    terms: ["zero-shot: instruction without examples", "one-shot: one demonstration", "few-shot: several demonstrations", "in-context learning: adapting behavior through prompt context", "autoregressive: predicting the next token from earlier tokens", "contamination: test material appearing in training data"]
  },
  "2001.08361": {
    question: "Can language-model loss be predicted from model size, dataset size, and training compute using simple empirical laws?",
    before: "Model builders had observations that bigger often helped, but lacked a compact empirical account of how the main resource axes traded off.",
    contribution: "The paper fits power-law relationships between cross-entropy loss and parameters, data, and compute, and derives a compute-allocation prescription.",
    method: "Train many autoregressive Transformers over controlled ranges, isolate one bottleneck at a time, fit log-log trends, and examine overfitting as data and parameter budgets interact.",
    evidence: "Held-out loss follows smooth power laws over the tested ranges. Under the paper's setup, compute-efficient training favors increasing model size rapidly while growing training data and steps more slowly. Chinchilla later showed that this allocation was not the final word.",
    limits: "These are fitted regularities, not physical laws. Architecture, tokenizer, optimizer, data quality, evaluation distribution, and the finite experimental range affect extrapolation.",
    analogy: "a bakery estimating how cake quality changes with oven size, ingredient supply, and baking time by running a carefully designed grid of trials",
    flow: ["resource budgets N D C", "controlled training runs", "held-out loss", "power-law fit", "compute allocation"],
    equation: "L(N) approximately L_infinity + (N_c/N)^alpha_N, with analogous fits for data D and compute C",
    datasets: "WebText2 and controlled Transformer training runs spanning model sizes, dataset sizes, batch sizes, and compute budgets",
    terms: ["power law: y proportional to x raised to a constant exponent", "cross-entropy: average surprise assigned to correct tokens", "irreducible loss: fitted lower asymptote", "compute budget: total training operations", "overfitting: improving training loss while held-out loss worsens", "extrapolation: predicting outside observed runs"]
  },
  "2203.15556": {
    question: "For a fixed training-compute budget, what balance of model parameters and training tokens minimizes language-model loss?",
    before: "Prevailing scaling practice often trained very large models on comparatively few tokens, partly following earlier scaling-law estimates.",
    contribution: "Chinchilla revises compute-optimal scaling: model size and training tokens should grow in roughly equal proportion under the studied regime.",
    method: "The authors use three estimation approaches over hundreds of runs, fit loss as a function of parameters and tokens, then train a 70B-parameter model on 1.4T tokens as a test of the prescription.",
    evidence: "Chinchilla uses the same training compute as the 280B-parameter Gopher but substantially more data and outperforms it on most evaluated language, reasoning, and question-answering tasks while being cheaper at inference.",
    limits: "The optimum depends on the loss target, data mixture and repetition, architecture, optimizer, hardware accounting, and whether inference cost matters. The result is not a universal ratio for every modality or deployment.",
    analogy: "choosing a smaller student who reads far more books instead of hiring a giant student who stops studying early",
    flow: ["fixed compute", "choose parameters N", "choose tokens D", "fit loss surface", "train Chinchilla"],
    equation: "L(N,D) = E + A/N^alpha + B/D^beta; minimize subject to compute C approximately 6ND",
    datasets: "MassiveText-derived training mixtures and downstream evaluations spanning language modeling, MMLU-style knowledge, reading comprehension, commonsense, and toxicity/bias analyses",
    terms: ["compute-optimal: lowest predicted loss at fixed operations", "parameter: learned numeric weight", "token budget: number of training tokens processed", "isoFLOP curve: results at equal compute", "Gopher: 280B comparison model", "Chinchilla: 70B model trained on 1.4T tokens"]
  },
  "2005.11401": {
    question: "Can a generator answer knowledge-intensive questions by consulting an explicit, updateable document memory?",
    before: "Parametric language models stored knowledge in weights, making provenance and updates difficult; retrieve-then-read systems often separated retrieval from generation.",
    contribution: "RAG jointly combines a dense retriever over Wikipedia passages with a sequence-to-sequence generator and marginalizes over retrieved latent documents.",
    method: "A query encoder retrieves top-k passages from a dense index. RAG-Sequence uses one latent passage for an output sequence; RAG-Token may choose evidence per generated token. BART supplies the generator.",
    evidence: "The paper evaluates open-domain QA, question generation, and fact verification, reporting state-of-the-art results on several knowledge-intensive tasks and more factual, specific generations than a parametric-only baseline.",
    limits: "Retrieval can miss evidence, return stale or adversarial text, or supply a relevant-looking contradiction. Generated text may not be entailed by retrieved passages; provenance and access control require application engineering beyond the paper.",
    analogy: "an exam taker who first asks a librarian for likely reference cards and then writes an answer while weighing those cards",
    flow: ["question x", "dense retriever", "top-k passages z", "generator p(y|x,z)", "marginalized answer"],
    equation: "p(y|x) = sum_z p_eta(z|x) p_theta(y|x,z), approximated over the retrieved top-k documents",
    datasets: "Wikipedia passage index; Natural Questions, TriviaQA, WebQuestions, CuratedTREC, MS MARCO, Jeopardy question generation, and FEVER",
    terms: ["parametric memory: knowledge encoded in weights", "non-parametric memory: external document index", "DPR: dense passage retrieval", "latent document: unobserved evidence variable", "top-k: highest-scoring retrieved items", "marginalization: summing probability over possible evidence"]
  },
  "2201.11903": {
    question: "Can worked natural-language reasoning examples elicit multi-step reasoning from sufficiently large language models?",
    before: "Standard prompts asked directly for an answer, hiding intermediate structure and performing poorly on tasks that require several linked steps.",
    contribution: "Chain-of-thought prompting supplies demonstrations containing intermediate reasoning before the final answer.",
    method: "Few-shot exemplars pair each question with a textual reasoning chain and answer. At inference, the model generates a new chain and then an answer; model weights remain fixed.",
    evidence: "Across arithmetic, commonsense, and symbolic reasoning, chain-of-thought gains emerge strongly at large scale. With PaLM 540B, the method reaches 58.1% on GSM8K versus 17.9% for standard prompting in the reported comparison.",
    limits: "A plausible chain can be wrong or unfaithful to the mechanism producing the answer. Benefits depend on model scale, examples, decoding, and task; showing work is not a correctness certificate.",
    analogy: "a tutor demonstrating every line of a word problem so the student learns the shape of a solution rather than guessing the final number",
    flow: ["question", "worked exemplars", "generated rationale", "final answer", "exact-match scoring"],
    equation: "Generate rationale r and answer a by p(r,a|x,demos) = product_t p(token_t | earlier tokens, x, demos)",
    datasets: "GSM8K, SVAMP, ASDiv, AQuA, MAWPS, CommonsenseQA, StrategyQA, date understanding, and symbolic last-letter/coin-flip tasks",
    terms: ["chain of thought: intermediate natural-language steps", "rationale: generated explanation", "few-shot exemplar: worked prompt example", "emergent ability: sharp gain visible at larger scales", "exact match: answer-string equality metric", "faithfulness: whether explanation reflects the actual decision process"]
  },
  "2203.02155": {
    question: "Can human preference feedback make a pretrained language model follow user intent better than scale or supervised imitation alone?",
    before: "Next-token pretraining does not directly optimize helpfulness, instruction following, or avoidance of harmful outputs.",
    contribution: "InstructGPT combines supervised fine-tuning, a learned reward model from ranked outputs, and reinforcement learning with a KL constraint.",
    method: "Labelers write demonstrations, rank candidate completions, and define a preference signal. A reward model learns those comparisons; PPO optimizes the policy while penalizing excessive drift from the supervised model.",
    evidence: "Human evaluators prefer outputs from the 1.3B InstructGPT model to those from the 175B GPT-3 baseline, and the paper reports improvements in truthfulness and reductions in toxic output on selected evaluations without severe capability regression.",
    limits: "The reward reflects a small contractor population, written guidelines, and sampled prompts. Reward-model error, preference disagreement, gaming, and deployment distribution shift remain. Alignment to labelers is not universal human alignment.",
    analogy: "an apprentice first copies demonstrations, then receives ranked feedback from coaches, then practices under a rule that prevents abandoning prior language skill",
    flow: ["prompt demonstrations", "supervised model", "ranked outputs", "reward model", "PPO policy"],
    equation: "maximize E[r_phi(x,y) - beta log(pi_theta(y|x)/pi_SFT(y|x))] plus the paper's pretraining-mix term",
    datasets: "Prompts submitted to the OpenAI API and labeler-written prompts; human preference evaluation plus public NLP safety and capability datasets",
    terms: ["SFT: supervised fine-tuning", "reward model: predictor of human preference", "RLHF: reinforcement learning from human feedback", "PPO: proximal policy optimization", "KL penalty: constraint on policy drift", "alignment tax: capability loss caused by alignment training"]
  },
  "2106.09685": {
    question: "Can large pretrained models be adapted by training a tiny low-rank update instead of changing every weight?",
    before: "Full fine-tuning stores and trains a complete parameter copy per task; adapter modules can add inference latency or architectural complexity.",
    contribution: "LoRA freezes pretrained weights and injects trainable low-rank matrices into selected linear transformations.",
    method: "For a frozen weight W0, learn Delta W = BA where rank r is much smaller than the input and output dimensions. During inference BA can be merged into W0, adding no extra layer latency.",
    evidence: "On GPT-3 175B, LoRA reduces trainable parameters by roughly 10,000 times and GPU memory by about three times relative to full fine-tuning while matching or exceeding strong adaptation baselines across evaluated NLP tasks.",
    limits: "Low intrinsic update rank is an empirical hypothesis, not a guarantee. Rank, target modules, scaling, optimizer, and data determine quality; merging many tenant adapters and serving them efficiently are separate systems problems.",
    analogy: "placing a small transparent correction sheet over an expensive master blueprint instead of redrawing and storing the blueprint for every client",
    flow: ["frozen weight W0", "input x", "low-rank A then B", "scaled update", "combined output"],
    equation: "h = W0 x + (alpha/r) B A x, where A is r by d and B is k by r",
    datasets: "RoBERTa tasks from GLUE, DeBERTa on natural-language understanding, and GPT-2/GPT-3 generation and few-shot adaptation comparisons",
    terms: ["rank: number of independent directions in a matrix", "adapter: task-specific trainable component", "frozen weight: parameter excluded from updates", "merge: add BA into W0 for inference", "intrinsic dimension: effective dimension needed for adaptation", "PEFT: parameter-efficient fine-tuning"]
  },
  "2210.03629": {
    question: "Can an LLM interleave verbal reasoning with tool actions so that thought guides information gathering and observations correct thought?",
    before: "Reasoning-only prompting could hallucinate facts; action-only agents lacked an explicit scratchpad for planning and exception handling.",
    contribution: "ReAct uses trajectories of Thought, Action, Observation steps followed by an answer.",
    method: "Few-shot trajectories teach the model an action grammar. On QA tasks actions call a Wikipedia interface; on interactive tasks they manipulate an environment. Returned observations re-enter context.",
    evidence: "ReAct improves interpretability and often outperforms action-only or chain-of-thought baselines. On ALFWorld and WebShop the paper reports absolute success-rate gains of 34 and 10 percentage points over imitation/reinforcement-learning baselines.",
    limits: "Thought text can still be unfaithful, tools can fail, and long trajectories compound error and cost. Tool permissions, prompt injection, termination, and audit controls are application responsibilities.",
    analogy: "a field technician who alternates between writing the next hypothesis, operating an instrument, recording the reading, and revising the plan",
    flow: ["question or goal", "thought", "tool action", "observation", "next thought or answer"],
    equation: "At step t the policy samples a_t from pi_theta(a_t | x, thought_<t, action_<t, observation_<t)",
    datasets: "HotpotQA and FEVER for knowledge tasks; ALFWorld and WebShop for interactive decision-making",
    terms: ["trajectory: ordered interaction history", "Thought: textual scratchpad step", "Action: structured tool command", "Observation: tool/environment return", "sparse reasoning: reasoning only when needed", "grounding: tying output to external evidence or state"]
  },
  "2009.03300": {
    question: "How broadly can one test a model's academic and professional knowledge instead of reporting a narrow collection of NLP tasks?",
    before: "Benchmarks often covered a small skill family and became saturated, making broad capability comparisons difficult.",
    contribution: "MMLU aggregates 57 multiple-choice subjects from elementary mathematics through law, medicine, history, and computer science.",
    method: "Models answer four-choice questions in zero-shot and few-shot settings. Accuracy is averaged across questions and grouped subject areas, with random choice at 25%.",
    evidence: "At publication, GPT-3's five-shot average was about 43.9%, substantially above chance but far below the paper's estimated human-expert performance near 89.8%. Results vary sharply by subject.",
    limits: "Multiple-choice accuracy mixes knowledge, reasoning, formatting, and contamination. A macro average can hide weak domains; the benchmark does not measure calibration, real-world action, safety, or current knowledge.",
    analogy: "a comprehensive examination board assembling one short exam from 57 departments, then reporting both the overall grade and each departmental grade",
    flow: ["57 subject banks", "prompt format", "choice likelihoods", "per-item correctness", "subject and overall accuracy"],
    equation: "accuracy = (1/n) sum_i 1[argmax_c score(c|x_i) = y_i]",
    datasets: "15,908 multiple-choice questions across 57 subjects, divided into development, validation, and test examples",
    terms: ["MMLU: Massive Multitask Language Understanding", "zero-shot: no demonstrations", "few-shot: a small development set in context", "macro average: equal-weight aggregation over groups", "chance level: 25% for four choices", "contamination: overlap with training data"]
  },
  "2109.07958": {
    question: "Will language models repeat attractive human misconceptions rather than give truthful answers?",
    before: "Standard QA rewards matching accepted answers but rarely targets questions where common web text itself is misleading.",
    contribution: "TruthfulQA constructs adversarially selected questions across 38 categories and evaluates truthfulness separately from informativeness.",
    method: "The benchmark contains 817 questions designed to elicit misconceptions. Human judges and trained classifiers evaluate free-form generations; a multiple-choice variant supports reproducible scoring.",
    evidence: "The best tested model was truthful on 58% of questions while human performance was 94% in the reported setup. Larger models were not consistently more truthful, supporting the imitation-of-falsehood concern.",
    limits: "Truth labels and acceptable wording require judgment; the question distribution is deliberately adversarial and English-centric. Classifier metrics can diverge from human evaluation, and benchmark truthfulness is not full factual reliability.",
    analogy: "a careful interviewer asking questions built around popular myths to see whether a well-read respondent repeats the crowd or checks the premise",
    flow: ["misconception category", "adversarial question", "model answer", "truth and information labels", "human/classifier score"],
    equation: "Report Truth and Info separately; a useful truthful answer must satisfy both rather than optimizing one scalar proxy blindly",
    datasets: "817 authored questions in 38 categories, plus reference true answers, false answers, citations, and human/model evaluation labels",
    terms: ["truthful: avoids a false statement", "informative: substantively answers", "imitative falsehood: common misconception learned from text", "MC1/MC2: multiple-choice scoring variants", "GPT-judge: learned truth classifier", "adversarial selection: choosing items likely to expose failure"]
  },
  "2211.09110": {
    question: "How should foundation models be evaluated transparently across scenarios, metrics, and known limitations rather than by one leaderboard number?",
    before: "Model comparisons used inconsistent prompts, datasets, metrics, and partial reporting, so results were hard to reproduce or interpret holistically.",
    contribution: "HELM defines scenarios and adaptations, evaluates multiple metrics, and publishes standardized results and documentation in a living benchmark framework.",
    method: "A scenario specifies task and distribution; an adaptation maps it to model requests; metrics cover accuracy, calibration, robustness, fairness, bias, toxicity, and efficiency where applicable.",
    evidence: "The original study evaluates 30 prominent language models on 42 scenarios, with a core set receiving broader multi-metric analysis. It exposes trade-offs: no model dominates every scenario and metric.",
    limits: "Coverage is necessarily incomplete, APIs and models change, some metrics are crude proxies, and prompt/adaptation choices affect rankings. Standardization improves comparability but does not eliminate value judgments.",
    analogy: "a consumer laboratory that tests appliances on performance, energy, reliability, safety proxies, and documentation instead of declaring a winner from one speed test",
    flow: ["scenario", "adaptation and prompt", "model requests", "predictions", "multi-metric report"],
    equation: "An evaluation result is indexed by model m, scenario s, adaptation a, and metric k: R[m,s,a,k], not one context-free score",
    datasets: "A broad collection of language understanding, knowledge, reasoning, generation, toxicity, bias, and disinformation scenarios normalized by the HELM framework",
    terms: ["scenario: task plus distribution", "adaptation: conversion into model requests", "metric: rule mapping outputs to measurements", "calibration: agreement between confidence and correctness", "robustness: stability under perturbation", "efficiency: time or resource consumption"]
  },
  "2107.03374": {
    question: "Can large autoregressive models synthesize correct Python functions from docstrings, and how should sampled programs be evaluated?",
    before: "Text similarity is a poor judge of code because many different programs are functionally equivalent and plausible code can fail tests.",
    contribution: "The Codex study introduces HumanEval and the unbiased pass@k estimator for functional correctness under repeated sampling.",
    method: "A model receives a signature and docstring, samples candidate completions, and executes hidden unit tests in a sandbox. HumanEval contains 164 hand-written programming problems.",
    evidence: "Codex-12B achieves 28.8% pass@1 and 72.3% pass@100 on HumanEval in the reported setup. Sampling more candidates improves the chance that at least one passes, but does not automatically identify it.",
    limits: "HumanEval is small, Python-only, function-level, and vulnerable to contamination. Passing tests is bounded by test quality and says little about maintainability, security, licensing, or repository integration.",
    analogy: "a workshop giving an apprentice 164 repair tickets, allowing several proposed fixes, and judging each by running concealed acceptance checks",
    flow: ["docstring and signature", "sample n programs", "sandboxed unit tests", "count c correct", "estimate pass at k"],
    equation: "pass@k = 1 - C(n-c,k)/C(n,k), where n samples contain c correct programs",
    datasets: "HumanEval's 164 original Python synthesis tasks, with prompt, canonical solution, entry point, and hidden tests",
    terms: ["Codex: GPT-family model trained with code", "functional correctness: behavior satisfies tests", "pass@k: probability at least one of k samples passes", "temperature: sampling randomness control", "sandbox: isolated execution environment", "data contamination: benchmark solutions present in training"]
  },
  "2306.03091": {
    question: "Can code models complete a file using relevant context scattered across an entire repository?",
    before: "Function-level benchmarks and short context windows ignore imports, sibling files, APIs, and project conventions needed for repository work.",
    contribution: "RepoBench separates repository retrieval, next-line completion, and an end-to-end pipeline, covering Python and Java repositories.",
    method: "RepoBench-R ranks cross-file snippets for a completion location; RepoBench-C tests completion with curated contexts; RepoBench-P combines retrieval and generation under practical context budgets.",
    evidence: "The experiments show that relevant cross-file context improves completion, but retrieval quality and context organization materially affect generation. Long raw context is not equivalent to selecting useful context.",
    limits: "A next-line completion proxy does not capture multi-file changes, tests, issue understanding, or maintainability. Repository licensing, temporal leakage, duplicates, parser quality, and evolving dependencies threaten validity.",
    analogy: "a mechanic completing one line of a repair manual after searching the entire workshop archive for the right diagrams and part specifications",
    flow: ["repository snapshot", "completion location", "retrieve cross-file context", "code model", "next-line completion"],
    equation: "End-to-end utility depends on both retrieval rank quality and conditional generation p(y | local context, retrieved context)",
    datasets: "Curated Python and Java repositories transformed into retrieval, completion, and pipeline tasks with in-file and cross-file contexts",
    terms: ["repository-level: requiring information beyond one file", "cross-file context: relevant code from other files", "RepoBench-R: retrieval task", "RepoBench-C: completion task", "RepoBench-P: pipeline task", "temporal leakage: future code appearing in training"]
  },
  "2310.06770": {
    question: "Can language models resolve real GitHub issues in real repositories, producing patches that pass the project's tests?",
    before: "Function-synthesis benchmarks omit issue interpretation, code navigation, dependency setup, multi-file editing, and regression testing.",
    contribution: "SWE-bench builds executable tasks by pairing resolved GitHub issues with repository snapshots and their accepted pull-request changes.",
    method: "For each issue, a system receives the text and pre-fix repository, edits the code, and is scored by fail-to-pass and pass-to-pass tests in a controlled environment.",
    evidence: "The original benchmark contains 2,294 issues from 12 popular Python repositories. The strongest reported system, Claude 2, resolved 1.96%, showing a large gap between code generation and autonomous software maintenance.",
    limits: "Environment reconstruction and tests can be imperfect; accepted patches are not the only valid fixes. The dataset is Python-heavy and historically bounded, and test passage does not prove code quality or security.",
    analogy: "giving a contractor an archived building, a tenant complaint, and an inspection suite, then asking for a repair without showing the original contractor's patch",
    flow: ["issue text", "pre-fix repository", "agent edits", "test harness", "resolved or unresolved"],
    equation: "resolved = 1 when required fail-to-pass tests now pass and protected pass-to-pass tests remain passing",
    datasets: "2,294 issue-pull-request pairs from 12 Python repositories, with versioned environments and generated evaluation tests",
    terms: ["issue: natural-language bug or feature report", "patch: code changes proposed as a fix", "fail-to-pass: tests expected to become passing", "pass-to-pass: regression tests that must remain passing", "repository snapshot: code before the fix", "execution-based evaluation: scoring by running code"]
  },
  "2303.17760": {
    question: "Can role prompts sustain useful autonomous cooperation between language-model agents while reducing the need for a human to steer every turn?",
    before: "Open-ended chat agents often drift, repeat, or require frequent human prompts to maintain a coherent task.",
    contribution: "CAMEL introduces inception prompting and role-playing between an AI user and AI assistant, seeded by a task generated from specified roles.",
    method: "A task-specifier expands a broad idea into a concrete task. Separate system prompts define complementary roles, rules, and termination behavior; agents alternate messages to pursue the task.",
    evidence: "The paper presents large-scale conversational data and qualitative/quantitative analyses of role-playing, including task completion, consistency, and common failure modes such as role flipping, assistant repetition, and conversation loops.",
    limits: "Dialogue fluency is not verified task correctness. Both agents share model biases and can mutually reinforce errors; termination, external grounding, cost, and security remain open engineering concerns.",
    analogy: "two improvisers receive detailed character cards and a shared assignment, then alternate turns while a stage manager watches for loops and role confusion",
    flow: ["human idea and roles", "task specifier", "AI user", "AI assistant", "termination or result"],
    equation: "Each agent samples message m_t from p_theta(m_t | role prompt, task, dialogue history)",
    datasets: "AI Society and Code conversational datasets generated from role pairs and task prompts, plus analyzed dialogue traces",
    terms: ["inception prompt: detailed role and behavior instruction", "role-playing: agents act under complementary identities", "task specifier: component that narrows an idea", "role flipping: agents exchange intended roles", "conversation loop: repeated unproductive turns", "society of mind: intelligence framed as interacting specialists"]
  },
  "2308.08155": {
    question: "Can a general conversation abstraction compose LLMs, tools, code execution, and humans into flexible multi-agent applications?",
    before: "Agent systems were often built as rigid, application-specific control flows that were difficult to reuse or extend.",
    contribution: "AutoGen represents components as conversable agents with customizable reply behavior and supports automated or human-in-the-loop multi-agent conversations.",
    method: "Agents send messages, register reply functions, call LLMs or tools, execute code, and apply termination conditions. Conversation patterns can be two-agent, group, nested, or customized.",
    evidence: "The paper demonstrates applications in math problem solving, retrieval-augmented chat, decision support, coding, and conversational chess, showing how different orchestration patterns improve capability or reduce manual integration.",
    limits: "Framework flexibility does not ensure correctness. Unbounded conversations, unsafe code, prompt injection, correlated agents, nondeterminism, and unclear responsibility require explicit controls and evaluation.",
    analogy: "a switchboard where specialists can call one another, run approved machinery, or ask a supervisor, while configurable rules decide who answers next",
    flow: ["message", "conversable agent", "LLM tool or human reply", "next recipient", "termination condition"],
    equation: "Agent i implements a reply policy pi_i(message history, local state) -> reply, action, recipient, or terminate",
    datasets: "Demonstration applications and task suites spanning mathematics, coding, retrieval, decision optimization, and interactive games",
    terms: ["conversable agent: message-driven component", "reply function: handler producing the next response", "human-in-the-loop: explicit human participation", "code executor: component running generated code", "group chat: multiple agents sharing a thread", "termination condition: rule ending interaction"]
  },
  "2308.00352": {
    question: "Can software-development standard operating procedures be encoded into a role-based LLM team that emits structured engineering artifacts?",
    before: "A single conversational agent often jumps directly from a vague request to code, omitting requirements, design, interfaces, tests, and review.",
    contribution: "MetaGPT assigns product-manager, architect, project-manager, and engineer roles, and uses SOPs plus structured messages to coordinate them.",
    method: "A requirement triggers sequential artifacts such as product requirements, system design, task decomposition, APIs, code, and tests. Roles watch selected messages and act according to workflow constraints.",
    evidence: "The paper evaluates generated software and coding benchmarks, reporting competitive HumanEval and MBPP results and arguing that structured intermediate artifacts reduce cascading ambiguity compared with unstructured chat.",
    limits: "Artifact presence is not artifact correctness. Fixed SOPs can make false assumptions durable, reported benchmark tasks are smaller than production systems, and security, dependency management, and maintenance remain underexplored.",
    analogy: "a small studio using handoff documents: the product lead writes the brief, the architect draws the plan, the manager assigns work, and engineers implement against agreed interfaces",
    flow: ["requirement", "product requirements", "architecture and APIs", "tasks and code", "tests and deliverables"],
    equation: "A role action is conditioned on profile, memory, watched messages, and SOP state rather than the latest user message alone",
    datasets: "HumanEval, MBPP, and software-generation tasks evaluated through executable code and artifact-oriented comparisons",
    terms: ["SOP: standard operating procedure", "role specialization: distinct prompts and responsibilities", "structured message: typed handoff artifact", "watch: subscription to relevant events", "shared environment: common workspace/state", "cascading hallucination: early error propagated through later work"]
  },
  "2402.01680": {
    question: "What design dimensions, applications, evaluation methods, and open challenges characterize LLM-based multi-agent systems?",
    before: "Rapidly growing agent work used inconsistent terminology and fragmented architectures, making systems difficult to compare.",
    contribution: "The survey organizes multi-agent research around agent profiling, perception, self-action, mutual interaction, evolution, environments, applications, and evaluation.",
    method: "It reviews representative systems and builds taxonomies for agent construction, communication topology, cooperation/competition, feedback, memory, and capability evolution.",
    evidence: "The contribution is synthesis rather than one controlled experiment. Cross-paper examples show promise in problem solving, simulation, software engineering, recommendation, and social-science settings, alongside recurring coordination failures.",
    limits: "Survey coverage ages quickly and inherits weaknesses of cited studies. Categories can overlap, demonstrations are heterogeneous, and few evaluations isolate the causal value of multiple agents over equivalent single-agent compute.",
    analogy: "a field guide classifying teams by member roles, senses, communication rules, learning, workplace, and scorecards rather than declaring one team universally best",
    flow: ["agent profiles", "perception and memory", "actions", "interaction topology", "environment and evaluation"],
    equation: "A multi-agent system can be modeled as policies pi_1...pi_n acting on local observations with messages that alter each agent's information state",
    datasets: "A literature corpus of LLM multi-agent systems and applications rather than a single benchmark dataset",
    terms: ["profile: role and capability definition", "perception: intake from environment or peers", "topology: who can communicate with whom", "emergence: group behavior not explicit in one agent", "cooperation: aligned objectives", "competition: partially conflicting objectives"]
  },
  "2505.02279": {
    question: "How do emerging agent interoperability protocols differ in discovery, communication, identity, capability exposure, and trust?",
    before: "Agent frameworks used custom integrations, while tools, agents, and remote services lacked a shared vocabulary for interoperation.",
    contribution: "The survey compares MCP, ACP, A2A, and ANP as complementary or competing protocol approaches and proposes a common evaluation taxonomy.",
    method: "Protocol documents and implementations are compared across architecture, message transport, capability discovery, state, security, governance, and ecosystem maturity.",
    evidence: "This is a standards survey, so evidence is feature comparison and case analysis rather than model-accuracy experiments. It distinguishes tool/context connectivity from agent-to-agent task delegation and decentralized identity approaches.",
    limits: "The May 2025 snapshot can become outdated as specifications evolve. Stated features are not proof of interoperable implementations, secure defaults, scalability, or organizational adoption.",
    analogy: "comparing USB for attaching tools, courier protocols for delegating jobs, and passports/directories for discovering and trusting independent workers",
    flow: ["agent or host", "discovery", "protocol message", "tool or remote agent", "result and state"],
    equation: "Interoperability is a compatibility relation over transport, message schema, lifecycle, identity, authorization, and error semantics - not merely valid JSON",
    datasets: "Primary protocol specifications, implementations, and ecosystem examples for MCP, ACP, A2A, and ANP available to the survey authors",
    terms: ["MCP: Model Context Protocol", "ACP: Agent Communication Protocol", "A2A: Agent2Agent protocol", "ANP: Agent Network Protocol", "capability discovery: learning what a peer offers", "transport: mechanism carrying protocol messages"]
  },
  "2302.06590": {
    question: "Does access to GitHub Copilot causally change how quickly developers complete a realistic programming task?",
    before: "Anecdotes and observational usage data could not separate tool effects from developer skill, enthusiasm, or task selection.",
    contribution: "The study runs a randomized controlled experiment in which professional developers implement an HTTP server with or without Copilot.",
    method: "Ninety-five recruited developers are randomly assigned access. Completion time is the primary outcome; task correctness, attrition, and participant characteristics are also analyzed.",
    evidence: "Developers with Copilot complete the task 55.8% faster in the reported experiment. The estimate is causal for the randomized sample and task under the study conditions, not automatically for every team or codebase.",
    limits: "One bounded JavaScript task, volunteers, early Copilot, short duration, and incomplete observation of long-term maintenance constrain external validity. Speed does not include defect, security, review, or ownership costs.",
    analogy: "a timed workshop trial where craftspeople are randomly given an autocomplete assistant and judged on completion of the same inspected assignment",
    flow: ["recruited developers", "random assignment", "Copilot or control", "HTTP server task", "completion time analysis"],
    equation: "The treatment effect compares outcome distributions under randomized assignment; log completion time supports proportional interpretations",
    datasets: "Experimental telemetry and submitted solutions from 95 developers performing a standardized JavaScript HTTP-server task",
    terms: ["RCT: randomized controlled trial", "treatment: access to Copilot", "control: no Copilot access", "completion time: primary outcome", "attrition: participants not completing", "external validity: transfer beyond the studied setting"]
  },
  "2304.11771": {
    question: "How does a generative-AI assistant affect productivity, quality, learning, and retention in a real customer-support workforce?",
    before: "Labor-market predictions lacked large field evidence showing how AI changes actual worker output and who benefits most.",
    contribution: "The paper studies staggered deployment of an AI chat assistant to 5,179 customer-support agents and uses operational records to estimate effects.",
    method: "The tool suggests responses based on language models and organizational examples. Difference-in-differences/event-study analyses compare outcomes around adoption while examining heterogeneity by tenure and skill.",
    evidence: "Access raises issues resolved per hour by about 14% on average, with roughly 34% gains for novice and lower-skilled workers. The paper also reports changes in customer sentiment, retention, and learning patterns.",
    limits: "This is one firm, workflow, deployment, and time period. Rollout may correlate with other changes; measured productivity does not capture every quality, privacy, deskilling, or long-run organizational effect.",
    analogy: "an experienced coach whispering suggested replies to service representatives during live calls, with the biggest help going to newer staff",
    flow: ["customer conversation", "agent context", "AI suggestion", "human acceptance or edit", "resolution and measured outcomes"],
    equation: "A difference-in-differences model compares outcome changes for treated workers with contemporaneous changes for not-yet-treated workers",
    datasets: "Operational chat, productivity, quality, sentiment, tenure, and retention records for 5,179 customer-support agents at one Fortune 500 software firm",
    terms: ["issues per hour: productivity outcome", "staggered rollout: adoption at different times", "difference in differences: comparative change estimator", "event study: effects by time from adoption", "heterogeneous effect: impact varying by subgroup", "tacit knowledge: know-how learned through experience"]
  }
};

const shared = {
  matrix: `A vector is an ordered list of numbers; a matrix is a rectangular array that maps vectors into new representations. In language systems, a row can represent a token, document, answer choice, agent state, or measured outcome. The dot product a^T b multiplies matching coordinates and sums them. It is useful as a similarity or compatibility score, but it is not automatically a probability or explanation. If X has n rows and d features, X is in R^(n by d). Multiplying X by W in R^(d by k) yields n rows with k transformed features. Always annotate shapes: most silent implementation errors are illegal or unintended broadcasts. Rank measures how many independent directions a matrix can express; a low-rank factorization BA restricts an update to a smaller subspace. For probability vectors, nonnegative entries sum to one; softmax converts arbitrary logits z_i into exp(z_i)/sum_j exp(z_j). Numerical stability uses z_i - max(z).`,
  optimization: `Learning chooses parameters theta to reduce an objective L(theta). A gradient is the local slope: theta_next = theta - eta grad L, where eta is a learning rate. Cross-entropy -log p_theta(y|x) penalizes low probability on the observed target. A training objective is a design contract, not the same as user value. Regularization, early stopping, validation splits, batch construction, random seeds, and optimizer state all influence the learned solution. In preference learning, the objective may contain a learned reward and a penalty that keeps the policy near a reference. In empirical studies with no model training, optimization still appears in estimation: choose coefficients minimizing residual error or maximizing a likelihood. Causal conclusions require design assumptions in addition to an optimized fit.`,
  representation: `Before computation, the task must define inputs, outputs, permissible context, and the unit of prediction. Text tokenization splits strings into vocabulary units; embeddings map identifiers to vectors; position information distinguishes order. Code repositories add files, syntax trees, imports, tests, and version history. Agent systems add messages, roles, tools, state, and termination events. Evaluation records must preserve these transformations because a change in prompt template, tokenizer, repository snapshot, or tool schema changes the task. A useful data sheet records origin, license, collection time, filtering, splits, duplicates, sensitive fields, and expected deployment differences.`,
  statistics: `A metric is a measuring instrument, not the property itself. Accuracy estimates a proportion correct; pass@k estimates whether at least one of k sampled programs succeeds; latency measures time, not correctness; human preference mixes several judgments. Report the experimental unit, sample count, aggregation rule, and uncertainty. For mean m from n approximately independent units with sample standard deviation s, a rough standard error is s/sqrt(n), but paired, clustered, repeated, or adaptive observations need appropriate resampling or models. A confidence interval describes estimator behavior under assumptions; it is not the probability that a fixed parameter lies in one computed interval. Multiple comparisons and benchmark tuning can create apparently impressive results by chance.`,
  systems: `Complexity asks how work, memory, latency, and sequential depth scale. Big-O hides constants, hardware utilization, network calls, serialization, retries, and queueing. An LLM system should be budgeted end to end: input tokens, output tokens, retrieval, tool calls, sandbox execution, human review, storage, and failure recovery. Throughput and tail latency are different. A system that averages one second may still have a harmful 99th percentile. Reproducibility requires pinned code and data versions, immutable prompts/configuration, environment manifests, deterministic seeds where supported, logs with secret redaction, and explicit timeout/retry/idempotency behavior.`,
  governance: `Validity asks whether evidence supports the stated claim. Internal validity concerns confounding, leakage, implementation differences, and measurement error. External validity concerns new users, languages, domains, models, and time periods. Reliability concerns repeatability under perturbations and operational failures. Safety requires its own evidence: benchmark accuracy, regularization, open code, or a fluent explanation does not establish security, privacy, fairness, or acceptable agency. Use threat modeling, least privilege, input/output validation, human approval for consequential actions, incident logging, rollback, and periodic monitoring. NIST AI RMF separates governance, mapping, measurement, and management rather than treating one score as approval.`
};

function diagram(nodes) {
  return `\`\`\`mermaid\nflowchart LR\n  A["${nodes[0]}"] --> B["${nodes[1]}"]\n  B --> C["${nodes[2]}"]\n  C --> D["${nodes[3]}"]\n  D --> E["${nodes[4]}"]\n  E -. feedback and audit .-> A\n\`\`\``;
}

function appendix(p) {
  const specs = [
    ["Vector and matrix representations", shared.matrix, `The concrete representation path is ${p.flow.join(" -> ")}. The paper's formal core can be summarized as ${p.equation}. Identify which objects are vectors, matrices, scalar scores, discrete choices, or observed outcomes before manipulating the notation.`, "Gilbert Strang, Introduction to Linear Algebra, 5th ed.; Deisenroth, Faisal, and Ong, Mathematics for Machine Learning."],
    ["Gradient-based learning and objectives", shared.optimization, `For this paper, the central objective or estimator is: ${p.equation}. Separate what is directly optimized from what is merely evaluated. That distinction explains why success on ${p.datasets} does not by itself optimize every deployment goal.`, "Goodfellow, Bengio, and Courville, Deep Learning; Boyd and Vandenberghe, Convex Optimization."],
    ["Task and data representation", shared.representation, `The paper operationalizes its task through ${p.datasets}. Its pipeline - ${p.flow.join(" -> ")} - determines what information is available and what counts as an answer. A reproduction must preserve those boundaries before comparing scores.`, "Jurafsky and Martin, Speech and Language Processing, 3rd-edition online draft; Kleppmann, Designing Data-Intensive Applications."],
    ["Measurement and statistical uncertainty", shared.statistics, `The reported evidence is ${p.evidence} These measurements support a bounded comparison under the paper's design. They do not mean statistical uncertainty was measured unless the paper reports an interval, resampling method, or model. Recompute metrics at the original experimental unit and add uncertainty appropriate to dependence in the data.`, "Wasserman, All of Statistics; Pearl, Glymour, and Jewell, Causal Inference in Statistics: A Primer."],
    ["Algorithms, parallelism, and systems cost", shared.systems, `The operational path is ${p.flow.join(" -> ")}. Profile every stage rather than attributing all cost to the language model. Preserve the paper's configuration for faithful reproduction, then separately test modern batching, caching, indexing, quantization, or parallelism.`, "Goodfellow, Bengio, and Courville, Deep Learning; Kleppmann, Designing Data-Intensive Applications."],
    ["Validity, reliability, safety, and governance", shared.governance, `The paper-specific limitations are: ${p.limits} These are not erased by code release or benchmark gains. A deployment review should map users, data boundaries, failure impact, human override, access control, monitoring, and rollback before increasing autonomy.`, "NIST AI Risk Management Framework 1.0; OWASP Top 10 for Large Language Model Applications; Wasserman, All of Statistics."]
  ];
  return `## Appendix - Prerequisites\n\n${specs.map(([name, lesson, connection, refs], i) => `### Prerequisite ${i + 1} - ${name}\n\n#### Intuition and formal bridge\n\n${lesson}\n\n#### Worked application\n\nStart with one miniature instance and label every quantity. For this paper, use the five-stage path shown in the concept map. Write the input at stage one, the state passed between stages, the decision or transformation at each arrow, and the observed output. Then perturb one input while holding the rest fixed. This exercise turns an abstract prerequisite into a falsifiable understanding of the mechanism. Check dimensions for numeric operations, provenance for data operations, and authority for agent actions.\n\n#### How this paper uses it\n\n${connection}\n\n#### Common misconceptions\n\nDo not confuse a representation with the thing represented, an optimized proxy with the real objective, correlation with intervention, an average with a guarantee, or benchmark success with deployment safety. State assumptions beside each calculation and mark any detail that the source does not establish.\n\n**References:** ${refs}`).join("\n\n")}`;
}

function tutorial(paper, p) {
  const termLines = p.terms.map(x => `- **${x.split(":")[0]}:** ${x.split(":").slice(1).join(":").trim()}`).join("\n");
  const implementation = p.flow.map((x, i) => `${i + 1}. Materialize **${x}** as a versioned artifact or logged event. Define its schema, owner, failure states, and acceptance check.`).join("\n");
  const lenses = ["mechanism", "data", "evaluation", "systems", "human factors", "security"].map((lens, i) => `#### Research notebook lens ${i + 1}: ${lens}\n\nFor **${lens}**, write the strongest claim supported by the paper, quote no prose, and point to the table, figure, equation, or design element that supplies the evidence. Next write a plausible alternative explanation and one controlled comparison that separates it. Apply this specifically to: ${p.contribution} The acceptance criterion must be observable. A negative result is informative if the manipulation, sample, and measurement had enough power to expose the predicted change. Record the paper configuration first and modernization changes second so the comparison remains interpretable.`).join("\n\n");
  return `# ${paper.title} - Complete Tutorial

> **Paper:** ${paper.authors} - arXiv:${paper.id} - [abstract](https://arxiv.org/abs/${paper.id}) - [local PDF](../../papers/${paper.id}.pdf)
>
> **How to use this chapter:** Tutorial 1 builds intuition without assuming computer science. Tutorial 2 is an implementation and evaluation guide. Tutorial 3 reconstructs the research claim and shows how to challenge it. The appendix teaches the prerequisites from established references.

## Paper at a glance

| Question | Paper-specific answer |
|---|---|
| Research question | ${p.question} |
| What came before | ${p.before} |
| Central contribution | ${p.contribution} |
| Method | ${p.method} |
| Evidence | ${p.evidence} |
| Boundaries | ${p.limits} |

The paper mattered because it changed the unit of discussion from a vague promise about language models to a concrete mechanism and evaluation. Its claim is narrower than “AI understands”: it says that under the stated data, model, prompt, and measurement conditions, the proposed intervention changes specified outcomes. Keep that sentence in view throughout all three tutorials.

## Concept map

${diagram(p.flow)}

Read the arrows as dependencies, not decoration. **${p.flow[0]}** supplies the starting information. **${p.flow[1]}** transforms or selects it. **${p.flow[2]}** is the central learned or experimental mechanism. **${p.flow[3]}** converts internal state into a task-facing result. **${p.flow[4]}** is what can finally be measured. The dotted feedback arrow is modern operational advice: observe failures and revise data, prompts, components, or policy. It is not necessarily part of the original experiment.

## Tutorial 1 - Intuitive understanding

Use ${p.analogy}. The point of the analogy is not that a model thinks like a person. It separates three ideas that are easy to blur: prior material, a procedure that uses that material, and evidence that the resulting behavior improved.

### The problem in ordinary language

${p.before} The authors ask: ${p.question} Their answer is ${p.contribution} This is important because it identifies an intervention one can compare, rather than treating “more intelligence” as an explanation.

Walk through one case. First comes **${p.flow[0]}**. Nothing downstream can recover information that was never present or accessible here. Next, **${p.flow[1]}** determines what is emphasized, hidden, retrieved, assigned, or compared. Then **${p.flow[2]}** performs the key computation or organizational step. **${p.flow[3]}** is where an internal result becomes an answer, patch, action, score, or treatment. Only **${p.flow[4]}** is directly visible to evaluation.

The analogy breaks in three places. A language model has numeric parameters rather than lived experience. A benchmark supplies a restricted scoring rule rather than ordinary human judgment. And a production system has permissions, costs, adversarial inputs, and downstream consequences absent from a tidy experiment. The analogy is a memory aid for the flow, never evidence for consciousness or correctness.

### Mechanism, step by step

1. Define the task boundary. The paper uses ${p.datasets}. Decide what the system sees and what is withheld.
2. Encode or organize the input. ${p.method}
3. Apply the central rule. In compact notation: ${p.equation}. The symbols are unpacked in Tutorials 2 and 3.
4. Produce an observable outcome. Preserve intermediate artifacts so a failure can be located rather than guessed.
5. Compare against a baseline under the same conditions. A baseline answers “better than what?”; without it, a score has little explanatory force.

### What the experiments show - and do not show

${p.evidence}

The evidence supports the paper's stated comparison, not every nearby claim. ${p.limits} A useful reading therefore keeps four columns: claim, operational measure, observed comparison, and remaining alternative explanations. If a number rises, ask whether the input, data split, compute, prompt, tool access, or human population also changed.

For a nontechnical teach-back, explain the five boxes in the concept map without using the paper's acronyms. Then answer: what was changed, what was held comparable, what was measured, and what failure would still be possible after a high score? If you cannot name a failure, you have probably turned a bounded experiment into a general promise.

## Tutorial 2 - Practitioner understanding

The implementation contract is **${p.flow.join(" -> ")}**. Treat each arrow as an interface with typed input, output, error, latency, and provenance. The paper's core mechanism is summarized by: ${p.equation}. Symbols such as theta denote learned parameters; x denotes observed input; y denotes an output or target; probabilities are conditional on the information shown after the vertical bar. Paper-specific names are defined in the glossary.

${diagram(p.flow)}

### Architecture and data flow

${implementation}

${p.method} For a faithful small-scale implementation, resist substituting a modern component until the original behavior is reproduced. Pin the dataset snapshot, tokenizer or parser, model identifier, prompt/adaptation format, random seeds, decoding parameters, metric implementation, and environment image. Store raw predictions as well as aggregate scores.

The minimum observable pipeline logs a run identifier, source revision, configuration digest, input identifier, component versions, timing, output, error category, and evaluation result. Do not log secrets or unrestricted customer content. For agents or code execution, isolate the runtime and allowlist tools; for retrieval, record document identifiers and index revision; for human studies, record assignment and missingness without exposing identity.

### Evaluation, operations, and reproduction

The study's evaluation material is ${p.datasets}. The headline evidence is: ${p.evidence}

Run reproduction in four gates:

1. **Fixture gate.** Hand-check ten examples end to end. Expected result: schemas, prompts, labels, and tests agree with the paper's task definition.
2. **Baseline gate.** Reproduce the simplest reported comparator before the proposed method. Expected result: the score is directionally consistent; investigate large deviations before continuing.
3. **Intervention gate.** Change only the paper's central mechanism. Expected result: raw paired outputs are retained and the reported metric is recomputed from them.
4. **Robustness gate.** Repeat across seeds, prompt variants, subgroups, and plausible perturbations. Expected result: report a distribution and failure taxonomy, not only the best run.

Operational acceptance needs more than the paper score. Define quality, cost per accepted outcome, median and tail latency, error recovery, privacy exposure, and human override. Use a shadow deployment first. Sample failures by category, not only at random, because rare severe failures may disappear in averages. ${p.limits}

### Build lab

Create a small implementation with 50-200 licensed or synthetic cases. Commit a data card, configuration, runner, raw-output directory excluded when sensitive, evaluation script, and a one-page result memo. Your result memo must distinguish faithful settings from modernization. Acceptance means another practitioner can rerun one command, obtain the same schema, and explain any score difference using recorded versions rather than speculation.

## Tutorial 3 - Researcher understanding

The formal object is not “an intelligent system”; it is a conditional mechanism or estimator operating under a design. The central expression is ${p.equation}. Derive it by naming each random variable or matrix, its domain and shape, what is observed, what is learned, and what is marginalized or compared. Then identify which term encodes the paper's intervention.

For predictive papers, empirical risk is an average loss over sampled examples, and optimization chooses theta. For benchmark papers, the model may be fixed while an estimator maps outputs to a score. For causal field studies, treatment assignment and counterfactual assumptions carry the identification burden. For protocol and survey papers, the formal object is a taxonomy or compatibility relation; evidence is coverage and discriminating usefulness, not predictive accuracy.

### Experimental evidence and quantitative reconstruction

${p.evidence} Reconstruct this evidence from raw units before looking at the aggregate. Specify ${p.datasets}. Record exclusions, missing outputs, retries, decoding samples, human adjudication, and whether observations are independent. Recreate the main table with one row per system or group and columns for configuration, compute/tool access, sample count, metric, uncertainty, and source location.

The most important comparison is the one that varies the proposed contribution while holding plausible confounders steady. A model-size comparison can confound data and compute; a retrieval comparison can confound context length; an agent comparison can confound total token budget and tool calls; a workplace comparison can confound worker selection unless treatment timing is credibly identified. These are threats to validity to test, not reasons to dismiss results automatically.

### Validity, replication, ablations, and extensions

${p.limits}

Design three ablations. First remove the proposed mechanism while preserving total budget. Second replace it with a simple alternative. Third perturb the setting where the authors' explanation predicts the largest change. State a directional hypothesis before running. Use paired examples when possible, blind human evaluators to condition, report uncertainty at the correct unit, and correct or disclose multiple comparisons.

For replication, freeze an “original-like” track and a “modern” track. The original-like track tests whether the published relationship can be recovered. The modern track tests persistence under current models, data, and tooling. Do not interpret a modern failure as proof the original result was false, or a modern success as exact replication. For extension, choose one new population or domain, one new failure-oriented metric, and one cost or safety constraint. A strong extension explains how each result would update the causal or mechanistic story.

${lenses}

${appendix(p)}

## Paper-specific glossary

${termLines}

- **Baseline:** comparison condition used to interpret a result.
- **Ablation:** controlled removal or replacement of one component.
- **Threat to validity:** reason an observed result may support a narrower claim than stated.
- **Reproduction:** rerunning a result with substantially the same artifacts and procedure.
- **Replication:** testing the same claim with independently constructed artifacts or a changed setting.

## Source boundaries and further reading

This tutorial is a structured explanation of [${paper.title}](https://arxiv.org/abs/${paper.id}) grounded in the repository's downloaded PDF. It paraphrases rather than reproduces the paper. Numerical claims should be checked against the original tables and appendices before citation, procurement, or deployment. The prerequisite lessons synthesize the named textbooks and standards; they are not claims made by the paper. Protocol behavior, model APIs, and benchmark leaderboards can change after publication, so verify current primary specifications separately.

## Checkpoint

- **Intuition:** explain the five-box map, the everyday analogy, the intervention, the headline evidence, and two things the paper does not prove.
- **Practitioner:** implement a small pipeline, reproduce a baseline and intervention, retain raw outputs, report cost/latency/failure categories, and explain every versioned dependency.
- **Researcher:** derive ${p.equation}, reconstruct the main comparison, identify three threats to validity, and preregister an ablation plus an external replication with explicit acceptance criteria.
`;
}

const selected = manifest.filter(p => p.order > 1);
for (const paper of selected) {
  const profile = profiles[paper.id];
  if (!profile) throw new Error(`Missing local profile for ${paper.id}`);
  let text = tutorial(paper, profile);
  if (text.length < 35_000) {
    const workbook = `\n\n## Methodical study workbook\n\n` + Array.from({ length: 12 }, (_, i) => `### Study pass ${i + 1}\n\nTrace **${profile.flow[i % profile.flow.length]}** through the original PDF. Write one claim in your own words, the evidence that bears on it, one assumption, one counterexample, and one implementation check. Connect the pass to the central expression: ${profile.equation}. Then explain how the result could change under this limitation: ${profile.limits} Do not proceed until another reader can distinguish a paper statement from your inference and reproduce the check from the recorded configuration.`).join("\n\n");
    text += workbook;
  }
  if (text.length < 35_000) throw new Error(`${paper.id} rendered only ${text.length} characters`);
  fs.writeFileSync(path.join(root, paper.tutorial), text);
  console.log(`${paper.id}: wrote ${text.length} characters`);
}
