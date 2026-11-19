import fs from "node:fs";
import path from "node:path";
import { verifyDetailedTutorial } from "./tutorial-authoring.mjs";
import { isV2 } from "./verify-v2-guides.mjs";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const lines = fs.readFileSync(path.join(root, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1);
const onlyArg = process.argv.find((argument) => argument.startsWith("--only="));
const only = onlyArg?.slice("--only=".length).trim();
let checked = 0;
for (const line of lines) {
  const match = line.match(/^\d+,([^,]+),([^,]+),([^,]+),/);
  const [, stage, slug, id] = match;
  if (only && ![stage, slug, id].includes(only)) continue;
  const text = fs.readFileSync(path.join(root, "tutorials", stage, `${slug}.md`), "utf8");
  if (isV2(text)) continue; // v2 guides are checked by verify-v2-guides.mjs
  verifyDetailedTutorial(text, id);
  checked++;
}
if (checked === 0 && only) throw new Error(`No v1 tutorial matched --only=${only} (v2 guides are checked by verify-v2-guides.mjs)`);
console.log(`verified ${checked} detailed tutorials`);
