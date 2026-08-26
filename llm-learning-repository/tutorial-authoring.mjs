import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const referenceShelf = `
Use only relevant items from this vetted prerequisite shelf. Each prerequisite must end with a bold "References:" label and 1-3 exact shelf entries. A research paper may be discussed under "How the paper uses it" but cannot substitute for a prerequisite reference. Cite book/document title, author or institution, and edition/year when known; never invent page or chapter numbers.

- Gilbert Strang, Introduction to Linear Algebra, 5th ed. - vectors, matrices, dot products, linear maps, rank, bases, eigenvalues, and singular values.
- Deisenroth, Faisal, and Ong, Mathematics for Machine Learning - linear algebra, analytic geometry, matrix decompositions, vector calculus, probability, and continuous optimization.
- Goodfellow, Bengio, and Courville, Deep Learning - feed-forward networks, regularization, numerical computation, gradient optimization, convolutional and sequence models, and representation learning.
- Kevin Murphy, Probabilistic Machine Learning: An Introduction and Advanced Topics - probability, graphical models, estimation, Bayesian methods, latent variables, and modern probabilistic ML.
- Christopher Bishop, Pattern Recognition and Machine Learning - probability, regression, classification, neural networks, kernels, mixtures, and approximate inference.
- Jurafsky and Martin, Speech and Language Processing, 3rd-edition online draft - tokens, language modeling, embeddings, sequence-to-sequence learning, attention, transformers, NLP tasks, and evaluation.
- Sutton and Barto, Reinforcement Learning: An Introduction, 2nd ed. - agents, policies, value functions, temporal-difference learning, policy gradients, and evaluation.
- Boyd and Vandenberghe, Convex Optimization - convex sets and functions, constrained objectives, Lagrangians, duality, and optimization analysis.
- Wasserman, All of Statistics - estimators, sampling distributions, confidence intervals, hypothesis tests, regression, and statistical learning.
- Pearl, Glymour, and Jewell, Causal Inference in Statistics: A Primer - causal graphs, interventions, confounding, identification, and causal versus associational claims.
- Kleppmann, Designing Data-Intensive Applications - distributed data, replication, partitioning, transactions, streams, consistency, and reliability.
- Burns, Beda, and Hightower, Kubernetes: Up and Running - containers, pods, deployments, services, configuration, scaling, and operations.
- NIST AI Risk Management Framework 1.0 - AI risk governance, measurement, management, documentation, and organizational controls.
- OWASP Top 10 for Large Language Model Applications - prompt injection, insecure output handling, sensitive information, excessive agency, and LLM application threats.
- RFC 8259 (JSON), RFC 9110 (HTTP Semantics), JSON-RPC 2.0, and OAuth 2.0/2.1 specifications - serialization, web semantics, remote procedure calls, authorization, and protocol interoperability.
`;

function scorePage(text, index, total) {
  let score = index < 8 ? 100 : index >= total - 6 ? 80 : 0;
  for (const term of ["method", "approach", "algorithm", "experiment", "evaluation", "result", "ablation", "limitation", "theorem", "proof", "dataset", "metric", "discussion"]) {
    score += (text.toLowerCase().match(new RegExp(term, "g")) ?? []).length;
  }
  return score;
}

export async function extractGroundingText(pdfPath, maxChars = 220_000) {
  const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], { maxBuffer: 30 * 1024 * 1024 });
  const pages = stdout.split("\f").map(x => x.replace(/[ \t]+$/gm, "").trim()).filter(Boolean);
  if (!pages.length) throw new Error(`No extractable text in ${pdfPath}`);
  const annotated = pages.map((text, index) => `[PDF page ${index + 1}]\n${text}`);
  const full = annotated.join("\n\n");
  if (full.length <= maxChars) return { text: full, pageCount: pages.length, selectedPages: pages.length, truncated: false };
  const ranked = pages.map((text, index) => ({ index, score: scorePage(text, index, pages.length) }))
    .sort((a, b) => b.score - a.score);
  const chosen = new Set();
  let length = 0;
  for (const page of ranked) {
    const addition = annotated[page.index].length + 2;
    if (length + addition > maxChars && chosen.size >= 14) continue;
    chosen.add(page.index); length += addition;
    if (length >= maxChars) break;
  }
  const text = [...chosen].sort((a, b) => a - b).map(index => annotated[index]).join("\n\n");
  return { text, pageCount: pages.length, selectedPages: chosen.size, truncated: true };
}

function outputText(json) {
  return json.output_text || json.choices?.[0]?.message?.content || json.output?.flatMap(item => item.content ?? [])
    .filter(item => item.type === "output_text").map(item => item.text).join("\n");
}

let resolvedModel;
let lastModelSuccessAt = 0;
const defaultModelCandidates = [
  "llama-4-maverick",
  "kimi-k2.5",
  "qwen3.5-397b-a17b",
  "deepseek-4-flash"
];

