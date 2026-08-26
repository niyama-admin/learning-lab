import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const files = fs.readdirSync(path.join(root, "papers")).filter(x => x.endsWith(".pdf")).sort();
const lines = files.map(file => {
  const bytes = fs.readFileSync(path.join(root, "papers", file));
  return `${crypto.createHash("sha256").update(bytes).digest("hex")}  papers/${file}`;
});
fs.writeFileSync(path.join(root, "checksums.sha256"), lines.join("\n") + "\n");
console.log(`hashed ${files.length} PDFs`);
