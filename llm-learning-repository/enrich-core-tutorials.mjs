import fs from "node:fs";
import path from "node:path";
import { generatePaperTutorial, verifyDetailedTutorial } from "./tutorial-authoring.mjs";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));

function parseCsvLine(line) {
  const cells = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value); value = ""; }
    else value += char;
  }
  cells.push(value); return cells;
}

const records = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1).map(line => {
  const [order, stage, slug, id, title, authors, pdfUrl, tutorial] = parseCsvLine(line);
  return { order: Number(order), stage, slug, id, title, authors, pdfUrl, tutorial };
});
const only = process.argv.find(x => x.startsWith("--only="))?.slice(7);
const selected = only ? records.filter(x => x.id === only || x.slug === only || x.stage === only) : records;
if (!selected.length) throw new Error(`No manifest records matched --only=${only}`);

for (const [index, paper] of selected.entries()) {
  const pdfPath = path.join(root, "papers", `${paper.id}.pdf`);
  const tutorialPath = path.join(root, paper.tutorial);
  console.log(`[${index + 1}/${selected.length}] authoring ${paper.id}: ${paper.title}`);
  const tutorial = await generatePaperTutorial({ paper, pdfPath });
  verifyDetailedTutorial(tutorial, paper.id);
  fs.writeFileSync(tutorialPath, tutorial);
  console.log(`${paper.id}: wrote ${tutorial.length} characters`);
}

console.log(`Enriched ${selected.length} core tutorials`);
