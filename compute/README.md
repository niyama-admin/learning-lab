# Compute architecture learning track

This top-level track explains how CPUs, GPUs, and memory systems execute software. It follows the same three-pass method as the LLM paper repository:

1. **Intuitive:** build a correct mental model without assuming computer architecture.
2. **Practitioner:** connect source code, compilers, operating systems, profiling, and hardware.
3. **Researcher:** read specifications and papers precisely, reconstruct models, and design microbenchmarks.

Start with [ROADMAP.md](ROADMAP.md). The curriculum deliberately distinguishes:

- an **ISA**, the software-visible contract such as x86-64 or AArch64;
- a **microarchitecture**, one implementation of that contract;
- a **programming model**, such as CUDA, HIP, or SYCL;
- a **product**, which selects capacities, clocks, links, and memory technology.

## Layout

- `tutorials/`: ordered three-level tutorials
- `sources/`: downloaded vendor documents and peer-reviewed/arXiv papers
- `manifest.csv`: canonical source metadata, live specification links, and tutorial mapping
- `render-compute-tutorials.mjs`: deterministic local renderer; it does not call a model API
- `verify-compute.mjs`: validates PDFs, source mappings, tutorial structure, and depth

## Tutorial standard (format v2)

All ten tutorials use **format v2**, the same standard as the [LLM paper guides](../llm-learning-repository/references/guide-authoring-spec-v2.md), adapted for vendor manuals and papers in [AUTHORING.md](AUTHORING.md). Each has a worked example built from real material, terms defined before use, results explained in plain words, a map of the sources by PDF page, the questions readers get stuck on, and only the prerequisites the tutorial uses. Every number is tied to a **named product and generation** and cited to a PDF page or live URL, and inconsistencies found inside the sources are listed instead of silently fixed.

**Measured, not just described.** Where the authoring machine could run it (an Apple M5 Pro, Arm, with `clang`), the tutorials compile and run real programs: a pointer-chasing latency staircase, dependent-chain instruction latency, a message-passing litmus test that shows the weak-memory outcome appear with relaxed atomics and vanish with release/acquire, Neon intrinsics, a CPU-versus-GPU break-even measurement. Those numbers are properties of that one machine and are labelled as such; they illustrate a method and are never claims about the vendor hardware a tutorial describes. x86-64, CUDA, HIP and SYCL code could not be run there and is labelled `not run`.

**Limits.** Two x86-64 vendor manuals (AMD APM, Intel SDM) could not be fetched automatically, so the x86-64 tutorial marks statements about them as general knowledge. The local CUDA guide is the legacy 13.3 snapshot that NVIDIA has since replaced; the CUDA tutorial notes the differences it found against the live guide.

```text
node compute/verify-compute.mjs
```

`render-compute-tutorials.mjs` is the legacy template renderer; it skips v2 tutorials unless `--overwrite-v2` is passed (do not).

Vendor manuals evolve. The manifest records a retrieval date and keeps live documentation URLs next to local snapshots. Treat performance numbers as properties of the named implementation and configuration, not of an ISA in general.

## Curriculum

| Order | Tutorial | Main question |
|---:|---|---|
| 1 | [The map: ISA, microarchitecture, and programming model](tutorials/01-architecture-map.md) | What exactly are x86-64, Arm, CUDA, HIP, and Xe? |
| 2 | [Memory from registers to GPU HBM](tutorials/02-memory-hierarchy.md) | How do virtual memory, caches, DRAM, device memory, and coherence interact? |
| 3 | [x86-64](tutorials/x86-64/03-x86-64.md) | How does a complex, compatibility-rich ISA become fast modern execution? |
| 4 | [Arm A-profile](tutorials/arm/04-arm-a-profile.md) | How do AArch64, weak memory, Neon, SVE, and implementation freedom fit together? |
| 5 | [GPU foundations](tutorials/gpu/05-gpu-foundations.md) | Why do GPUs trade single-thread latency for throughput? |
| 6 | [NVIDIA CUDA architecture](tutorials/gpu/nvidia/06-cuda-architecture.md) | How do grids, blocks, warps, SMs, and memory spaces map to hardware? |
| 7 | [NVIDIA microbenchmarking](tutorials/gpu/nvidia/07-nvidia-microbenchmarking.md) | How can experiments reveal undocumented cache and pipeline behavior? |
| 8 | [AMD CDNA and HIP](tutorials/gpu/amd/08-amd-cdna-hip.md) | How do compute units, wavefronts, LDS, HBM, and Infinity Fabric compare? |
| 9 | [Intel Xe and oneAPI](tutorials/gpu/intel/09-intel-xe-oneapi.md) | How do Xe-cores, SIMD, SLM, XMX, and SYCL fit together? |
| 10 | [Choosing CPU, GPU, and memory placement](tutorials/10-cpu-gpu-decision.md) | When does acceleration overcome transfer, launch, and synchronization costs? |