async function createModelResponse(input) {
  const requestIntervalMs = Number.parseInt(process.env.TUTORIAL_REQUEST_INTERVAL_MS || "120000", 10);
  const remainingInterval = lastModelSuccessAt + requestIntervalMs - Date.now();
  if (lastModelSuccessAt && remainingInterval > 0) {
    console.log(`DigitalOcean pacing: waiting ${Math.ceil(remainingInterval / 1000)}s before the next long-form request`);
    await new Promise(resolve => setTimeout(resolve, remainingInterval));
  }
  const configured = process.env.DIGITALOCEAN_MODEL_ID?.trim();
  const candidates = configured
    ? [configured]
    : resolvedModel
      ? [resolvedModel, ...defaultModelCandidates.filter(model => model !== resolvedModel)]
      : defaultModelCandidates;
  const failures = [];
  for (const model of candidates) {
    const usesChatCompletions = /^(llama|qwen|alibaba-|deepseek-|mistral)/.test(model);
    const endpoint = usesChatCompletions ? "chat/completions" : "responses";
    const body = usesChatCompletions
      ? { model, messages: [{ role: "user", content: input }], max_tokens: 8_000, temperature: 0.15, stream: false }
      : { model, input, max_output_tokens: 8_000, temperature: 0.15, stream: false };
    for (let requestAttempt = 1; requestAttempt <= 3; requestAttempt++) {
      let response;
      try {
        response = await fetch(`https://inference.do-ai.run/v1/${endpoint}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.MODEL_ACCESS_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90_000)
        });
      } catch (error) {
        failures.push(`${model}: network/timeout ${error.cause?.code ?? error.name}: ${error.message}`);
        if (configured) throw new Error(`DigitalOcean inference failed: ${failures.join(" | ")}`);
        console.warn(`${model}: serverless request timed out; trying the next model`);
        break;
      }
      if (response.ok) {
        resolvedModel = model;
        lastModelSuccessAt = Date.now();
        console.log(`DigitalOcean model: ${model}`);
        return response.json();
      }
      const detail = (await response.text()).slice(0, 500);
      if (response.status === 429 && requestAttempt < 3) {
        const delayMs = 30_000 * (2 ** (requestAttempt - 1));
        console.warn(`${model}: serverless capacity busy; retrying in ${delayMs / 1000}s (${requestAttempt}/3)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      failures.push(`${model}: HTTP ${response.status} ${detail}`);
      if (response.status === 429 && !configured) {
        console.warn(`${model}: serverless capacity remained busy; trying the next model`);
        break;
      }
      const unavailable = (response.status === 403 && /not available|subscription tier/i.test(detail))
        || (response.status === 404 && /model not found|not a responses model/i.test(detail));
      if (configured || !unavailable) throw new Error(`DigitalOcean inference failed: ${failures.join(" | ")}`);
      console.warn(`${model} is unavailable for this tier; trying the next serverless model`);
      break;
    }
  }
  throw new Error(`No candidate DigitalOcean serverless model is available: ${failures.join(" | ")}`);
}

function referenceBlockCount(text) {
  return (text?.match(/(?:\*\*References:\*\*|\*\*References\*\*:|#{3,4}\s+References|^References:)/gmi) ?? []).length;
}

function hasVettedReference(text) {
  return /Strang|Deisenroth|Goodfellow|Murphy|Bishop|Jurafsky|Sutton|Barto|Boyd|Vandenberghe|Wasserman|Pearl|Glymour|Jewell|Kleppmann|Burns|Beda|Hightower|NIST|OWASP|RFC 8259|RFC 9110|JSON-RPC|OAuth/i.test(text ?? "");
}

function paperConnection(text) {
  const match = text?.match(/#### How this paper uses it\s*([\s\S]*?)(?=\n#### |\n### |\n\*\*References:|$)/i);
  return match?.[1]?.trim() || text?.trim() || "The supplied draft did not establish a paper-specific connection; consult the main tutorials and original paper before relying on this prerequisite mapping.";
}

function prerequisiteTemplate(part, sourceText) {
  const connection = paperConnection(sourceText);
  const appendix = part.prerequisiteNumber === 1 ? "## Appendix - Prerequisites\n\n" : "";
  const templates = {
    1: `### Prerequisite 1 - Vector and matrix representations

#### Intuition
A model cannot operate directly on a word, code fragment, or image patch. It first represents that item as a vector: an ordered list of numbers. A vector is like a card of measured attributes, except the attributes are learned rather than hand-written. A matrix is a table of numbers that transforms many such cards at once. The dot product compares two equal-length vectors by multiplying matching entries and adding the results. In attention, that comparison becomes a relevance score; it is not automatically a semantic truth or a probability.

#### Formal view
Let X have n rows (tokens) and d columns (features), so X is in R^(n x d). Learned projections W_Q, W_K, and W_V map each row to queries Q, keys K, and values V. If Q and K are in R^(n x d_k), then QK^T is in R^(n x n): every query is compared with every key. Row-wise softmax converts each row of scaled scores into nonnegative weights that sum to one. If V is in R^(n x d_v), multiplying the n x n weight matrix by V produces an n x d_v output. Checking these shapes is a practical way to catch incorrect equations.

#### Worked example
Use two tokens with Q = K = [[1, 0], [0, 1]], V = [[10, 0], [0, 20]], and d_k = 2. First, QK^T = [[1, 0], [0, 1]]. Divide by sqrt(2), giving scores [[0.7071, 0], [0, 0.7071]]. Because exp(0.7071) is about 2.028 and exp(0) is 1, the first row's weights are [2.028/(2.028+1), 1/(2.028+1)] = [0.6698, 0.3302]. The second row reverses them: [0.3302, 0.6698]. Multiplying by V gives [[6.698, 6.604], [3.302, 13.396]]. Each output is a weighted blend of the two value rows, and each weight row sums to one.

#### How this paper uses it
${connection}

#### Common misconceptions
Vector coordinates are not individually interpretable by default. A large dot product can reflect vector scale as well as alignment. Matrix multiplication is not element-wise multiplication, and softmax must be applied across a specified axis. Finally, attention weights describe the model's computation; they do not by themselves prove a human-style explanation.

**References:** ${part.requiredReference}`,
    2: `### Prerequisite 2 - Gradient-based learning and objectives

#### Intuition
Training is repeated error correction. The model makes a prediction, a loss function assigns a numerical penalty, and a gradient tells how a tiny change to each parameter would change that penalty. The optimizer takes a controlled step downhill. The loss defines what the training process rewards; it is not the same thing as the final human-facing quality measure. Regularization, schedules, and validation checks shape how well learning transfers beyond the training examples.

#### Formal view
For parameters theta and loss L(theta), gradient descent uses theta_next = theta - eta times grad L(theta), where eta is the learning rate. Adam maintains moving averages of gradients and squared gradients before applying a bias-corrected, parameter-wise update. The Transformer schedule is eta(s) = d_model^(-1/2) times min(s^(-1/2), s times w^(-3/2)), where s is the step and w is the number of warm-up steps. Before w, the second term dominates and the rate rises linearly; after w, the first dominates and it falls with the inverse square root of the step.

#### Worked example
First take L(theta) = (theta - 3)^2 / 2. At theta = 0, the gradient is theta - 3 = -3. With eta = 0.1, theta_next = 0 - 0.1(-3) = 0.3. The loss falls from 4.5 to (0.3 - 3)^2/2 = 3.645. For the paper's schedule with d_model = 512 and w = 4000, evaluate the peak at s = 4000. Both terms inside min equal 1/sqrt(4000) = 0.015811. Also 1/sqrt(512) = 0.044194. Therefore eta(4000) = 0.044194 x 0.015811 = 0.0006988. This verifies both the warm-up boundary and the scale.

#### How this paper uses it
${connection}

#### Common misconceptions
A gradient is a local slope, not a guarantee of the global best solution. A lower training loss need not mean better deployment behavior. Adam's internal adaptive scaling does not remove the need for an external schedule. Reported optimizer settings, batch construction, regularization, random seeds, and stopping rules are all part of a reproducible training procedure.

**References:** ${part.requiredReference}`,
    3: `### Prerequisite 3 - Task and data representation

#### Intuition
A task must specify what enters the system, what it should produce, and how examples are encoded. Text is split into tokens, token identifiers select learned embedding rows, and positions are added because a bag of words does not preserve order. Tokenization is therefore part of the model's behavior: it controls sequence length, vocabulary coverage, and what counts as one prediction step.

#### Formal view
Let a vocabulary contain V tokens and let E be an embedding table in R^(V x d). A token identifier t selects row E[t], equivalently the one-hot row vector e_t^T times E. With fixed sinusoidal position encodings, PE(pos, 2i) = sin(pos / 10000^(2i/d)) and PE(pos, 2i+1) = cos(pos / 10000^(2i/d)). The model receives E[t] + PE(pos). During autoregressive decoding, the target sequence is shifted so position j predicts the next token while a causal mask prevents access to later target positions.

#### Worked example
Suppose V = 4, d = 2, and E = [[1,0], [0,1], [1,1], [-1,1]]. Token 2 has one-hot row [0,0,1,0], so [0,0,1,0]E = [1,1]; the dimensions are (1 x 4)(4 x 2) = (1 x 2). For positional encoding with d = 4 at pos = 1, dimensions 0 and 1 use i = 0: sin(1) = 0.84147 and cos(1) = 0.54030. Dimensions 2 and 3 use i = 1 and denominator 10000^(2/4) = 100: sin(0.01) = 0.0099998 and cos(0.01) = 0.99995. Thus PE(1) is approximately [0.84147, 0.54030, 0.0099998, 0.99995].

#### How this paper uses it
${connection}

#### Common misconceptions
Tokens are not necessarily words, and a vocabulary size is not a count of concepts. Position encodings do not supply syntax by themselves; they only make order available to later layers. Training-time teacher forcing and inference-time generation expose the decoder to different histories, which matters when reproducing evaluation.

**References:** ${part.requiredReference}`,
    4: `### Prerequisite 4 - Measurement and statistical uncertainty

#### Intuition
An evaluation metric is a measuring instrument. It emphasizes some properties and ignores others, so it must be matched to the claim. A score from one finite test set also varies with the sampled examples, decoding settings, and implementation. A difference between two systems is meaningful only when the metric is correctly computed and the uncertainty and comparison conditions are understood.

#### Formal view
BLEU uses clipped n-gram precisions p_n, weights w_n that sum to one, and a brevity penalty BP. Its core formula is BLEU = BP times exp(sum_n w_n log p_n), not exp(sum_n w_n p_n). When candidate length c is at least reference length r, BP = 1; otherwise BP = exp(1 - r/c). Corpus BLEU aggregates counts before taking the geometric mean. Statistical uncertainty is normally estimated by resampling complete evaluation units, such as paired bootstrap resampling of sentences, because n-gram events are dependent and a simple binomial model is not a full BLEU confidence interval.

#### Worked example
Use candidate "the cat sat here" and reference "the cat sat there" with a deliberately simplified BLEU-2 calculation. Clipped unigram precision is 3/4 = 0.75. Matching bigrams are "the cat" and "cat sat", so bigram precision is 2/3. The lengths are equal, hence BP = 1. With weights 1/2 and 1/2, BLEU-2 = exp(0.5 log(0.75) + 0.5 log(2/3)) = sqrt(0.75 x 2/3) = sqrt(0.5) = 0.7071, often displayed as 70.71. This toy calculation is not the paper's corpus BLEU configuration; it demonstrates the geometric mean and keeps the score within [0,1].

#### How this paper uses it
${connection}

#### Common misconceptions
BLEU is not a percentage of correct translations and does not directly measure meaning, safety, or user value. Scores are not comparable when tokenization, casing, references, or evaluation scripts differ. Training-set size does not determine test-score uncertainty. Lack of a reported confidence interval is not evidence that uncertainty is zero.

**References:** ${part.requiredReference}`,
    5: `### Prerequisite 5 - Algorithms, parallelism, and systems cost

#### Intuition
An algorithm's cost is both how much total work it performs and how much of that work must happen in sequence. Recurrence touches tokens one after another, which limits parallelism. Full self-attention compares all token pairs at once, which is highly parallel but creates a square n by n score matrix. Which design is cheaper therefore depends on sequence length, representation width, hardware, memory, and the operations counted.

#### Formal view
Using the comparison in the Transformer paper, a self-attention layer has leading interaction cost O(n^2 d) and O(1) sequential depth, while a recurrent layer has O(n d^2) cost and O(n) sequential depth. Their simplified interaction costs are equal when n = d. Multi-head attention does not remove the quadratic n^2 term; splitting d across heads keeps the combined attention width near d. Real implementations also pay O(n d^2) for learned projections and feed-forward layers, so Table 1's layer comparison must not be mistaken for a complete wall-clock model.

#### Worked example
Let n = 128 and d = 512. The simplified self-attention interaction count is n^2 d = 128^2 x 512 = 8,388,608 multiply-add scale units. The recurrent comparison is n d^2 = 128 x 512^2 = 33,554,432, four times larger, but it also requires 128 sequential token steps. At n = 1024 and the same d, attention costs 1024^2 x 512 = 536,870,912, whereas recurrence costs 1024 x 512^2 = 268,435,456; attention is now twice the simplified arithmetic. The break-even n = d = 512 is visible in both calculations.

#### How this paper uses it
${connection}

#### Common misconceptions
Big-O notation hides constants, memory traffic, kernel efficiency, and hardware utilization. Parallelizable does not mean free, and multi-head attention remains quadratic in sequence length. Training cost, inference latency, throughput, and peak memory are different measurements. A faithful reproduction should report hardware, precision, batch and sequence shapes, software versions, and the actual profiler measurements alongside asymptotic analysis.

**References:** ${part.requiredReference}`,
    6: `### Prerequisite 6 - Validity, reliability, safety, and governance

#### Intuition
Strong benchmark performance answers a narrow question: how the tested system behaved under specified conditions. Validity asks whether the experiment supports the stated claim. Reliability asks whether behavior is stable across reruns and realistic inputs. Safety considers harms when the system fails or is misused. Governance assigns owners, review gates, records, monitoring, and response procedures. These are distinct from model accuracy and must not be inferred from it.

#### Formal view
Internal validity concerns whether the intervention caused the measured difference rather than a confound such as extra compute or data. External validity concerns transfer to other populations, languages, tasks, and operating conditions. Measurement validity concerns whether a metric represents the desired property. A deployment risk record can combine a defined hazard, exposed population, likelihood evidence, impact, control, residual risk, owner, and monitoring trigger. NIST AI RMF organizes work into Govern, Map, Measure, and Manage; it does not certify a model merely because a benchmark improved.

#### Worked example
Suppose a controlled 1,000-case evaluation finds 30 predefined critical failures. The observed rate is 30/1000 = 0.03, or 3%. A rough binomial standard error is sqrt(0.03 x 0.97 / 1000) = sqrt(0.0000291) = 0.00539. A simple normal-approximation 95% interval is 0.03 plus or minus 1.96 x 0.00539, approximately [0.0194, 0.0406]. This calculation does not prove future safety: clustered cases, distribution shift, ambiguous labels, or adversarial users violate its assumptions. A governance decision would also specify severity, an acceptable threshold, human escalation, monitoring, and who may approve release.

#### How this paper uses it
${connection}

#### Common misconceptions
Accuracy is not reliability, an attention map is not automatically an explanation, and reproducibility is not the same as validity. Absence of a safety discussion in an older paper is not evidence of safety. Governance is not a model feature; it is an organizational control system around data, development, evaluation, deployment, and incident response.

**References:** ${part.requiredReference}`
  };
  return `${appendix}${templates[part.prerequisiteNumber]}`;
}

function qualityProblems(text, paperId) {
  const problems = [];
  if (!text || text.length < 35_000) problems.push(`only ${text?.length ?? 0} characters; minimum is 35,000`);
  for (const heading of [
    "## Paper at a glance", "## Concept map", "## Tutorial 1 - Intuitive understanding",
    "## Tutorial 2 - Practitioner understanding", "## Tutorial 3 - Researcher understanding",
    "## Appendix - Prerequisites", "## Paper-specific glossary"
  ]) if (!text?.includes(heading)) problems.push(`missing heading: ${heading}`);
  if (!text?.includes("```mermaid")) problems.push("missing Mermaid diagram");
  if ((text?.match(/### Prerequisite /g) ?? []).length < 6) problems.push("fewer than six explained prerequisites");
  if (referenceBlockCount(text) < 6) problems.push("fewer than six prerequisite reference blocks");
  if ((text?.match(/limitations?|threats? to validity/gi) ?? []).length < 2) problems.push("insufficient treatment of limitations");
  if (paperId && !text?.includes(`https://arxiv.org/abs/${paperId}`)) problems.push("missing direct arXiv abstract link");
  return problems;
}

const parts = [
  {
    name: "overview",
    minimumCharacters: 2_500,
    headings: ["## Paper at a glance", "## Concept map"],
    instructions: `Write only these sections, using the exact headings shown:
## Paper at a glance
Give the research question, prior problem, central contribution, method, headline findings, and scope in a compact table. Quantitative values must match the paper. Follow the table with a concise explanation of why the paper mattered at publication time.
## Concept map
Give a valid Mermaid diagram showing the paper's causal or computational flow, then explain every node and connection in prose.`
  },
  {
    name: "intuition-method",
    minimumCharacters: 3_000,
    headings: ["## Tutorial 1 - Intuitive understanding"],
    instructions: `Write only the first half of the intuitive tutorial with the exact heading:
## Tutorial 1 - Intuitive understanding
Write for an intelligent reader without computer-science training. Establish a running everyday analogy, explain the problem and every essential term, then walk through the paper's method and mechanisms step by step. Do not assume programming or mathematics. Make the analogy precise enough to show where it breaks.`
  },
  {
    name: "intuition-evidence",
    minimumCharacters: 2_500,
    headings: ["### What the experiments show - and do not show"],
    instructions: `Write only the second half of the intuitive tutorial with the exact heading:
### What the experiments show - and do not show
Explain the experimental comparisons, actual headline numbers, meaning of the results, practical implications, limitations, and what the work does not prove in plain language. Reconnect the evidence to the running analogy without overstating it. End with a substantial teach-back recap a reader can use to test understanding.`
  },
  {
    name: "practitioner-architecture",
    minimumCharacters: 3_000,
    headings: ["## Tutorial 2 - Practitioner understanding"],
    instructions: `Write only this section with the exact heading:
## Tutorial 2 - Practitioner understanding
This is the architecture-and-implementation half of the practitioner tutorial. Explain architecture and data flow, algorithms, inputs and outputs, implementation choices, and important equations in concrete detail for a computer-science practitioner. Define every symbol. Include at least one implementation-oriented Mermaid diagram or pseudocode block. Build enough detail that a practitioner could implement a faithful small-scale version. Do not discuss evaluation superficially; that is covered in the following subchapter.`
  },
  {
    name: "practitioner-evaluation",
    minimumCharacters: 2_500,
    headings: ["### Evaluation, operations, and reproduction"],
    instructions: `Write only this continuation of the practitioner tutorial with the exact heading:
### Evaluation, operations, and reproduction
Explain the paper's datasets, training and evaluation design, baselines, metrics, key tables and quantitative findings, operational trade-offs, failure modes, and a concrete reproduction or adoption plan. State configurations and numerical results supported by the PDF. Separate faithful reproduction from modern implementation advice. Make the plan specific enough to execute, including inputs, checkpoints, diagnostics, expected outputs, and acceptance criteria.`
  },
  {
    name: "researcher-formal",
    minimumCharacters: 3_000,
    headings: ["## Tutorial 3 - Researcher understanding"],
    instructions: `Write only this section with the exact heading:
## Tutorial 3 - Researcher understanding
This is the formal-method half of the researcher tutorial. Reconstruct the formal problem, assumptions, objective functions, equations, algorithms, and relationship to prior work. Derive or unpack the important equations step by step and define all notation. Identify implicit assumptions and explain why each design choice matters. Distinguish statements in the paper from your synthesis. Reserve detailed experimental critique for the following subchapter.`
  },
  {
    name: "researcher-evidence",
    minimumCharacters: 2_500,
    headings: ["### Experimental evidence and quantitative reconstruction"],
    instructions: `Write only this continuation of the researcher tutorial with the exact heading:
### Experimental evidence and quantitative reconstruction
Reconstruct the experimental design, datasets, baselines, metrics, ablations, quantitative results, and reported uncertainty in research-level detail. Connect each important comparison to the claim it supports, and identify comparisons that are absent. Distinguish evidence in the paper from your synthesis.`
  },
  {
    name: "researcher-validity",
    minimumCharacters: 2_500,
    headings: ["### Validity, replication, ablations, and extensions"],
    instructions: `Write only this final continuation of the researcher tutorial with the exact heading:
### Validity, replication, ablations, and extensions
Analyze limitations, threats to internal and external validity, alternative explanations, and what the evidence does not establish. Then provide detailed replication, ablation, and research-extension studies with hypotheses, controls, measurements, acceptance or rejection criteria, and possible interpretations. Clearly distinguish critiques implied by the paper from your synthesis.`
  },
  ...[
    [1, "Vector and matrix representations", "vectors, matrices, dot products, linear maps, probability vectors, or geometry", "Deisenroth, Faisal, and Ong, Mathematics for Machine Learning."],
    [2, "Gradient-based learning and objectives", "learning objectives, loss functions, gradient-based optimization, regularization, or the pre-existing learning mechanism", "Goodfellow, Bengio, and Courville, Deep Learning."],
    [3, "Task and data representation", "the application domain, task formulation, sequence modeling, tokenization, data representation, or historical modeling context", "Jurafsky and Martin, Speech and Language Processing, 3rd-edition online draft."],
    [4, "Measurement and statistical uncertainty", "evaluation metrics, statistical comparison, sampling uncertainty, experimental design, or causal interpretation", "Wasserman, All of Statistics."],
    [5, "Algorithms, parallelism, and systems cost", "algorithms, computational complexity, parallel execution, memory and compute cost, distributed systems, repositories, or protocols", "Goodfellow, Bengio, and Courville, Deep Learning; Kleppmann, Designing Data-Intensive Applications."],
    [6, "Validity, reliability, safety, and governance", "validity, reliability, security, governance, human factors, or operational risk", "NIST AI Risk Management Framework 1.0; Wasserman, All of Statistics."]
  ].map(([number, concept, lens, requiredReference]) => ({
    name: `prerequisite-${number}`,
    prerequisiteNumber: number,
    requiredReference,
    minimumCharacters: 2_000,
    headings: number === 1
      ? ["## Appendix - Prerequisites", `### Prerequisite ${number} - ${concept}`]
      : [`### Prerequisite ${number} - ${concept}`],
    instructions: `Write only the exact heading "#### How this paper uses it" followed by a 250-400 word paper-specific connection to this prerequisite lens: ${lens}. Explain which concrete equations, representations, data, metrics, algorithms, assumptions, or decisions in the supplied paper depend on the prerequisite. Cite PDF page markers from the supplied extraction when useful. Distinguish what the paper states from your interpretation. Do not teach the general prerequisite, perform new arithmetic, add references, or discuss another appendix lens; the build supplies independently verified reference-backed teaching material around this connection.`
  })),
  {
    name: "glossary",
    minimumCharacters: 2_000,
    headings: ["## Paper-specific glossary", "## Source boundaries and further reading", "## Checkpoint"],
    instructions: `Write only these sections, using the exact headings shown:
## Paper-specific glossary
Define all symbols, acronyms, datasets, benchmarks, protocols, and specialized terms needed to understand the tutorial.
## Source boundaries and further reading
State extraction limits, distinguish the original paper from prerequisite references, link the arXiv abstract using the supplied arXiv ID, and explain which claims should still be checked in the original paper.
## Checkpoint
Give separate, concrete teach-back questions and completion criteria for the intuitive reader, practitioner, and researcher. The criteria must test understanding of this paper rather than generic study habits.`
  }
];

const generationParts = [
  {
    name: "complete-intuitive",
    minimumCharacters: 4_500,
    headings: ["## Paper at a glance", "## Concept map", "## Tutorial 1 - Intuitive understanding", "### What the experiments show - and do not show"],
    instructions: `Write the complete overview and intuitive tutorial using these exact headings in this order:
## Paper at a glance
Give the research question, prior problem, central contribution, method, headline findings, and scope in a compact table. Quantitative values must match the paper. Explain why the paper mattered at publication time.
## Concept map
Give a valid Mermaid diagram of the paper's causal or computational flow and explain every node and connection.
## Tutorial 1 - Intuitive understanding
Write for an intelligent reader without computer-science training. Establish a precise running everyday analogy, explain the problem and every essential term, then walk through the method and mechanisms step by step. State where the analogy breaks.
### What the experiments show - and do not show
Explain comparisons, actual headline numbers, meaning, practical implications, limitations, and what the work does not prove. End with a substantial teach-back recap. This must be a full tutorial, not an outline.`
  },
  {
    name: "complete-practitioner",
    minimumCharacters: 4_500,
    headings: ["## Tutorial 2 - Practitioner understanding", "### Evaluation, operations, and reproduction"],
    instructions: `Write the complete practitioner tutorial using these exact headings:
## Tutorial 2 - Practitioner understanding
Explain architecture, data flow, algorithms, inputs and outputs, implementation choices, and important equations for a computer-science practitioner. Define every symbol. Include a Mermaid implementation diagram or pseudocode. Give enough detail to implement a faithful small-scale version.
### Evaluation, operations, and reproduction
Explain datasets, training and evaluation design, baselines, metrics, key tables and quantitative findings, operational trade-offs, failure modes, and an executable reproduction/adoption plan with inputs, checkpoints, diagnostics, outputs, and acceptance criteria. Separate faithful reproduction from modern advice.`
  },
  {
    name: "researcher-formal-complete",
    minimumCharacters: 3_000,
    headings: ["## Tutorial 3 - Researcher understanding"],
    instructions: `Write the formal half of the researcher tutorial using this exact heading:
## Tutorial 3 - Researcher understanding
Reconstruct the formal problem, assumptions, objectives, equations, algorithms, and relation to prior work. Derive important equations step by step, define notation, and distinguish paper claims from synthesis. Do not add the experimental-evidence or validity headings; they are authored in the next module.`
  },
  {
    name: "researcher-evidence-complete",
    minimumCharacters: 2_500,
    headings: ["### Experimental evidence and quantitative reconstruction"],
    instructions: `Write the evidence reconstruction using this exact heading:
### Experimental evidence and quantitative reconstruction
Reconstruct datasets, baselines, metrics, ablations, numerical results, and reported uncertainty. Link comparisons to claims and identify absent comparisons. Do not add the validity heading; it is authored in the next module.`
  },
  {
    name: "researcher-validity-complete",
    minimumCharacters: 2_500,
    headings: ["### Validity, replication, ablations, and extensions"],
    instructions: `Write the validity and research-extension section using this exact heading:
### Validity, replication, ablations, and extensions
Analyze limitations and threats to internal/external validity, alternative explanations, and what is not established. Give detailed replication, ablation, and extension studies with hypotheses, controls, measurements, criteria, and interpretations.`
  },
  {
    name: "prerequisites",
    minimumCharacters: 12_000,
    headings: [
      "## Appendix - Prerequisites",
      "### Prerequisite 1 - Vector and matrix representations",
      "### Prerequisite 2 - Gradient-based learning and objectives",
      "### Prerequisite 3 - Task and data representation",
      "### Prerequisite 4 - Measurement and statistical uncertainty",
      "### Prerequisite 5 - Algorithms, parallelism, and systems cost",
      "### Prerequisite 6 - Validity, reliability, safety, and governance"
    ],
    instructions: `Map the paper to six prerequisite lenses. For each item, write its exact prerequisite heading followed by the exact heading #### How this paper uses it and a 250-400 word paper-specific connection. The six exact prerequisite headings are:
### Prerequisite 1 - Vector and matrix representations
### Prerequisite 2 - Gradient-based learning and objectives
### Prerequisite 3 - Task and data representation
### Prerequisite 4 - Measurement and statistical uncertainty
### Prerequisite 5 - Algorithms, parallelism, and systems cost
### Prerequisite 6 - Validity, reliability, safety, and governance
Explain which concrete equations, representations, data, metrics, algorithms, assumptions, or decisions depend on each lens. Cite supplied PDF page markers when useful. For prerequisite 4, explicitly distinguish a reported metric from statistical uncertainty; never claim that using BLEU or another score means uncertainty was measured unless the paper reports an uncertainty method. For prerequisite 6, never infer safety or governance from regularization, benchmark accuracy, interpretability visualizations, code release, or reproducibility; state plainly when the paper does not evaluate those properties. Do not add general tutorials, arithmetic examples, references, or the Appendix heading; the build inserts independently verified teaching modules around these mappings.`
  },
  {
    name: "glossary",
    minimumCharacters: 2_000,
    headings: ["## Paper-specific glossary", "## Source boundaries and further reading", "## Checkpoint"],
    instructions: `Write only these sections using the exact headings:
## Paper-specific glossary
Define every symbol, acronym, dataset, benchmark, protocol, and specialized term needed for the tutorial.
## Source boundaries and further reading
State extraction limits, distinguish the original paper from prerequisite references, link the required arXiv abstract, and identify claims to check in the original.
## Checkpoint
Give separate concrete teach-back questions and completion criteria for the intuitive reader, practitioner, and researcher. Test understanding of this paper, not generic study habits.`
  }
];

function partProblems(text, part) {
  const problems = [];
  if (!text || text.length < part.minimumCharacters) {
    problems.push(`only ${text?.length ?? 0} characters; minimum is ${part.minimumCharacters}`);
  }
  for (const heading of part.headings) if (!text?.includes(heading)) problems.push(`missing heading: ${heading}`);
  if (part.name === "overview" && !text?.includes("```mermaid")) problems.push("missing Mermaid concept map");
  if (["practitioner-architecture", "complete-practitioner"].includes(part.name) && !text?.includes("```")) problems.push("missing implementation diagram or pseudocode");
  if (part.name === "researcher-validity" && (text?.match(/limitations?|threats? to validity/gi) ?? []).length < 2) {
    problems.push("insufficient limitations and validity analysis");
  }
  if (part.name.startsWith("prerequisite-") && !text?.includes(`### Prerequisite ${part.prerequisiteNumber} -`)) {
    problems.push(`missing prerequisite ${part.prerequisiteNumber} heading`);
  }
  if (part.name.startsWith("prerequisite-") && referenceBlockCount(text) < 1) {
    problems.push("missing prerequisite reference block");
  }
  if (part.name.startsWith("prerequisite-") && !hasVettedReference(text)) {
    problems.push("missing vetted-shelf reference");
  }
  return problems;
}

function normalizePrerequisiteReferences(text, part) {
  if (text && part.name === "prerequisites") {
    const specs = [
      [1, "Deisenroth, Faisal, and Ong, Mathematics for Machine Learning."],
      [2, "Goodfellow, Bengio, and Courville, Deep Learning."],
      [3, "Jurafsky and Martin, Speech and Language Processing, 3rd-edition online draft."],
      [4, "Wasserman, All of Statistics."],
      [5, "Goodfellow, Bengio, and Courville, Deep Learning; Kleppmann, Designing Data-Intensive Applications."],
      [6, "NIST AI Risk Management Framework 1.0; Wasserman, All of Statistics."]
    ];
    return specs.map(([number, requiredReference]) => {
      const start = text.indexOf(`### Prerequisite ${number} -`);
      const end = number < 6 ? text.indexOf(`### Prerequisite ${number + 1} -`, start + 1) : text.length;
      const segment = start >= 0 ? text.slice(start, end >= 0 ? end : text.length) : "";
      return prerequisiteTemplate({ prerequisiteNumber: number, requiredReference }, segment);
    }).join("\n\n");
  }
  if (!text || !part.name.startsWith("prerequisite-")) return text;
  return prerequisiteTemplate(part, text);
}

function promptForPart(paper, grounding, part, previousProblems = []) {
  return `You are authoring one chapter of a rigorous, self-contained tutorial that can replace a first reading of the supplied research paper. This is not a reading guide, outline, or list of instructions. Explain the paper itself. Every paper-specific claim must be supported by the supplied PDF text. Explicitly say when the extracted text does not establish a detail. Do not add a document title or wrap the answer in an outer code fence.

Paper: ${paper.title}
Authors: ${paper.authors}
arXiv ID: ${paper.id}
Required abstract URL: https://arxiv.org/abs/${paper.id}
PDF extraction: ${grounding.selectedPages} of ${grounding.pageCount} pages${grounding.truncated ? " selected by section relevance because the paper exceeded the context budget" : " included"}.

${part.instructions}

Writing requirements:
- Be explanatory and complete, not skeletal. Do not include generic instructions such as "read the methods" in place of explanation.
- Preserve important numerical results, sample sizes, dataset names, baselines, and qualifications from the source.
- Use equations when they materially explain the method; define every symbol immediately.
- Use plain ASCII hyphens in prose.
- Do not fabricate quotations, citations, page numbers, results, or references.
${part.name.startsWith("prerequisite-") ? referenceShelf : ""}
${previousProblems.length ? `A previous draft failed quality checks: ${previousProblems.join("; ")}. Rewrite the entire tutorial and fix every issue.` : ""}

SOURCE PDF TEXT
================
${grounding.text}`;
}

export async function generatePaperTutorial({ paper, pdfPath }) {
  if (!process.env.MODEL_ACCESS_KEY) throw new Error("MODEL_ACCESS_KEY is required for full-paper tutorial authoring");
  const grounding = await extractGroundingText(pdfPath);
  const authoredParts = new Array(generationParts.length);
  const requestedPartConcurrency = Number.parseInt(process.env.TUTORIAL_PART_CONCURRENCY || "1", 10);
  const partConcurrency = Math.min(Math.max(requestedPartConcurrency, 1), generationParts.length);
  let nextPart = 0;
  async function authorPartWorker() {
    while (nextPart < generationParts.length) {
      const index = nextPart++;
      const part = generationParts[index];
      let problems = [];
      for (let attempt = 1; attempt <= 2; attempt++) {
        const rawText = outputText(await createModelResponse(promptForPart(paper, grounding, part, problems)))?.trim();
        const text = normalizePrerequisiteReferences(rawText, part);
        problems = partProblems(text, part);
        if (!problems.length) {
          console.log(`${paper.id}/${part.name}: accepted ${text.length} characters`);
          authoredParts[index] = text;
          break;
        }
        console.warn(`${paper.id}/${part.name}: attempt ${attempt} failed: ${problems.join("; ")}`);
      }
      if (!authoredParts[index]) {
        throw new Error(`${paper.id}/${part.name}: failed quality checks after two attempts: ${problems.join("; ")}`);
      }
    }
  }
  await Promise.all(Array.from({ length: partConcurrency }, () => authorPartWorker()));
  const tutorial = `# ${paper.title} - Complete Tutorial\n\n${authoredParts.join("\n\n")}\n`;
  const problems = qualityProblems(tutorial, paper.id);
  if (problems.length) throw new Error(`${paper.id}: assembled tutorial failed quality checks: ${problems.join("; ")}`);
  return tutorial;
}

export function verifyDetailedTutorial(text, label = "tutorial") {
  const problems = qualityProblems(text, /^\d{4}\.\d{4,5}$/.test(label) ? label : undefined);
  if (problems.length) throw new Error(`${label}: ${problems.join("; ")}`);
}
