// Generates a paper guide in format v2 (references/guide-authoring-spec-v2.md) with a hosted open model.
//
// The older generator (tutorial-authoring.mjs) writes the v1 three-level template and replaces the model's
// prerequisites with six fixed Transformer-specific templates. This module writes the v2 sections instead, checks each
// part, then verifies the assembled guide with the same verifier the repository uses (verify-v2-guides.mjs).
//
// What it can and cannot guarantee: it enforces STRUCTURE (headings, worked example length, glossary, FAQ, prerequisite
// count, diagrams, no repeated sentences, no v1 boilerplate). It cannot check that numbers are right. Every guide it
// writes carries a visible draft banner, and a human or a stronger model must check numbers against the PDF.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createModelResponse, extractGroundingText, outputText } from "./tutorial-authoring.mjs";
import { v2Problems } from "./verify-v2-guides.mjs";

const intFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const RULES = `You are writing one part of a guide that must make a research paper understandable to a reader who has not opened it. The guide follows a fixed format. Rules for EVERY part:
- Use only facts present in the SOURCE PAPER TEXT below. Every number must appear in that text. If a number you need is not in the text, write "not stated in the extracted text" instead of guessing. Never invent table numbers, page numbers, quotations, or results.
- Mark where claims come from: "the paper reports (Table N)" for results, "this guide infers" for your own reasoning, "constructed by this guide" for any invented example number.
- Define every technical term and expand every abbreviation at or before its first use. Write for an intelligent reader without a computer-science background in Tutorial 1, and for a builder in Tutorial 2.
- Explain results in plain words: what is counted, compared against what, and what a change of that size means in practice.
- Do not repeat any sentence from earlier parts or elsewhere in your own part. Each section must add new content.
- Do not write placeholders, TODO, or meta commentary about these instructions. Use plain ASCII hyphens. Use the exact headings given, with the exact spelling and "##" or "###" level.
- Customer-neutral: no company or customer names beyond the paper's own.
- Where a Mermaid diagram is required, write a fenced \`\`\`mermaid block with labelled nodes and edges that say what flows, then one sentence beginning "What to notice:".`;

