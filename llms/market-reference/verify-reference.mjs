import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const errors = [];

function csvColumns(line) {
  let columns = 1;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (line[index] === "," && !quoted) {
      columns += 1;
    }
  }
  if (quoted) errors.push("Unclosed CSV quote: " + line.slice(0, 80));
  return columns;
}

for (const relative of ["data/models.csv", "data/benchmarks.csv"]) {
  const lines = fs.readFileSync(path.join(root, relative), "utf8").trim().split(/\r?\n/);
  const expected = csvColumns(lines[0]);
  lines.slice(1).forEach((line, index) => {
    const actual = csvColumns(line);
    if (actual !== expected) {
      errors.push(`${relative}:${index + 2} has ${actual} columns; expected ${expected}`);
    }
  });
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

for (const file of walk(root).filter((candidate) => candidate.endsWith(".md"))) {
  const body = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(root, file);
  if (/\b(?:TODO|FIXME|TBD)\b/.test(body)) errors.push(`${relativeFile} contains a placeholder`);

  for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) errors.push(`${relativeFile} has missing local link: ${match[1]}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("LLM market reference validation passed.");
