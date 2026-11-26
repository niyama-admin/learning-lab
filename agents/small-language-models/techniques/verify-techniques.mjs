#!/usr/bin/env node
// Structure checker for technique explainers (format technique-v1).
// Usage (from the repository root): node agents/small-language-models/techniques/verify-techniques.mjs [--only=02-lora]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d\d-.*\.md$/.test(f) && (!only || f.startsWith(only)))
  .sort();

const H2 = [
  "Read this first",
  "The technique in one worked example",
  "Words you need",
  "Tutorial 1 - Intuitive understanding",
  "Tutorial 2 - Practitioner understanding",
  "Tutorial 3 - Researcher understanding",
  "Reading map for the key papers",
  "Questions readers get stuck on",
  "Prerequisites you actually need",
  "Where this sits",
  "Checkpoint",
];
const SUB = {
  "Tutorial 1 - Intuitive understanding": ["What was broken before", "The idea", "How it works, step by step", "What the evidence says", "What this does not show", "Teach-back"],
  "Tutorial 2 - Practitioner understanding": ["The design in concrete terms", "A minimal version", "What it costs", "How it fails", "Evaluating your version", "Adopt, adapt or skip"],
  "Tutorial 3 - Researcher understanding": ["Formal setup", "The claims, stated precisely", "Evidence, table by table", "Ablations and what they isolate", "Threats to validity", "Open problems and follow-ups", "What would change my mind"],
};
const BANNED = [/materialize/i, /strongest claim supported by the paper/i, /research notebook lens/i];

let failures = 0;
const fail = (f, msg) => {
  console.log(`FAIL ${f}: ${msg}`);
  failures++;
};

for (const f of files) {
  const before = failures;
  const text = fs.readFileSync(path.join(dir, f), "utf8");
  const slug = f.replace(/\.md$/, "");
  const fm = text.match(/^---\nformat: technique-v1\nslug: (.+)\n---\n/);
  if (!fm) fail(f, "front matter must be format: technique-v1 and slug");
  else if (fm[1].trim() !== slug) fail(f, `slug ${fm[1]} does not match file name`);
  if (!/^# .+/m.test(text)) fail(f, "missing title");
  const h2 = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  if (JSON.stringify(h2) !== JSON.stringify(H2)) fail(f, `## headings differ.\n  got:  ${h2.join(" | ")}\n  want: ${H2.join(" | ")}`);
  // split by h2 for subsection checks
  const parts = text.split(/^## /m).slice(1);
  for (const p of parts) {
    const title = p.split("\n")[0].trim();
    if (SUB[title]) {
      const subs = [...p.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
      if (JSON.stringify(subs) !== JSON.stringify(SUB[title])) fail(f, `### under "${title}" differ. got: ${subs.join(" | ")}`);
    }
  }
  const sect = (name) => (parts.find((p) => p.startsWith(name)) || "");
  const rows = (name) => sect(name).split("\n").filter((l) => /^\|/.test(l) && !/^\|[-| ]+\|$/.test(l)).length - 1;
  if (rows("Words you need") < 6) fail(f, "glossary needs at least six terms");
  const q = (sect("Questions readers get stuck on").match(/^(\*\*|###|\d+\.|- \*\*)/gm) || []).length;
  if (q < 8) fail(f, `questions section needs at least eight questions (found ${q})`);
  const prereq = (text.match(/^### Prerequisite \d+ - .+$/gm) || []).length;
  if (prereq < 3 || prereq > 6) fail(f, `need 3 to 6 prerequisite blocks (found ${prereq})`);
  const mer = (text.match(/```mermaid/g) || []).length;
  if (mer < 2) fail(f, `need at least two mermaid diagrams (found ${mer})`);
  const det = (text.match(/<details>/g) || []).length;
  if (det < 8) fail(f, `expected answers in <details> for teach-back and checkpoint (found ${det})`);
  const chk = (sect("Checkpoint").match(/<details>/g) || []).length;
  if (chk < 5 || chk > 8) fail(f, `checkpoint needs 5 to 8 items (found ${chk})`);
  const tb = (sect("Tutorial 1").match(/<details>/g) || []).length;
  if (tb < 3 || tb > 5) fail(f, `teach-back needs 3 to 5 questions (found ${tb})`);
  if (!/Written 20\d\d-\d\d-\d\d/.test(text)) fail(f, 'missing "Written YYYY-MM-DD" date line');
  const ext = new Set([...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1].replace(/#.*$/, "")));
  if (ext.size < 10) fail(f, `need at least 10 distinct external source links (found ${ext.size})`);
  const len = text.length;
  if (len < 18000 || len > 50000) fail(f, `length ${len} outside 18,000 to 50,000 characters`);
  for (const b of BANNED) if (b.test(text)) fail(f, `banned phrase ${b}`);
  // duplicated long sentences
  const seen = new Map();
  const body = text.replace(/```[\s\S]*?```/g, "");
  for (const s of body.split(/(?<=[.!?])\s+|\n+/)) {
    const t = s.trim().replace(/\s+/g, " ");
    if (t.length > 100 && !t.startsWith("|")) seen.set(t, (seen.get(t) || 0) + 1);
  }
  for (const [t, n] of seen) if (n > 1) fail(f, `sentence repeated ${n} times: ${t.slice(0, 80)}...`);
  // relative links resolve
  for (const m of text.matchAll(/\]\((\.[^)#\s]*)(#[^)]*)?\)/g)) {
    const p = path.normalize(path.join(dir, m[1]));
    if (!fs.existsSync(p)) fail(f, `broken link ${m[1]}`);
  }
  // Heuristic (warning only): paragraphs with figures but no link and no Judgment/Assumption/this-guide label.
  {
    const labels = /judgment|assumption|constructed|this guide|unverified|our own|our measurement|we computed|illustrative|infer/i;
    const figs = /\d+(\.\d+)?\s?(%|x\b|times|points|GB|percent|B\b)|\b\d{2,}\b/;
    const paras = body.split(/\n\s*\n/).filter((p) => p.trim() && !/^(\||#|<|-|---)/.test(p));
    const flagged = paras.filter((p) => p.length > 160 && figs.test(p) && !p.includes("http") && !labels.test(p));
    if (flagged.length) {
      console.log(`WARN ${f}: ${flagged.length} paragraph(s) with figures but no link or label`);
      if (process.argv.includes("--warn")) flagged.forEach((p, i) => console.log(`  [${i + 1}] ${p.trim().replace(/\s+/g, " ").slice(0, 200)}`));
    }
  }
  if (failures === before) console.log(`ok   ${f} (${len} chars)`);
}
if (!files.length) console.log("no explainer files found");
process.exit(failures ? 1 : 0);