// Each part: name, headings (exact, in order), minimum characters, and what to write.
export const V2_PARTS = [
  {
    name: "opening",
    headings: ["## Read this first", "## The paper in one worked example"],
    minChars: 4_000,
    targetChars: 8_000,
    maxChars: 11_500,
    brief: `Write exactly these two sections, in this order.
## Read this first - the paper's claim in one plain sentence; who it is for; what the reader will be able to do afterwards (a short list); estimated reading time of this guide; the one thing most people get wrong about this paper; and one sentence saying whether the paper is a peer-reviewed publication or a preprint ONLY if the text says so (otherwise say "venue not stated in the extracted text").
## The paper in one worked example - choose ONE concrete example from the paper itself (a task, an input, a prompt, a trace, a table row). Trace it start to finish showing the real inputs and outputs at every step, with short quotations in quote marks (under 25 words each) or close paraphrase. If the paper has no single example, construct one and say plainly "constructed by this guide" and label every constructed number. This section must be at least 2,000 characters and must include one Mermaid diagram of the mechanism followed by "What to notice:".`
  },
  {
    name: "words-intuitive",
    headings: [
      "## Words you need", "## Tutorial 1 - Intuitive understanding", "### What was broken before", "### The idea",
      "### How it works, step by step", "### What the results say", "### What this does not show", "### Teach-back"
    ],
    minChars: 7_000,
    targetChars: 8_500,
    maxChars: 12_000,
    brief: `Write exactly these sections, in this order, with these exact headings.
## Words you need - a markdown table with the columns Term, Plain definition, Example from the worked example. At least six paper-specific terms.
## Tutorial 1 - Intuitive understanding
### What was broken before - a concrete failure that motivated the paper.
### The idea - an everyday analogy, plus exactly where the analogy breaks.
### How it works, step by step - each step shown on the worked example from the opening part.
### What the results say - the actual numbers from the paper; for each, what is counted, compared with what, and what a change of that size means in practice.
### What this does not show - limits stated by the authors and limits this guide infers (label which is which).
### Teach-back - three to five questions, each followed by its answer inside a <details><summary>Answer</summary> ... </details> block.`
  },
  {
    name: "practitioner",
    headings: [
      "## Tutorial 2 - Practitioner understanding", "### The design in concrete terms", "### A minimal version", "### What it costs",
      "### How it fails", "### Evaluating your version", "### Adopt, adapt or skip"
    ],
    minChars: 6_000,
    targetChars: 9_500,
    maxChars: 13_500,
    brief: `Write exactly these sections, in this order, with these exact headings.
## Tutorial 2 - Practitioner understanding (for someone who will build or buy)
### The design in concrete terms - data structures, message formats, the paper's actual hyper-parameters and prompts where given, shown concretely.
### A minimal version - runnable-looking code or pseudocode under 70 lines in a fenced block, with the shapes of inputs and outputs shown. Say it was not executed.
### What it costs - worked arithmetic (tokens, calls, latency, money) with every assumption stated and labelled as an assumption.
### How it fails - a markdown table: symptom, likely cause, mitigation, grounded in the paper's error analysis where it has one.
### Evaluating your version - metric, test set size, baseline, and a stop rule.
### Adopt, adapt or skip - a clear recommendation, with reasons, for a team building an assistant over private business documents, using open or smaller models where possible. If the paper does not bear on that, say so plainly. Include one Mermaid diagram of the system or workflow followed by "What to notice:".`
  },
  {
    name: "researcher",
    headings: [
      "## Tutorial 3 - Researcher understanding", "### Formal setup", "### The claims, stated precisely", "### Evidence, table by table",
      "### Ablations and what they isolate", "### Threats to validity specific to this paper", "### Open problems and follow-ups",
      "### What would change my mind"
    ],
    minChars: 6_000,
    targetChars: 9_000,
    maxChars: 13_000,
    brief: `Write exactly these sections, in this order, with these exact headings.
## Tutorial 3 - Researcher understanding
### Formal setup - notation defined once with every symbol explained, and a numeric toy instance labelled "constructed by this guide".
### The claims, stated precisely
### Evidence, table by table - for each key table or figure: its id, what rows and columns are, the headline numbers, and what it identifies causally versus only associates.
### Ablations and what they isolate
### Threats to validity specific to this paper - include any inconsistencies you notice inside the paper (prose versus table, numbers that do not recompute); flag them, do not fix them silently.
### Open problems and follow-ups
### What would change my mind
Do not restate Tutorial 1 or 2; add the formal and evidential content.`
  },
  {
    name: "map-faq",
    headings: ["## Reading map for the PDF", "## Questions readers get stuck on"],
    minChars: 4_500,
    targetChars: 5_500,
    maxChars: 8_500,
    brief: `Write exactly these two sections, in this order.
## Reading map for the PDF - a markdown table with columns: Section or figure, What it contains, Read / skim / skip on a first pass, and Where this guide answers the questions it raises. Use the paper's real section names from the text.
## Questions readers get stuck on - at least EIGHT specific questions a first-time reader would really ask (terminology, numbers, mechanism, "why not just X"). Write each as a heading of the form "### <the question ending with a question mark?>" followed by a 2-6 sentence answer.`
  },
  {
    name: "prereq-close",
    headings: ["## Prerequisites you actually need", "## Where this sits in the curriculum", "## Checkpoint"],
    minChars: 4_000,
    targetChars: 6_000,
    maxChars: 9_000,
    brief: `Write exactly these three sections, in this order.
## Prerequisites you actually need - three to six blocks, each with the heading "### Prerequisite N - <name>" (N = 1, 2, 3 ...). Only what THIS paper uses. Each block has a short plain explanation, a tiny worked numeric example, and where the paper uses it. Do not pad with generic mathematics.
## Where this sits in the curriculum - what to have read before, how this paper differs from the two nearest related papers named in the paper's own related-work discussion, and what to read next.
## Checkpoint - five to eight self-test items mixing explain, compute and critique, each answer inside a <details><summary>Answer</summary> ... </details> block.`
  }
];

