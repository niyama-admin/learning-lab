// Offline test of the weekly v2 guide generator. A stub model answers each part with the matching section of a real,
// verified v2 guide (tutorials/06-agent-systems/25-codeact.md), so the whole pipeline runs without a key or network:
// prompt -> model -> per-part checks -> assembly -> v2 verifier -> weekly files -> `weekly-update.mjs --verify`.
// It proves the PLUMBING and the GATES. It cannot show what a real model writes: that needs one real run.
// Run: node test-weekly-v2.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "weekly-v2-"));
process.env.LEARNING_REPO_ROOT = tmp;
// Isolate from the workflow environment: the weekly workflow sets these, and the tests must not read or write the real
// part cache or append to the real job summary.
for (const name of ["TUTORIAL_CACHE_DIR", "WEEKLY_PR_BODY_PATH", "GITHUB_STEP_SUMMARY", "DIGITALOCEAN_MODEL_ID"]) delete process.env[name];
process.env.MODEL_ACCESS_KEY = "test-key";
process.env.REQUIRE_THOROUGH_TUTORIALS = "true";
process.env.TUTORIAL_REQUEST_INTERVAL_MS = "0";
process.env.TUTORIAL_RETRY_BASE_MS = "5";
process.env.TUTORIAL_REQUEST_TIMEOUT_MS = "5000";

// ---- fixture: split a real v2 guide into the generator's six parts ------------------------------------------------
const ID = "2402.01030";
const raw = fs.readFileSync(path.join(here, "tutorials/06-agent-systems/25-codeact.md"), "utf8");
const body = raw.slice(raw.indexOf("\n## Read this first\n") + 1);
const cuts = ["## Read this first", "## Words you need", "## Tutorial 2 - Practitioner understanding", "## Tutorial 3 - Researcher understanding", "## Reading map for the PDF", "## Prerequisites you actually need"];
const at = cuts.map(h => body.indexOf(`${h}\n`));
assert.ok(at.every(i => i >= 0) && at.every((v, i) => i === 0 || v > at[i - 1]), "fixture headings found in order");
const PARTS = {
  "opening": body.slice(at[0], at[1]).trim(),
  "words-intuitive": body.slice(at[1], at[2]).trim(),
  "practitioner": body.slice(at[2], at[3]).trim(),
  "researcher": body.slice(at[3], at[4]).trim(),
  "map-faq": body.slice(at[4], at[5]).trim(),
  "prereq-close": body.slice(at[5]).trim()
};

