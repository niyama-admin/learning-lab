import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const args = new Map(process.argv.slice(2).map(x => {
  const [key, ...rest] = x.split("=");
  return [key, rest.length ? rest.join("=") : true];
}));

const categories = [
  { key: "foundations", day: "Monday", label: "Foundations and model architecture", terms: ["transformer", "language model", "pretrain", "scaling", "token", "attention", "architecture", "embedding", "mixture of experts"] },
  { key: "building", day: "Tuesday", label: "Building, retrieval, reasoning, and adaptation", terms: ["retrieval", "rag", "reasoning", "alignment", "fine-tun", "prompt", "tool use", "memory", "inference", "adaptation"] },
  { key: "evaluation-code", day: "Wednesday", label: "Evaluation and source-code benchmarks", terms: ["evaluation", "benchmark", "software", "code", "repository", "github", "hallucination", "truthful", "safety", "swe"] },
  { key: "agents-protocols", day: "Thursday", label: "Agents, swarms, protocols, and channels", terms: ["agent", "multi-agent", "swarm", "protocol", "mcp", "a2a", "orchestration", "communication", "coordination", "workflow"] },
  { key: "small-business", day: "Friday", label: "Small-business applications and human productivity", terms: ["productivity", "business", "enterprise", "customer", "worker", "organization", "commerce", "economics", "support", "small business"] }
];

const decodeXml = value => value
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"').replaceAll("&#39;", "'").replace(/\s+/g, " ").trim();
const element = (xml, name) => decodeXml(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

export function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const rawId = element(entry, "id");
    const id = rawId.match(/(?:abs\/|arXiv:)(\d{4}\.\d{4,5})(?:v\d+)?/)?.[1];
    return {
      id,
      title: element(entry, "title"),
      abstract: element(entry, "summary"),
      published: element(entry, "published"),
      updated: element(entry, "updated"),
      authors: [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map(m => decodeXml(m[1])),
      subjects: [...entry.matchAll(/<category[^>]*term=["']([^"']+)["']/g)].map(m => m[1])
    };
  }).filter(x => x.id && x.title && x.abstract);
}

const endDate = value => {
  const date = value ? new Date(`${value}T23:59:59Z`) : new Date();
  if (Number.isNaN(date.valueOf())) throw new Error(`invalid --week-ending date: ${value}`);
  return date;
};
const isoDay = date => date.toISOString().slice(0, 10);
const slugify = text => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
const escapeCell = text => text.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();

function knownIds() {
  const ids = new Set();
  const manifest = path.join(root, "manifest.csv");
  if (fs.existsSync(manifest)) {
    for (const match of fs.readFileSync(manifest, "utf8").matchAll(/\b(\d{4}\.\d{4,5})\b/g)) ids.add(match[1]);
  }
  const weekly = path.join(root, "weekly");
  if (fs.existsSync(weekly)) {
    for (const file of fs.readdirSync(weekly, { recursive: true }).filter(x => x.endsWith("metadata.json"))) {
      const records = JSON.parse(fs.readFileSync(path.join(weekly, file), "utf8"));
      for (const record of records) ids.add(record.id);
    }
  }
  return ids;
}

function relevance(paper, category, end) {
  const haystack = `${paper.title} ${paper.abstract}`.toLowerCase();
  const title = paper.title.toLowerCase();
  const termScore = category.terms.reduce((sum, term) => sum + (title.includes(term) ? 5 : haystack.includes(term) ? 2 : 0), 0);
  const researchFit = paper.subjects.some(x => ["cs.CL", "cs.AI", "cs.LG", "cs.SE", "cs.MA", "cs.HC"].includes(x)) ? 2 : 0;
  const ageDays = Math.max(0, (end - new Date(paper.published)) / 86_400_000);
  return termScore + researchFit + Math.max(0, 2 - ageDays / 7);
}

