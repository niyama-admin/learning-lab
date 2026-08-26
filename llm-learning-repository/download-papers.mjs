import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const lines = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1);
const ids = lines.map(line => line.match(/^\d+,[^,]+,[^,]+,([^,]+),/)[1]);
fs.mkdirSync(path.join(root, "papers"), { recursive: true });

for (const id of ids) {
  const destination = path.join(root, "papers", `${id}.pdf`);
  if (fs.existsSync(destination) && fs.statSync(destination).size > 10_000) {
    console.log(`skip ${id}`);
    continue;
  }
  const response = await fetch(`https://arxiv.org/pdf/${id}`);
  if (!response.ok || !response.body) throw new Error(`${id}: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
  console.log(`downloaded ${id}`);
}
