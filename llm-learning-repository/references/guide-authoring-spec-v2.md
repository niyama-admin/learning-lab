# Paper guide authoring spec (format v2)

Purpose: a reader who has never opened the paper should finish the guide able to explain the idea, build a small version, and critique the evidence, **without having to open the PDF to fill gaps**. The PDF becomes a verification step, not a prerequisite.

## Why v2 exists

The v1 guides (papers 1-23, rendered from profiles) share one template. In practice they leave readers with open questions because:

1. **No worked example.** The mechanism is described abstractly ("materialize each stage as a versioned artifact") but never traced on a real input from the paper.
2. **The same sentences repeat** across the intuitive, practitioner and researcher levels, so the levels add length but not understanding.
3. **Generic scaffolding replaces paper-specific content.** The six "research notebook lenses" are one paragraph with a keyword swapped. Build advice is not specific to the paper.
4. **Terms are used before they are defined**, and the prerequisites are generic maths, not what this paper needs.
5. **Results are summarised, not explained.** A reader is told a number improved but not what the number counts, what the baseline was, or why it matters.
6. **No map to the PDF.** The reader is not told which section to read, which to skip, or where the likely confusions are.

v2 fixes each of these. A guide that does not meet the rules below fails `node verify-v2-guides.mjs`.

## Required structure (exact `##` headings, in this order)

Front matter first:

```
---
format: v2
arxiv: <id>
---
```

1. `# <Paper title>` then a blockquote with authors, year, arXiv abstract link, local PDF link.
2. `## Read this first` - the claim in one plain sentence; who it is for; what you will be able to do afterwards; estimated reading time for the guide; which earlier guides in this curriculum to have read (link them by relative path); the one thing most people get wrong about this paper.
3. `## The paper in one worked example` - pick **one concrete example from the paper itself** (a task, an input, a trace, a table row, a prompt) and trace it start to finish, showing the real inputs and outputs at every step. Every later section refers back to this example. Short quotations (under ~25 words, in quote marks) are fine; otherwise paraphrase. If the paper has no single example, construct one and say plainly that it is constructed.
4. `## Words you need` - a table of at least six paper-specific terms: term, plain definition, example drawn from the worked example. Define a term here or at first use, never after.
5. `## Tutorial 1 - Intuitive understanding` - for an intelligent reader with no computer-science background. Subsections: `### What was broken before` (a concrete failure, ideally shown), `### The idea` (analogy, plus exactly where the analogy breaks), `### How it works, step by step` (each step shown on the worked example), `### What the results say` (the actual numbers; for each: what is counted, compared to what, and what a change of that size means in practice), `### What this does not show`, `### Teach-back` (3-5 questions; answers inside `<details>`).
6. `## Tutorial 2 - Practitioner understanding` - for someone who will build or buy. Subsections: `### The design in concrete terms` (data structures, schemas, message formats, the paper's actual hyper-parameters and prompts where given), `### A minimal version` (runnable-looking code or pseudocode under 70 lines, with the shapes of inputs and outputs shown), `### What it costs` (worked arithmetic: tokens, calls, latency, money, with stated assumptions), `### How it fails` (a table: symptom, likely cause, mitigation, grounded in the paper's error analysis where it has one), `### Evaluating your version` (metric, test set size, baseline, a stop rule), `### Adopt, adapt or skip` (a clear recommendation with reasons for a team building an assistant over private business documents; the repo is customer-neutral, so do not name any customer or product owner).
7. `## Tutorial 3 - Researcher understanding` - `### Formal setup` (notation defined once, every symbol explained, with a numeric toy instance), `### The claims, stated precisely`, `### Evidence, table by table` (for each key table or figure: id, what rows and columns are, the headline numbers, and what it identifies causally versus only associates), `### Ablations and what they isolate`, `### Threats to validity specific to this paper`, `### Open problems and follow-ups`, `### What would change my mind`.
8. `## Reading map for the PDF` - a table: section or figure, what it contains, read / skim / skip for the first pass, and the guide section that answers the questions that part raises.
9. `## Questions readers get stuck on` - at least eight specific questions, each answered in 2-6 sentences. These must be questions a reader would really ask on first reading (not generic ones), covering terminology, numbers, mechanism, and "why not just X".
10. `## Prerequisites you actually need` - three to six `### Prerequisite N - <name>` blocks, only what *this paper* uses. Each has: a short plain explanation, a tiny worked numeric example, the place in the paper that uses it, and a pointer to a reference or an earlier guide. Do not pad with generic maths.
11. `## Where this sits in the curriculum` - what to have read before; how it differs from the two nearest papers; what to read next and why.
12. `## Checkpoint` - a self-test of five to eight items mixing explain, compute, and critique, with answers inside `<details>`.

## Content rules

- **Every number is checked against the PDF.** Give the table, figure, section or page for each headline figure. Never invent or round a figure so that it looks cleaner. If you cannot find a figure, say so rather than guess.
- **Mark the source of each claim.** Use plain wording such as "the paper reports (Table 2)" versus "this guide infers" or "the authors speculate". Do not present a guide-author inference as a result.
- **No repeated material.** No sentence over 100 characters may appear twice in the guide. Each level adds new content; a level may refer to another rather than restate it.
- **No scaffolding phrases.** The verifier rejects the v1 boilerplate (for example "Materialize", "strongest claim supported by the paper", "Research notebook lens").
- **Define before use, and expand every abbreviation** on first use, including model names, benchmark names and metrics.
- **Diagrams must carry meaning.** At least two Mermaid diagrams, each with labelled nodes and edges that say what flows (not "step 1 -> step 2"). One must show the mechanism; one must show the worked example or the system architecture. Follow each with prose naming what the reader should notice.
- **Explain results as a person would.** "34 points higher" must be followed by "meaning that out of every 100 tasks, about 34 more were completed than by the baseline".
- **State the paper's limits as the authors and the evidence give them**, and add which limits matter for a practitioner. Avoid generic "may not generalise" without saying what specifically differs.
- **Honest about scope.** Newer arXiv papers (2025-2026) may be preprints that have not been peer reviewed; say so when it is true and weigh the evidence accordingly.
- **Length.** 28,000-50,000 characters of substance. Do not pad to reach it. A guide that is shorter because the paper is narrow must still pass every structural rule.
- **Customer neutrality.** Do not include customer names, private data, or details of any specific business. Examples about "a small business assistant over private documents" are fine.
- **Links.** Link neighbouring guides by relative path, for example `[ReAct](../02-building/10-react.md)`. Link the local PDF as `../../papers/<id>.pdf`.

## Authoring process (for people or agents)

1. Read the whole paper, including appendices that contain prompts, examples, error analyses and hyper-parameters. Appendices are where worked examples live.
2. Write the worked example first and make sure every number and string in it is in the paper.
3. Write the glossary from the words you found yourself using in the example.
4. Write the three tutorials in order. Tutorial 2 and 3 may link back to Tutorial 1 but must not copy it.
5. Write the FAQ last, from the places where you had to stop and think while reading.
6. Run `node verify-v2-guides.mjs --only=<id>` and fix failures. Then re-read every number against the PDF one more time.
7. Run `node verify-repository.mjs`.
