# Technique explainer authoring spec (format technique-v1)

Purpose: a reader who has never read the source papers finishes an explainer able to explain the technique, run a small version, decide whether an enterprise small language model (SLM) project should use it, and critique the evidence, **without opening the papers to fill gaps**. This is the lab's [paper guide v2 format](../../../llm-learning-repository/references/guide-authoring-spec-v2.md) adapted from "one paper" to "one technique with a few key papers". Read that spec's "Why v2 exists" section; the same failure modes apply.

Checked by `node agents/small-language-models/techniques/verify-techniques.mjs` (run from the repository root). A guide that fails the checker is not done.

## Required structure (exact `##` headings, in this order)

Front matter first:

```
---
format: technique-v1
slug: <file name without .md>
---
```

1. `# <Technique name>` then a blockquote: the key papers (authors, year, arXiv abstract link each) and a one-line scope note (what this explainer covers and does not).
2. `## Read this first` - the idea in one plain sentence; who it is for; what you will be able to do afterwards; reading time; which other explainers or lab guides to have read (relative links); **the one thing most people get wrong**.
3. `## The technique in one worked example` - one concrete example traced from input to output with real numbers and strings at every step. If it comes from a paper, give the table, figure or section. If it is constructed, say plainly "constructed by this guide" and keep the arithmetic checkable by hand. Every later section refers back to it.
4. `## Words you need` - a table of at least six technique-specific terms: term, plain definition, example from the worked example. Expand every abbreviation on first use.
5. `## Tutorial 1 - Intuitive understanding` - for an intelligent reader with no computer-science background. Subsections, exact titles: `### What was broken before`, `### The idea`, `### How it works, step by step`, `### What the evidence says`, `### What this does not show`, `### Teach-back` (3 to 5 questions, answers inside `<details>`). `### The idea` must give an analogy and say exactly where the analogy breaks.
6. `## Tutorial 2 - Practitioner understanding` - for someone who will build or buy. Subsections, exact titles: `### The design in concrete terms` (real hyper-parameters, tool names, flags, file formats and shapes), `### A minimal version` (code or pseudocode under 70 lines with input and output shapes shown; prefer the real library call such as TRL, PEFT, MLX-LM, vLLM, llama.cpp; mark code as unrun if you did not run it), `### What it costs` (worked arithmetic with stated assumptions: memory, tokens, time, money), `### How it fails` (a table: symptom, likely cause, mitigation), `### Evaluating your version` (metric, test-set size, baseline, a stop rule), `### Adopt, adapt or skip` (a clear recommendation for an enterprise building a small model over private documents; customer-neutral).
7. `## Tutorial 3 - Researcher understanding` - subsections, exact titles: `### Formal setup` (notation defined once, a numeric toy instance), `### The claims, stated precisely`, `### Evidence, table by table` (id, rows and columns, headline numbers, and what the table identifies causally versus only associates), `### Ablations and what they isolate`, `### Threats to validity`, `### Open problems and follow-ups`, `### What would change my mind`.
8. `## Reading map for the key papers` - a table: paper section or figure, what it contains, read / skim / skip, and which part of this guide answers the questions it raises.
9. `## Questions readers get stuck on` - at least eight specific questions a reader would really ask, each answered in 2 to 6 sentences, covering terminology, numbers, mechanism and "why not just X".
10. `## Prerequisites you actually need` - three to six `### Prerequisite N - <name>` blocks, only what *this technique* uses, each with a short plain explanation, a tiny worked numeric example, where the technique uses it, and a pointer to an earlier guide or reference.
11. `## Where this sits` - what to read before and after (relative links to sibling explainers in this folder and to lab guides), how it differs from the two nearest techniques, and what to read next.
12. `## Checkpoint` - five to eight items mixing explain, compute and critique, answers inside `<details>`.

## Content rules

- **Check every number against the primary source.** Fetch the arXiv abstract and the HTML or text of the paper (pdftoppm is not available; use arxiv.org/html or the abs page; Hugging Face model cards and official docs for tools). Give the table, figure, section or doc page for each headline figure. Never round a figure so it looks cleaner. If you cannot verify a figure, say "unverified" in the text instead of guessing.
- **Every factual statement carries an inline source link** (arXiv abstract, official documentation, repository file, model card). A claim without a link is either removed or labelled **Judgment:** (this guide's recommendation or inference) or **Assumption:** (an input to arithmetic). Never state an unsourced fact in plain prose. At least 10 distinct external links per explainer.
- **Mark the source of each claim:** "the paper reports (Table 2)", "the documentation says", "this guide infers", "vendor claim", "the authors speculate". Do not present your own inference as a result. Say when a source is a preprint or vendor blog.
- **No repeated material.** No sentence over 100 characters may appear twice in one guide. A later level may refer to an earlier one instead of restating it.
- **No scaffolding phrases** such as "Materialize", "strongest claim supported by the paper", "Research notebook lens".
- **Diagrams carry meaning:** at least two Mermaid diagrams with labelled nodes and edges that say what flows (not "step 1 -> step 2"). One shows the mechanism; one shows the worked example or the system around it. Follow each with prose saying what to notice.
- **Explain results as a person would:** "34 points higher" is followed by "meaning that out of every 100 tasks about 34 more were completed than by the baseline".
- **Honest about scope.** State limits as the authors and the evidence give them, and which limits matter for an enterprise SLM team. Avoid "may not generalise" without saying what differs.
- **Dated.** Put "Written 2026-11-26" (or the real date) under the title block; tool facts and prices decay.
- **Length:** aim for 18,000 to 40,000 characters of substance; the checker's hard cap is 50,000. Do not pad. A narrower technique may be shorter but must pass every structural rule.
- **Customer neutrality.** No customer names, private data or details of any specific business. Our own experiment aggregates may be cited only as already written in [04 Build and deploy playbook](../04-build-and-deploy-playbook.md#7-a-measured-case-from-our-own-experiments).
- **Links:** sibling explainers by relative path (`./02-lora.md`); the section files as `../01-options-and-trade-offs.md`; lab tutorials as `../../../llm-learning-repository/tutorials/...`.
- **Other lab content is not to be duplicated.** Where a lab paper guide already exists (for example [LoRA](../../../llm-learning-repository/tutorials/02-building/09-lora.md)), this explainer is the *SLM-project view*: it links to the guide for the paper's own walk-through and adds what an SLM team needs (tooling, serving, failure modes, decision).

## Authoring process

1. Read the primary papers and the current tool documentation first; write notes of every figure you will use with its location.
2. Write the worked example first; make every number checkable.
3. Write the glossary from the words you used in the example.
4. Write the three tutorials in order; tutorials 2 and 3 may link back but must not copy tutorial 1.
5. Write the questions section last, from places where you had to stop and think.
6. Run the checker for your file(s) and fix every failure; then re-read every number against its source once more.
7. Do not commit; the maintainer commits.
