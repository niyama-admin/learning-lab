import fs from "node:fs";
import path from "node:path";

// Verifies guides written to references/guide-authoring-spec-v2.md.
// A guide opts in with front matter "format: v2". Legacy (v1) guides are checked by verify-detailed-tutorials.mjs.

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const onlyArg = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length).trim();

// Guides come in two kinds. "paper" guides cite one arXiv paper (front matter `arxiv:`). "compute" guides (the compute/
// collection) synthesise several sources (front matter `track: compute` and `sources:` listing manifest source ids).
export const REQUIRED_HEADINGS = [
  "## Read this first",
  "## The paper in one worked example",
  "## Words you need",
  "## Tutorial 1 - Intuitive understanding",
  "## Tutorial 2 - Practitioner understanding",
  "## Tutorial 3 - Researcher understanding",
  "## Reading map for the PDF",
  "## Questions readers get stuck on",
  "## Prerequisites you actually need",
  "## Where this sits in the curriculum",
  "## Checkpoint"
];

const REQUIRED_SUBHEADINGS = [
  "### What was broken before", "### The idea", "### How it works, step by step",
  "### What the results say", "### What this does not show", "### Teach-back",
  "### The design in concrete terms", "### A minimal version", "### What it costs",
  "### How it fails", "### Evaluating your version", "### Adopt, adapt or skip",
  "### Formal setup", "### The claims, stated precisely", "### Evidence, table by table",
  "### Ablations and what they isolate", "### Threats to validity specific to this paper",
  "### Open problems and follow-ups", "### What would change my mind"
];

const BANNED = [
  /Materialize \*\*/, /strongest claim supported by the paper/i, /Research notebook lens/i,
  /Treat each arrow as an interface/i, /Do not confuse a representation with the thing represented/i,
  /Paper-specific answer/, /Keep that sentence in view/i
];

function section(text, heading) {
  const start = text.indexOf(`\n${heading}\n`);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length + 2);
  const next = rest.search(/\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

export function v2Problems(text, id, options = {}) {
  const compute = options.kind === "compute";
  const problems = [];
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm || !/^format:\s*v2\s*$/m.test(fm[1])) problems.push("missing front matter 'format: v2'");
  if (!compute && fm && id && !new RegExp(`^arxiv:\\s*${id.replace(".", "\\.")}\\s*$`, "m").test(fm[1])) problems.push("front matter arxiv id does not match manifest");
  if (compute) {
    if (!fm || !/^track:\s*compute\s*$/m.test(fm[1])) problems.push("missing front matter 'track: compute'");
    const listed = (fm?.[1].match(/^sources:\s*\[(.*)\]\s*$/m)?.[1] ?? "").split(",").map(x => x.trim()).filter(Boolean);
    for (const source of options.sources ?? []) {
      if (!listed.includes(source.id)) problems.push(`front matter sources is missing manifest source '${source.id}'`);
      if (source.url && !text.includes(source.url)) problems.push(`does not link source '${source.id}' (${source.url})`);
    }
  }
  if (text.length < 28_000) problems.push(`only ${text.length} characters; minimum is 28,000`);
  const maxChars = options.maxChars ?? 70_000;
  if (text.length > maxChars) problems.push(`${text.length} characters; maximum is ${maxChars.toLocaleString("en-US")} (cut padding)`);

  let cursor = -1;
  const headings = compute ? REQUIRED_HEADINGS.map(h => (h === "## Reading map for the PDF" ? "## Reading map for the sources" : h)) : REQUIRED_HEADINGS;
  for (const h of headings) {
    const at = text.indexOf(`\n${h}\n`);
    if (at < 0) problems.push(`missing heading: ${h}`);
    else if (at < cursor) problems.push(`heading out of order: ${h}`);
    else cursor = at;
  }
  for (const h of REQUIRED_SUBHEADINGS) if (!text.includes(`\n${h}\n`)) problems.push(`missing subheading: ${h}`);

  if ((text.match(/```mermaid/g) ?? []).length < 2) problems.push("fewer than two Mermaid diagrams");
  if (!compute && id && !text.includes(`https://arxiv.org/abs/${id}`)) problems.push("missing direct arXiv abstract link");
  const pdfLink = options.pdfLink ?? (id ? `../../papers/${id}.pdf` : "");
  if (!compute && id && !text.includes(pdfLink)) problems.push("missing local PDF link");

  const words = section(text, "## Words you need");
  const termRows = words.split("\n").filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l)).length - 1;
  if (termRows < 6) problems.push(`glossary has ${Math.max(termRows, 0)} terms; minimum is 6`);

  const faq = section(text, "## Questions readers get stuck on");
  const questions = (faq.match(/^(#{3,4}|\*\*)\s*.*\?/gm) ?? []).length;
  if (questions < 8) problems.push(`FAQ has ${questions} question headings ending in '?'; minimum is 8`);

  const prereqs = (text.match(/^### Prerequisite \d+ - /gm) ?? []).length;
  if (prereqs < 3 || prereqs > 6) problems.push(`${prereqs} prerequisite blocks; need 3-6`);

  const details = (text.match(/<details>/g) ?? []).length;
  if (details < 4) problems.push(`only ${details} <details> answer blocks; need teach-back and checkpoint answers`);

  const example = section(text, "## The paper in one worked example");
  if (example.length < 2_000) problems.push("worked example is under 2,000 characters");

  for (const rx of BANNED) if (rx.test(text)) problems.push(`v1 boilerplate detected: ${rx}`);

  // No long sentence may appear twice (guards against copy-paste padding across levels).
  const seen = new Map();
  const body = text.replace(/```[\s\S]*?```/g, "");
  for (const raw of body.split(/(?<=[.!?])\s+/)) {
    const s = raw.replace(/\s+/g, " ").trim();
    if (s.length < 100) continue;
    seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  const dupes = [...seen].filter(([, n]) => n > 1);
  if (dupes.length) problems.push(`${dupes.length} repeated long sentence(s), e.g. "${dupes[0][0].slice(0, 90)}..."`);

  if (/\b(TODO|TBD|lorem ipsum)\b/i.test(text)) problems.push("placeholder text present");
  return problems;
}

export function isV2(text) {
  return /^---\nformat:\s*v2\s*\n/.test(text) || /^---\n[\s\S]*?\nformat:\s*v2\s*\n[\s\S]*?\n---\n/.test(text);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const lines = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1);
  let checked = 0, failed = 0;
  for (const line of lines) {
    const [, stage, slug, id] = line.match(/^\d+,([^,]+),([^,]+),([^,]+),/);
    if (onlyArg && ![stage, slug, id].includes(onlyArg)) continue;
    const file = path.join(root, "tutorials", stage, `${slug}.md`);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (!isV2(text)) { if (onlyArg) { console.error(`${slug}: not a v2 guide`); failed++; } continue; }
    const problems = v2Problems(text, id);
    checked++;
    if (problems.length) { failed++; console.error(`${slug}:\n  - ${problems.join("\n  - ")}`); }
  }
  if (checked === 0 && !failed) throw new Error(onlyArg ? `No v2 guide matched --only=${onlyArg}` : "No v2 guides found");
  if (failed) process.exit(1);
  console.log(`verified ${checked} v2 guides`);
}