function selectPapers(papers, known, start, end) {
  const recent = papers.filter(p => {
    const date = new Date(p.published);
    return date >= start && date <= end && !known.has(p.id);
  });
  const selected = [];
  const used = new Set();
  for (const category of categories) {
    const ranked = recent.filter(x => !used.has(x.id)).map(paper => ({ paper, score: relevance(paper, category, end) }))
      .filter(x => x.score >= 4).sort((a, b) => b.score - a.score || new Date(b.paper.published) - new Date(a.paper.published));
    if (ranked[0]) {
      selected.push({ ...ranked[0].paper, category: category.key, day: category.day, categoryLabel: category.label, score: Number(ranked[0].score.toFixed(2)) });
      used.add(ranked[0].paper.id);
    }
  }
  return selected;
}

function fallbackGuide(paper) {
  const firstSentence = paper.abstract.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || paper.abstract;
  return `## Tutorial 1 - intuition\n\n${firstSentence} In plain language, this paper asks whether a new method or observation changes what an LLM system can do, how reliably it can do it, or what it costs. Start by identifying the before-and-after comparison and one everyday analogy.\n\n## Tutorial 2 - practitioner context\n\nRead the method and evaluation sections and turn the paper into a decision: what component would change, what baseline should remain, and which user outcome would justify adoption? Reproduce the smallest reported comparison. Record model, data, prompt, code, environment, latency, cost, and failure cases. Do not infer production readiness from the abstract.\n\n## Tutorial 3 - researcher depth\n\nIdentify the estimand or central claim, the experimental unit, dataset construction, controls, uncertainty, ablations, and threats to validity. Reconstruct one table or figure, then vary one assumption. Check contamination, selection effects, evaluator dependence, compute matching, and whether the conclusion transfers beyond the reported tasks.\n\n### Research questions\n\n- Which result most strongly distinguishes the method from its baseline?\n- Which uncontrolled variable could explain the same result?\n- What ablation or replication would most reduce uncertainty?`;
}