// Models sometimes copy a brief's explanatory text into the heading line ("### A minimal version - runnable-looking code ...").
// If a line starts with a required heading followed by a separator and extra text, reduce it to the exact heading.
export function normalizeHeadings(text, part) {
  if (!text) return text;
  let out = text;
  for (const heading of part.headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`^${escaped}(?:\\s+(?:-|--|\u2014|\u2013|:)\\s+.*|\\s*\\(.*\\)|\\s*:\\s*.*)$`, "gm"), heading);
  }
  return out;
}

const BANNED = [/Materialize \*\*/, /strongest claim supported by the paper/i, /Research notebook lens/i, /\bTODO\b|\bTBD\b|lorem ipsum/i];

export function partProblems(text, part) {
  const problems = [];
  if (!text || text.length < part.minChars) problems.push(`only ${text?.length ?? 0} characters; this part needs at least ${part.minChars}`);
  if (!text) return problems;
  let cursor = -1;
  for (const heading of part.headings) {
    const at = text.indexOf(`\n${heading}\n`) >= 0 ? text.indexOf(`\n${heading}\n`) : text.startsWith(`${heading}\n`) ? 0 : -1;
    if (at < 0) problems.push(`missing exact heading: ${heading}`);
    else if (at < cursor) problems.push(`heading out of order: ${heading}`);
    else cursor = at;
  }
  const fences = (text.match(/^```/gm) ?? []).length;
  if (fences % 2) problems.push("unbalanced code fence (the part may have been cut off)");
  for (const rx of BANNED) if (rx.test(text)) problems.push(`forbidden text: ${rx}`);
  if (/^#\s/m.test(text.replace(/```[\s\S]*?```/g, ""))) problems.push("contains a '# ' title heading; write only the requested sections");
  return problems;
}

function promptForPart(paper, grounding, part, context, previousProblems) {
  return `[[PART:${part.name}]]
${RULES}

PAPER: ${paper.title}
Authors: ${paper.authors}
arXiv ID: ${paper.id}
PDF extraction: ${grounding.selectedPages} of ${grounding.pageCount} pages${grounding.truncated ? " (selected by section relevance because the paper exceeded the context budget; say so if a needed detail is missing)" : " (all pages)"}.

THIS PART - ${part.brief}

LENGTH: aim for about ${part.targetChars} characters (roughly ${Math.round(part.targetChars / 6)} words) and stay under ${part.maxChars}. Be concise and specific; do not pad, and do not restate earlier sections.

HEADING LINES MUST BE EXACTLY THESE, character for character, with nothing added after them on the same line (the text after a dash in the description above explains what to write; do not copy it into the heading):
${part.headings.map(h => h).join("\n")}

Output only the requested sections in markdown. Start directly with the first heading. Do not write the paper title or any section that belongs to another part.
${context ? `\nWORKED EXAMPLE AND OPENING ALREADY WRITTEN (keep consistent with it; do not repeat it):\n${context}\n` : ""}${previousProblems.length ? `\nA previous attempt failed these checks: ${previousProblems.join("; ")}. Rewrite the whole part and fix every one.\n` : ""}
SOURCE PAPER TEXT
=================
${grounding.text}`;
}

function cachePath(paper, part) {
  const dir = process.env.TUTORIAL_CACHE_DIR?.trim();
  if (!dir) return null;
  const digest = crypto.createHash("sha256").update(`v2\n${part.name}\n${part.brief}\n${RULES}`).digest("hex").slice(0, 10);
  return path.join(dir, paper.id, `v2-${part.name}-${digest}.md`);
}

// Problems that do not make a guide skeletal: publish with a review banner instead of discarding the paper.
const HARD = [/missing heading/, /heading out of order/, /front matter/, /only \d+ characters/, /Mermaid/, /boilerplate/, /placeholder/, /worked example is under/];
export const isHardProblem = problem => HARD.some(rx => rx.test(problem));

// Weekly drafts: the spec's 70,000-character ceiling is a padding guard for hand-reviewed guides. The open model writes about
// 15,000-20,000 characters per part regardless of the instruction, so drafts are allowed more before a review banner is added.
export const WEEKLY_MAX_GUIDE_CHARS = Number.parseInt(process.env.TUTORIAL_MAX_GUIDE_CHARS ?? "", 10) || 110_000;

export const DRAFT_BANNER = "> **DRAFT - written by an open model from the paper's extracted text.** Structure is machine-checked; numbers are NOT. Check every figure against the PDF before relying on it, and prefer rewriting this guide with the authoring spec if it matters.";

/**
 * Returns the complete guide file text (front matter included). `header` is extra blockquote lines (day, category,
 * score) and `studyPlan` an optional trailing section; `pdfLink` is the relative link to the local PDF.
 * Pass `grounding` to skip PDF extraction (tests).
 */
export async function generatePaperGuideV2({ paper, pdfPath, grounding, header = "", studyPlan = "", pdfLink }) {
  if (!process.env.MODEL_ACCESS_KEY) throw new Error("MODEL_ACCESS_KEY is required for full-paper guide authoring");
  grounding ??= await extractGroundingText(pdfPath);
  pdfLink ??= `../../papers/${paper.id}.pdf`;
  const attemptsPerPart = Math.max(1, intFromEnv("TUTORIAL_PART_ATTEMPTS", 3));
  const written = [];
  let context = "";
  for (const part of V2_PARTS) {
    const file = cachePath(paper, part);
    if (file && fs.existsSync(file)) {
      const cached = fs.readFileSync(file, "utf8");
      if (!partProblems(cached, part).length) {
        console.log(`${paper.id}/${part.name}: reused ${cached.length} cached characters`);
        written.push(cached);
        if (part.name === "opening") context = cached;
        continue;
      }
    }
    let problems = [];
    let accepted;
    for (let attempt = 1; attempt <= attemptsPerPart; attempt++) {
      let text = outputText(await createModelResponse(promptForPart(paper, grounding, part, part.name === "opening" ? "" : context, problems)))?.trim();
      text = normalizeHeadings(text, part);
      problems = partProblems(text, part);
      if (!problems.length) { accepted = text; break; }

      console.warn(`${paper.id}/${part.name}: attempt ${attempt}/${attemptsPerPart} failed: ${problems.join("; ")}`);
      // Show what the model actually returned: a rejected part is otherwise undiagnosable from the log alone.
      const preview = (text ?? "").replace(/\s+/g, " ");
      console.warn(`${paper.id}/${part.name}: rejected output (${(text ?? "").length} chars) begins: ${preview.slice(0, 240)} ... ends: ${preview.slice(-160)}`);
      if (process.env.TUTORIAL_DEBUG_DIR) {
        fs.mkdirSync(process.env.TUTORIAL_DEBUG_DIR, { recursive: true });
        fs.writeFileSync(path.join(process.env.TUTORIAL_DEBUG_DIR, `${paper.id}-${part.name}-attempt${attempt}.md`), text ?? "");
      }
    }
    if (!accepted) throw new Error(`${paper.id}/${part.name}: failed checks after ${attemptsPerPart} attempts: ${problems.join("; ")}`);
    console.log(`${paper.id}/${part.name}: accepted ${accepted.length} characters`);
    if (accepted.length > part.maxChars) console.warn(`${paper.id}/${part.name}: longer than the ${part.maxChars}-character target ceiling; the model did not follow the length instruction (not retried: retries rarely shorten it)`);
    if (file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, accepted); }
    written.push(accepted);
    if (part.name === "opening") context = accepted;
  }
  const head = `---\nformat: v2\narxiv: ${paper.id}\n---\n\n# ${paper.title}\n\n> **Paper:** ${paper.authors} - [arXiv abstract](https://arxiv.org/abs/${paper.id}) - [local PDF](${pdfLink})\n${header ? `${header}\n` : ""}>\n${DRAFT_BANNER}\n\n`;
  let text = `${head}${written.join("\n\n")}\n${studyPlan ? `\n${studyPlan}\n` : ""}`;
  const problems = v2Problems(text, paper.id, { pdfLink, maxChars: WEEKLY_MAX_GUIDE_CHARS });
  const hard = problems.filter(isHardProblem);
  if (hard.length) throw new Error(`${paper.id}: assembled guide failed v2 checks: ${hard.join("; ")}`);
  if (problems.length) {
    console.warn(`${paper.id}: publishing with a review banner: ${problems.join("; ")}`);
    text = text.replace(DRAFT_BANNER, `${DRAFT_BANNER}\n>\n> **REVIEW NEEDED:** the automated v2 checks flagged: ${problems.join("; ")}.`);
  }
  return text;
}
