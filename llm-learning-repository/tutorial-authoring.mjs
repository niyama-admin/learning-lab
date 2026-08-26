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
const defaultModelCandidates = [
  "qwen3.5-397b-a17b",
  "llama-4-maverick",
  "deepseek-4-flash",
  "kimi-k2.5"
];

async function createModelResponse(input) {
  const configured = process.env.DIGITALOCEAN_MODEL_ID?.trim();
  const candidates = resolvedModel ? [resolvedModel] : configured ? [configured] : defaultModelCandidates;
  const failures = [];
  for (const model of candidates) {
    const usesChatCompletions = /^(llama|qwen|alibaba-|deepseek-|mistral)/.test(model);
    const endpoint = usesChatCompletions ? "chat/completions" : "responses";
    const body = usesChatCompletions
      ? { model, messages: [{ role: "user", content: input }], max_tokens: 14_000, temperature: 0.15, stream: false }
      : { model, input, max_output_tokens: 14_000, temperature: 0.15, stream: false };
    for (let requestAttempt = 1; requestAttempt <= 4; requestAttempt++) {
      const response = await fetch(`https://inference.do-ai.run/v1/${endpoint}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.MODEL_ACCESS_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20 * 60 * 1000)
      });
      if (response.ok) {
        resolvedModel = model;
        console.log(`DigitalOcean model: ${model}`);
        return response.json();
      }
      const detail = (await response.text()).slice(0, 500);
      if (response.status === 429 && requestAttempt < 4) {
        const delayMs = 15_000 * (2 ** (requestAttempt - 1));
        console.warn(`${model}: serverless capacity busy; retrying in ${delayMs / 1000}s (${requestAttempt}/4)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      failures.push(`${model}: HTTP ${response.status} ${detail}`);
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

function qualityProblems(text, paperId) {
  const problems = [];
  if (!text || text.length < 45_000) problems.push(`only ${text?.length ?? 0} characters; minimum is 45,000`);
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
    [1, "mathematical representations such as vectors, matrices, probability, or geometry", "Deisenroth, Faisal, and Ong, Mathematics for Machine Learning."],
    [2, "learning, optimization, loss functions, or the pre-existing mechanism on which the contribution builds", "Goodfellow, Bengio, and Courville, Deep Learning."],
    [3, "the paper's application domain, task formulation, data representation, or historical modeling context", "Jurafsky and Martin, Speech and Language Processing, 3rd-edition online draft."],
    [4, "evaluation metrics, statistical comparison, uncertainty, experimental design, or causal interpretation", "Wasserman, All of Statistics."],
    [5, "implementation, algorithms, computational complexity, distributed systems, repositories, or protocols", "Goodfellow, Bengio, and Courville, Deep Learning; Kleppmann, Designing Data-Intensive Applications."],
    [6, "validity, reliability, security, governance, human factors, or operational risk", "NIST AI Risk Management Framework 1.0; Wasserman, All of Statistics."]
  ].map(([number, lens, requiredReference]) => ({
    name: `prerequisite-${number}`,
    prerequisiteNumber: number,
    requiredReference,
    minimumCharacters: 2_000,
    headings: number === 1 ? ["## Appendix - Prerequisites"] : [],
    instructions: `Write only prerequisite ${number}. ${number === 1 ? "Begin with the exact heading ## Appendix - Prerequisites, followed by" : "Begin with"} a heading of the form "### Prerequisite ${number} - Specific concept name".
Choose one prerequisite from this distinct lens: ${lens}. The other five appendix entries cover the other five lenses, so do not drift into them or repeat them. If this lens truly does not apply, choose the nearest necessary non-overlapping prerequisite and explain why it is needed. Do not use the paper's novel contribution as its own prerequisite.

Make this a self-contained mini-tutorial of roughly 450-700 words with all of these labeled subsections: "Intuition", "Formal view", "Worked example", "How this paper uses it", "Common misconceptions", and "References". The worked example must show intermediate steps, not merely state an answer. Recompute every matrix operation, probability, metric, and arithmetic result before answering; if an example cannot be verified, replace it with one you can verify. End with a bold "References:" line containing 1-3 exact entries from the vetted shelf. Do not cite anything outside the shelf and do not invent page or chapter numbers.`
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

function partProblems(text, part) {
  const problems = [];
  if (!text || text.length < part.minimumCharacters) {
    problems.push(`only ${text?.length ?? 0} characters; minimum is ${part.minimumCharacters}`);
  }
  for (const heading of part.headings) if (!text?.includes(heading)) problems.push(`missing heading: ${heading}`);
  if (part.name === "overview" && !text?.includes("```mermaid")) problems.push("missing Mermaid concept map");
  if (part.name === "practitioner-architecture" && !text?.includes("```")) problems.push("missing implementation diagram or pseudocode");
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
  if (!text || !part.name.startsWith("prerequisite-")) return text;
  const marker = /(?:\*\*References:\*\*|\*\*References\*\*:|#{3,4}\s+References|^References:)/gmi;
  const matches = [...text.matchAll(marker)];
  const body = matches.length ? text.slice(0, matches.at(-1).index).trimEnd() : text.trimEnd();
  return `${body}\n\n**References:** ${part.requiredReference}`;
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
${part.name.startsWith("prerequisite-") || part.name === "glossary" ? referenceShelf : ""}
${previousProblems.length ? `A previous draft failed quality checks: ${previousProblems.join("; ")}. Rewrite the entire tutorial and fix every issue.` : ""}

SOURCE PDF TEXT
================
${grounding.text}`;
}

export async function generatePaperTutorial({ paper, pdfPath }) {
  if (!process.env.MODEL_ACCESS_KEY) throw new Error("MODEL_ACCESS_KEY is required for full-paper tutorial authoring");
  const grounding = await extractGroundingText(pdfPath);
  const authoredParts = new Array(parts.length);
  const partConcurrency = Math.min(2, parts.length);
  let nextPart = 0;
  async function authorPartWorker() {
    while (nextPart < parts.length) {
      const index = nextPart++;
      const part = parts[index];
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
