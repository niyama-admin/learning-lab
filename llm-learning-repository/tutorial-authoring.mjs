import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const referenceShelf = `
Use only relevant items from this vetted prerequisite shelf. Cite book/document title, author or institution, and edition/year when known; never invent page numbers.

- Gilbert Strang, Introduction to Linear Algebra, 5th ed.
- Deisenroth, Faisal, and Ong, Mathematics for Machine Learning.
- Goodfellow, Bengio, and Courville, Deep Learning.
- Kevin Murphy, Probabilistic Machine Learning: An Introduction and Advanced Topics.
- Christopher Bishop, Pattern Recognition and Machine Learning.
- Jurafsky and Martin, Speech and Language Processing, 3rd-edition online draft.
- Sutton and Barto, Reinforcement Learning: An Introduction, 2nd ed.
- Boyd and Vandenberghe, Convex Optimization.
- Wasserman, All of Statistics.
- Pearl, Glymour, and Jewell, Causal Inference in Statistics: A Primer.
- Kleppmann, Designing Data-Intensive Applications.
- Burns, Beda, and Hightower, Kubernetes: Up and Running.
- NIST AI Risk Management Framework 1.0.
- OWASP Top 10 for Large Language Model Applications.
- RFC 8259 (JSON), RFC 9110 (HTTP Semantics), JSON-RPC 2.0, OAuth 2.0/2.1 specifications, where protocol concepts apply.
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
  "llama-4-maverick",
  "qwen3.5-397b-a17b",
  "deepseek-4-flash",
  "kimi-k2.5"
];

async function createModelResponse(input) {
  const configured = process.env.DIGITALOCEAN_MODEL_ID?.trim();
  const candidates = resolvedModel ? [resolvedModel] : configured ? [configured] : defaultModelCandidates;
  const failures = [];
  for (const model of candidates) {
    const usesChatCompletions = /^(llama|alibaba-|deepseek-|mistral)/.test(model);
    const endpoint = usesChatCompletions ? "chat/completions" : "responses";
    const body = usesChatCompletions
      ? { model, messages: [{ role: "user", content: input }], max_tokens: 14_000, temperature: 0.15, stream: false }
      : { model, input, max_output_tokens: 14_000, temperature: 0.15, stream: false };
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
    failures.push(`${model}: HTTP ${response.status} ${detail}`);
    const unavailable = (response.status === 403 && /not available|subscription tier/i.test(detail))
      || (response.status === 404 && /model not found|not a responses model/i.test(detail));
    if (configured || !unavailable) throw new Error(`DigitalOcean inference failed: ${failures.join(" | ")}`);
    console.warn(`${model} is unavailable for this tier; trying the next serverless model`);
  }
  throw new Error(`No candidate DigitalOcean serverless model is available: ${failures.join(" | ")}`);
}

function qualityProblems(text) {
  const problems = [];
  if (!text || text.length < 14_000) problems.push(`only ${text?.length ?? 0} characters; minimum is 14,000`);
  for (const heading of [
    "## Paper at a glance", "## Concept map", "## Tutorial 1 - Intuitive understanding",
    "## Tutorial 2 - Practitioner understanding", "## Tutorial 3 - Researcher understanding",
    "## Appendix - Prerequisites", "## Paper-specific glossary"
  ]) if (!text?.includes(heading)) problems.push(`missing heading: ${heading}`);
  if (!text?.includes("```mermaid")) problems.push("missing Mermaid diagram");
  if ((text?.match(/### Prerequisite /g) ?? []).length < 3) problems.push("fewer than three explained prerequisites");
  if ((text?.match(/limitations?|threats? to validity/gi) ?? []).length < 3) problems.push("insufficient treatment of limitations");
  return problems;
}

function promptFor(paper, grounding, previousProblems = []) {
  return `You are authoring a rigorous, self-contained tutorial that can replace a first reading of the supplied research paper at three levels of difficulty. This is not a reading guide, outline, or list of instructions. Explain the paper itself: its problem, prior context, method, mechanisms, equations, experiments, quantitative findings, limitations, and implications. Every paper-specific claim must be supported by the supplied PDF text. Explicitly say when the extracted text does not establish a detail.

Paper: ${paper.title}
Authors: ${paper.authors}
arXiv ID: ${paper.id}
PDF extraction: ${grounding.selectedPages} of ${grounding.pageCount} pages${grounding.truncated ? " selected by section relevance because the paper exceeded the context budget" : " included"}.

Required output, in Markdown, with these exact headings:

# ${paper.title} - Complete Tutorial
## Paper at a glance
Give the research question, central contribution, method, headline findings, and scope in a compact table. Quantitative values must match the paper.
## Concept map
Give a valid Mermaid diagram showing the paper's causal or computational flow, then explain it in prose.
## Tutorial 1 - Intuitive understanding
Write 900-1,300 words for an intelligent reader without computer-science training. Use a running analogy, explain all essential terms, walk through the method step by step, report the actual evidence and findings, and discuss what the work does not prove. End with a teach-back recap. Do not tell the reader merely to inspect the paper.
## Tutorial 2 - Practitioner understanding
Write 1,600-2,400 words for a computer-science practitioner. Explain architecture/data flow, algorithms, inputs/outputs, implementation choices, evaluation design, key tables or findings, operational trade-offs, failure modes, and a concrete reproduction or adoption plan. Translate every important equation into words and define symbols. Include at least one implementation-oriented Mermaid diagram or pseudocode block.
## Tutorial 3 - Researcher understanding
Write 2,200-3,200 words. Reconstruct the formal problem, assumptions, objective functions and equations, experimental design, baselines, metrics, ablations, quantitative results, uncertainty, threats to validity, relationship to prior work, and research extensions. Distinguish evidence in the paper from your synthesis. Include proposed replication and ablation studies.
## Appendix - Prerequisites
Identify every prerequisite actually needed for this paper. For each, use a heading of the form "### Prerequisite N - Concept" and provide: an intuitive explanation, formal definition or equation where relevant, a small worked example, exactly how the paper uses it, common misconceptions, and 1-3 references from the vetted shelf below. At least three prerequisites are required; complex papers should have more.
## Paper-specific glossary
Define all symbols, acronyms, datasets, benchmarks, protocols, and specialized terms needed to understand the tutorial.
## Source boundaries and further reading
State extraction limits, distinguish the original paper from prerequisite references, and link the arXiv abstract as https://arxiv.org/abs/${paper.id}.

Writing requirements:
- Be explanatory and complete, not skeletal. Do not include generic instructions such as "read the methods" in place of explanation.
- Preserve important numerical results, sample sizes, dataset names, baselines, and qualifications from the source.
- Use equations when they materially explain the method; define every symbol immediately.
- Use plain ASCII hyphens in prose.
- Do not fabricate quotations, citations, page numbers, results, or references.
${referenceShelf}
${previousProblems.length ? `A previous draft failed quality checks: ${previousProblems.join("; ")}. Rewrite the entire tutorial and fix every issue.` : ""}

SOURCE PDF TEXT
================
${grounding.text}`;
}

export async function generatePaperTutorial({ paper, pdfPath }) {
  if (!process.env.MODEL_ACCESS_KEY) throw new Error("MODEL_ACCESS_KEY is required for full-paper tutorial authoring");
  const grounding = await extractGroundingText(pdfPath);
  let problems = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = outputText(await createModelResponse(promptFor(paper, grounding, problems)))?.trim();
    problems = qualityProblems(text);
    if (!problems.length) return `${text}\n`;
    console.warn(`${paper.id}: attempt ${attempt} failed: ${problems.join("; ")}`);
  }
  throw new Error(`${paper.id}: tutorial failed quality checks after two attempts: ${problems.join("; ")}`);
}

export function verifyDetailedTutorial(text, label = "tutorial") {
  const problems = qualityProblems(text);
  if (problems.length) throw new Error(`${label}: ${problems.join("; ")}`);
}