async function llmGuide(paper) {
  if (!process.env.MODEL_ACCESS_KEY || args.has("--no-llm")) return fallbackGuide(paper);
  const input = `Create a concise tutorial for this arXiv paper using only the supplied metadata. Do not invent results, equations, datasets, or claims not present in the abstract. Use these exact Markdown headings: "## Tutorial 1 - intuition", "## Tutorial 2 - practitioner context", "## Tutorial 3 - researcher depth", and "### Research questions". Explain for a non-computer-scientist, then an implementing computer scientist, then a researcher. Include a simple Mermaid flowchart and clearly label uncertainties.\n\nTitle: ${paper.title}\nAuthors: ${paper.authors.join(", ")}\nCategories: ${paper.subjects.join(", ")}\nAbstract: ${paper.abstract}`;
  const response = await fetch("https://inference.do-ai.run/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.MODEL_ACCESS_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.DIGITALOCEAN_MODEL_ID || "openai-gpt-5.5", input, max_output_tokens: 1800, temperature: 0.2, stream: false })
  });
  if (!response.ok) throw new Error(`DigitalOcean inference HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const json = await response.json();
  const text = json.output_text || json.output?.flatMap(x => x.content ?? []).filter(x => x.type === "output_text").map(x => x.text).join("\n");
  if (!text?.includes("Tutorial 1") || !text.includes("Tutorial 3")) throw new Error("DigitalOcean model response lacked required tutorial sections");
  return text.trim();
}

async function fetchFeed() {
  if (args.get("--feed-file")) return fs.readFileSync(path.resolve(args.get("--feed-file")), "utf8");
  const query = encodeURIComponent("cat:cs.CL OR cat:cs.AI OR cat:cs.LG OR cat:cs.SE OR cat:cs.MA OR cat:cs.HC");
  const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=300&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url, { headers: { "User-Agent": "niyama-llm-learning-repository/1.0 (weekly educational curation)" } });
  if (!response.ok) throw new Error(`arXiv HTTP ${response.status}`);
  return response.text();
}

async function downloadPdf(paper, output) {
  if (args.has("--skip-download")) return;
  const response = await fetch(`https://arxiv.org/pdf/${paper.id}`, { headers: { "User-Agent": "niyama-llm-learning-repository/1.0" } });
  if (!response.ok) throw new Error(`${paper.id}: PDF HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")) || bytes.length < 10_000) throw new Error(`${paper.id}: invalid PDF`);
  fs.writeFileSync(output, bytes);
}

async function generate() {
  const end = endDate(args.get("--week-ending"));
  const start = new Date(end.valueOf() - 7 * 86_400_000);
  const week = isoDay(end);
  const weekRoot = path.join(root, "weekly", week);
  if (fs.existsSync(path.join(weekRoot, "metadata.json"))) {
    console.log(`Week ${week} is already recorded; no changes made`);
    return;
  }
  const feed = parseFeed(await fetchFeed());
  const selected = selectPapers(feed, knownIds(), start, end);
  if (!selected.length) {
    console.log(`No qualifying new papers for ${isoDay(start)} through ${week}`);
    return;
  }
  if (args.has("--dry-run")) {
    for (const paper of selected) console.log(`${paper.day}: ${paper.id} [${paper.category}] ${paper.title}`);
    return;
  }
  const paperRoot = path.join(weekRoot, "papers");
  const guideRoot = path.join(weekRoot, "daily-plan");
  fs.mkdirSync(paperRoot, { recursive: true });
  fs.mkdirSync(guideRoot, { recursive: true });
  const checksumLines = [];
  for (const paper of selected) {
    const pdf = path.join(paperRoot, `${paper.id}.pdf`);
    await downloadPdf(paper, pdf);
    let tutorial;
    try { tutorial = await llmGuide(paper); }
    catch (error) { console.warn(`${paper.id}: LLM enrichment failed; using fallback: ${error.message}`); tutorial = fallbackGuide(paper); }
    const filename = `${paper.day.toLowerCase()}-${paper.category}-${slugify(paper.title)}.md`;
    const guide = `# ${paper.day}: ${paper.title}\n\n> **Category:** ${paper.categoryLabel}  \n> **Authors:** ${paper.authors.join(", ")}  \n> **Published:** ${paper.published.slice(0, 10)}  \n> **Sources:** [arXiv abstract](https://arxiv.org/abs/${paper.id}) · [local PDF](../papers/${paper.id}.pdf)  \n> **Selection score:** ${paper.score} (keyword relevance and recency; not a quality verdict)\n\n## Abstract\n\n${paper.abstract}\n\n${tutorial}\n\n## Daily study plan (60-90 minutes)\n\n1. **15 min:** Read Tutorial 1, abstract, figures, and conclusion; give a five-minute teach-back.\n2. **25 min:** Read Tutorial 2 and methods; write the smallest baseline comparison.\n3. **25 min:** Read Tutorial 3 and results; inspect one table, uncertainty estimate, or ablation.\n4. **15 min:** Record claim, evidence, assumption, failure mode, and next experiment.\n5. **10 min:** Link the paper to one earlier curriculum paper and note what changed.\n`;
    fs.writeFileSync(path.join(guideRoot, filename), guide);
    if (fs.existsSync(pdf)) checksumLines.push(`${crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex")}  papers/${paper.id}.pdf`);
    paper.guide = `daily-plan/${filename}`;
    paper.pdf = `papers/${paper.id}.pdf`;
  }
  fs.writeFileSync(path.join(weekRoot, "metadata.json"), JSON.stringify(selected, null, 2) + "\n");
  fs.writeFileSync(path.join(weekRoot, "checksums.sha256"), checksumLines.join("\n") + (checksumLines.length ? "\n" : ""));
  const rows = categories.map(category => {
    const paper = selected.find(x => x.category === category.key);
    return paper ? `| ${category.day} | ${category.label} | [${escapeCell(paper.title)}](${paper.guide}) |` : `| ${category.day} | ${category.label} | Catch up, reproduce, and review prior notes |`;
  }).join("\n");
  fs.writeFileSync(path.join(weekRoot, "README.md"), `# Week ending ${week}\n\nPapers submitted from ${isoDay(start)} through ${week}, selected from the latest arXiv feed. Selection balances the five curriculum categories and excludes papers already recorded in the core or weekly collections. Human review is required before merging.\n\n| Day | Category | Reading |\n|---|---|---|\n${rows}\n\n## Curation notes\n\nThe score is a transparent relevance heuristic based on title/abstract keywords, arXiv subject fit, and recency. It is not peer review, citation impact, or a quality guarantee. Read the paper and verify all generated explanations against the source PDF.\n`);
  updateWeeklyIndex(week, selected.length);
  console.log(`Created week ${week} with ${selected.length} papers`);
}

