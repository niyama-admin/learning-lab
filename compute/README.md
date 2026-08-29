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

## Local build

```text
node compute/render-compute-tutorials.mjs
node compute/verify-compute.mjs
```

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

