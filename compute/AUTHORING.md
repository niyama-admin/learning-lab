# Authoring compute tutorials (format v2)

Compute tutorials follow the shared [guide authoring spec v2](../llm-learning-repository/references/guide-authoring-spec-v2.md) (same sections, same rules about worked examples, define-before-use, no repeated sentences, and labelled constructed numbers). This file lists only what differs because the sources are vendor manuals, white papers and a few arXiv papers rather than one arXiv paper. `node compute/verify-compute.mjs` enforces it.

## Differences from paper guides

- **Front matter:**

  ```
  ---
  format: v2
  track: compute
  sources: [source-id-1, source-id-2]
  ---
  ```

  `sources` lists every manifest id mapped to this tutorial in [manifest.csv](manifest.csv). The text must link each source's canonical URL.
- **Reading map:** the heading is `## Reading map for the sources`. Give page ranges or section names for each source, using PDF page numbers of the local PDF (so a reader can verify), or the live URL and section for sources with no local PDF.
- **No arXiv abstract or `papers/` links are required** (the verifier skips them). Link the local PDF with a relative path such as `../../sources/gpu/nvidia/cuda-programming-guide.pdf` (adjust depth to the tutorial's folder).
- **Every number belongs to a named implementation.** A cache size, a latency or a bandwidth is a property of one product and configuration, not of an ISA. Say which product and generation each number comes from, and cite the source page. Do not carry a number from one generation to another.
- **Worked example** must be real and checkable: a calculation with the vendor's own limits (for example occupancy from the documented register-file and shared-memory sizes), a real instruction or kernel sequence from the source, or a measurement you actually ran. Constructed numbers are allowed only if labelled constructed.
- **Measure when you can.** The authoring machine is an Apple M5 Pro (Arm) with `clang`. A minimal version of a memory-hierarchy or Arm tutorial can be compiled and run. Report the machine, compiler flags and the numbers, labelled as measured on that machine, and never present them as properties of the vendor hardware a tutorial describes. x86-64, CUDA, HIP and SYCL code cannot be run on that machine: label it `not run` and explain how a reader would run it. Do not run x86-64 code under Rosetta for microarchitecture claims.
- **Prerequisites** (three to six) are only what the tutorial uses: for example address translation, cache lines and associativity, memory-level parallelism, Little's law, roofline, amdahl, memory-ordering litmus tests. Each has a tiny worked numeric example.
- **Sources that are live specifications** have no local PDF. Fetch the canonical URL, say what you read and its version, and mark anything you could not reach.
