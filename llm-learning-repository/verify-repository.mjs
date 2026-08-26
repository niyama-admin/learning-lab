import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const manifest = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1);
const expectedIds = new Set();
let failures = 0;
for (const line of manifest) {
  const match = line.match(/^\d+,([^,]+),([^,]+),([^,]+),/);
  const [, stage, slug, id] = match;
  expectedIds.add(id);
  const tutorial = path.join(root, "tutorials", stage, `${slug}.md`);
  const pdf = path.join(root, "papers", `${id}.pdf`);
  if (!fs.existsSync(tutorial)) { console.error(`missing tutorial ${slug}`); failures++; }
  else {
    const text = fs.readFileSync(tutorial, "utf8");
    for (const heading of ["Tutorial 1", "Tutorial 2", "Tutorial 3", "mermaid", "Checkpoint"]) {
      if (!text.includes(heading)) { console.error(`${slug}: missing ${heading}`); failures++; }
    }
  }
  if (!fs.existsSync(pdf)) { console.error(`missing PDF ${id}`); failures++; }
  else {
    const size = fs.statSync(pdf).size;
    const fd = fs.openSync(pdf, "r"); const b = Buffer.alloc(5); fs.readSync(fd, b, 0, 5, 0);
    const tail = Buffer.alloc(Math.min(2048, size)); fs.readSync(fd, tail, 0, tail.length, size - tail.length); fs.closeSync(fd);
    if (b.toString() !== "%PDF-") { console.error(`${id}: invalid PDF signature`); failures++; }
    if (size < 10_000) { console.error(`${id}: implausibly small PDF`); failures++; }
    if (!tail.toString("latin1").includes("%%EOF")) { console.error(`${id}: missing PDF EOF marker`); failures++; }
  }
}
for (const file of fs.readdirSync(path.join(root, "papers")).filter(x => x.endsWith(".pdf"))) {
  if (!expectedIds.has(file.slice(0, -4))) { console.error(`unlisted PDF ${file}`); failures++; }
}
const checksumLines = fs.readFileSync(path.join(root, "checksums.sha256"), "utf8").trim().split(/\r?\n/);
if (checksumLines.length !== manifest.length) { console.error("checksum count differs from manifest"); failures++; }
if (failures) process.exit(1);
console.log(`verified ${manifest.length} papers and tutorials`);