// ---- stub model ---------------------------------------------------------------------------------------------------
let respond = ({ part }) => PARTS[part];
const seen = [];
const server = http.createServer((req, res) => {
  if (req.method === "GET") { res.writeHead(404, { "Content-Type": "application/json" }); return res.end("{}"); } // no model listing: built-in candidates
  let data = "";
  req.on("data", c => (data += c));
  req.on("end", () => {
    const prompt = JSON.parse(data).messages?.[0]?.content ?? "";
    const part = prompt.match(/\[\[PART:([a-z-]+)\]\]/)?.[1];
    seen.push({ part, prompt });
    const n = seen.filter(x => x.part === part).length;
    const content = respond({ part, n, prompt });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
process.env.DIGITALOCEAN_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;

const { generatePaperGuideV2, V2_PARTS, isHardProblem } = await import("./tutorial-authoring-v2.mjs");
const { v2Problems } = await import("./verify-v2-guides.mjs");
const { generate } = await import("./weekly-update.mjs");

const paper = { id: ID, title: "Executable Code Actions Elicit Better LLM Agents", authors: "Wang et al." };
const grounding = { text: "[PDF page 1]\nSample paper text.", pageCount: 1, selectedPages: 1, truncated: false };
const pdfLink = `../papers/${ID}.pdf`;
const make = (extra = {}) => generatePaperGuideV2({ paper, grounding, pdfLink, header: "> **Monday - Agents** - published 2026-11-14", studyPlan: "## Daily study plan (60-90 minutes)\n\n1. **15 min:** read.", ...extra });

assert.deepEqual(V2_PARTS.map(p => p.name), Object.keys(PARTS), "generator parts match the fixture parts");

// 1. Happy path: a v2-quality document passes every gate and is assembled correctly.
seen.length = 0;
let text = await make();
assert.match(text, /^---\nformat: v2\narxiv: 2402\.01030\n---\n\n# Executable Code Actions/);
assert.match(text, /DRAFT - written by an open model/);
assert.match(text, /Daily study plan/);
assert.deepEqual(v2Problems(text, ID, { pdfLink }), [], "assembled guide has no v2 problems");
assert.equal(seen.length, 6, "one model call per part");
assert.ok(seen.slice(1).every(x => x.prompt.includes("WORKED EXAMPLE AND OPENING ALREADY WRITTEN")), "later parts receive the worked example");
console.log("ok  a v2-quality answer is assembled into a guide with no v2 problems");

// 2. A part missing a required heading is retried with the failure reported to the model.
seen.length = 0;
respond = ({ part, n }) => (part === "researcher" && n === 1 ? PARTS[part].replace("### Formal setup", "### Setup") : PARTS[part]);
text = await make();
const researcherCalls = seen.filter(x => x.part === "researcher");
assert.equal(researcherCalls.length, 2);
assert.match(researcherCalls[1].prompt, /previous attempt failed these checks: .*Formal setup/);
console.log("ok  a missing heading is retried and the failure is fed back to the model");

// 3. Old-style (v1) output is rejected, not published.
respond = ({ part }) => (part === "opening" ? "## Paper at a glance\n\nThe paper matters.\n\n## Concept map\n\nMaterialize **each stage** as a versioned artifact." : PARTS[part]);
await assert.rejects(make(), /opening: failed checks after 3 attempts/);
console.log("ok  v1-style output is rejected after three attempts");

// 4. A truncated part (unbalanced code fence) is rejected.
respond = ({ part }) => (part === "practitioner" ? PARTS[part] + "\n```python\nprint('cut off" : PARTS[part]);
await assert.rejects(make(), /practitioner: failed checks.*unbalanced code fence/);
console.log("ok  a truncated part is rejected");

// 5. Soft problems publish with a visible review banner instead of discarding the paper.
respond = ({ part }) => PARTS[part].replace(/<details>[\s\S]*?<\/details>/g, "(answer omitted)");
text = await make();
assert.match(text, /REVIEW NEEDED/);
assert.ok(v2Problems(text, ID, { pdfLink }).every(p => !isHardProblem(p)), "only soft problems remain");
console.log("ok  soft problems publish with a REVIEW NEEDED banner");

// 6. End to end: weekly generate() with the real v2 generator, one paper failing, then `--verify`.
respond = ({ part, prompt }) => (prompt.includes("Failing paper title") && part === "map-faq" ? "no headings here" : PARTS[part]);
const entry = (id, title, summary) => `<entry><id>http://arxiv.org/abs/${id}v1</id><updated>2026-11-14T00:00:00Z</updated><published>2026-11-14T00:00:00Z</published><title>${title}</title><summary>${summary}</summary><author><name>A Author</name></author><category term="cs.CL"/></entry>`;
const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${[
  entry("2611.00001", "Scaling language model pretraining with a new transformer architecture", "A transformer language model with new pretrain and scaling and attention and token embedding methods."),
  entry("2611.00002", "Failing paper title on retrieval and reasoning prompt methods", "Retrieval rag reasoning alignment fine-tuning prompt tool use memory inference adaptation.")
].join("")}</feed>`;
const feedFile = path.join(tmp, "feed.xml");
fs.writeFileSync(feedFile, feed);
const parse = argv => new Map(argv.map(x => { const [k, ...r] = x.split("="); return [k, r.length ? r.join("=") : true]; }));
process.env.WEEKLY_PR_BODY_PATH = path.join(tmp, "pr-body.md");
const args = parse(["--feed-file=" + feedFile, "--week-ending=2026-11-14", "--skip-download", "--max-papers=5"]);
await generate({ args, author: a => generatePaperGuideV2({ ...a, grounding }) });
const week = path.join(tmp, "weekly", "2026-11-14");
const meta = JSON.parse(fs.readFileSync(path.join(week, "metadata.json"), "utf8"));
assert.deepEqual(meta.map(m => m.id), ["2611.00001"], "the failing paper is skipped, the other kept");
const guide = fs.readFileSync(path.join(week, meta[0].guide), "utf8");
assert.match(guide, /^---\nformat: v2\narxiv: 2611\.00001\n---\n/);
assert.match(fs.readFileSync(path.join(week, "SKIPPED.md"), "utf8"), /2611\.00002/);
fs.mkdirSync(path.join(week, "papers"), { recursive: true });
fs.writeFileSync(path.join(week, meta[0].pdf), "%PDF-1.4\n");
const verify = spawnSync(process.execPath, [path.join(here, "weekly-update.mjs"), "--verify"], { env: { ...process.env }, encoding: "utf8" });
assert.equal(verify.status, 0, `weekly --verify should pass:\n${verify.stderr}`);
console.log("ok  weekly run writes a v2 guide, skips the failing paper, and --verify passes");

// 7. --max-papers limits cost.
fs.rmSync(path.join(tmp, "weekly"), { recursive: true, force: true });
await generate({ args: parse(["--feed-file=" + feedFile, "--week-ending=2026-11-14", "--skip-download", "--max-papers=1"]), author: a => generatePaperGuideV2({ ...a, grounding }) });
assert.equal(JSON.parse(fs.readFileSync(path.join(week, "metadata.json"), "utf8")).length, 1);
console.log("ok  --max-papers=1 authors a single paper");

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log("weekly v2 generation tests passed");
