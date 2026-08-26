import fs from "node:fs";
import path from "node:path";
import { verifyDetailedTutorial } from "./tutorial-authoring.mjs";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const lines = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1);
let checked = 0;
for (const line of lines) {
  const match = line.match(/^\d+,([^,]+),([^,]+),([^,]+),/);
  const [, stage, slug, id] = match;
  verifyDetailedTutorial(fs.readFileSync(path.join(root, "tutorials", stage, `${slug}.md`), "utf8"), id);
  checked++;
}
console.log(`verified ${checked} detailed tutorials`);