function updateWeeklyIndex(week, count) {
  const weeklyRoot = path.join(root, "weekly");
  fs.mkdirSync(weeklyRoot, { recursive: true });
  const readme = path.join(weeklyRoot, "README.md");
  let text = fs.existsSync(readme) ? fs.readFileSync(readme, "utf8") : "# Weekly LLM knowledge updates\n\nSaturday-generated, human-reviewed additions to the core curriculum.\n\n| Week ending | Selected papers |\n|---|---:|\n";
  if (!text.includes(`](${week}/README.md)`)) text += `| [${week}](${week}/README.md) | ${count} |\n`;
  fs.writeFileSync(readme, text);
}

function verify() {
  const weeklyRoot = path.join(root, "weekly");
  if (!fs.existsSync(weeklyRoot)) { console.log("weekly repository is empty"); return; }
  let failures = 0;
  for (const file of fs.readdirSync(weeklyRoot, { recursive: true }).filter(x => x.endsWith("metadata.json"))) {
    const dir = path.dirname(path.join(weeklyRoot, file));
    const records = JSON.parse(fs.readFileSync(path.join(weeklyRoot, file), "utf8"));
    for (const record of records) {
      const guide = path.join(dir, record.guide); const pdf = path.join(dir, record.pdf);
      if (!fs.existsSync(guide)) { console.error(`missing guide ${guide}`); failures++; }
      else {
        const text = fs.readFileSync(guide, "utf8");
        for (const required of ["Tutorial 1", "Tutorial 2", "Tutorial 3", "Daily study plan"]) if (!text.includes(required)) { console.error(`${guide}: missing ${required}`); failures++; }
      }
      if (!fs.existsSync(pdf)) { console.error(`missing PDF ${pdf}`); failures++; }
      else if (!fs.readFileSync(pdf).subarray(0, 5).equals(Buffer.from("%PDF-"))) { console.error(`invalid PDF ${pdf}`); failures++; }
    }
  }
  if (failures) process.exit(1);
  console.log("verified weekly repository");
}

async function selfTest() {
  const sample = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2608.12345v1</id><updated>2026-08-25T00:00:00Z</updated><published>2026-08-25T00:00:00Z</published><title>Evaluating Multi-Agent LLMs for Small Business Software Repositories</title><summary>We introduce an evaluation benchmark for language model agents that repair repository issues and support business workflows.</summary><author><name>Example Author</name></author><category term="cs.AI"/></entry></feed>`;
  const parsed = parseFeed(sample);
  if (parsed.length !== 1 || parsed[0].id !== "2608.12345" || parsed[0].authors[0] !== "Example Author") throw new Error("feed parser self-test failed");
  const end = new Date("2026-08-26T23:59:59Z");
  if (!selectPapers(parsed, new Set(), new Date(end - 7 * 86_400_000), end).length) throw new Error("selection self-test failed");
  console.log("weekly updater self-test passed");
}

if (args.has("--verify")) verify();
else if (args.has("--self-test")) await selfTest();
else await generate();
