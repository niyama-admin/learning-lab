import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const rows = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1);
function parseCsv(line) {
  const cells = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (line[i] === '"') quoted = !quoted;
    else if (line[i] === "," && !quoted) { cells.push(value); value = ""; }
    else value += line[i];
  }
  cells.push(value); return cells;
}
const tutorials = new Set();
const hashes = new Map();
let failed = false;
for (const row of rows) {
  const cells = parseCsv(row);
  const [, , id, , , kind, local, url, tutorial] = cells;
  if (!url.startsWith("https://")) { console.error(`${id}: invalid canonical URL`); failed = true; }
  tutorials.add(tutorial);
  if (kind !== "live-spec") {
    const file = path.join(root, local);
    if (!fs.existsSync(file)) { console.error(`${id}: missing ${local}`); failed = true; continue; }
    const data = fs.readFileSync(file);
    if (data.length < 50_000 || data.subarray(0, 5).toString() !== "%PDF-") { console.error(`${id}: not a plausible PDF`); failed = true; }
    hashes.set(local, `${crypto.createHash("sha256").update(data).digest("hex")}  ${local.replaceAll("\\", "/")}`);
  }
}
for (const relative of tutorials) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) { console.error(`missing tutorial ${relative}`); failed = true; continue; }
  const text = fs.readFileSync(file, "utf8");
  for (const heading of ["## Tutorial 1 - Intuitive understanding", "## Tutorial 2 - Practitioner understanding", "## Tutorial 3 - Researcher understanding", "## Appendix - Prerequisites", "```mermaid"])
    if (!text.includes(heading)) { console.error(`${relative}: missing ${heading}`); failed = true; }
  if (text.length < 14_000) { console.error(`${relative}: only ${text.length} characters`); failed = true; }
  if ((text.match(/\*\*References:\*\*/g) ?? []).length < 4) { console.error(`${relative}: insufficient prerequisite references`); failed = true; }
}
fs.writeFileSync(path.join(root, "checksums.sha256"), `${[...hashes.values()].sort().join("\n")}\n`);
if (failed) process.exit(1);
console.log(`verified ${rows.length} source mappings, ${tutorials.size} tutorials, and ${hashes.size} local PDFs`);
