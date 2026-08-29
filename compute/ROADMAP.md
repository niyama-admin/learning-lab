# Compute architecture roadmap

Use three passes over ten weeks. Spend about 45 minutes on intuition, 2-4 hours on the practitioner lab, and only then attempt the researcher reconstruction.

| Week | Topic | Intuition checkpoint | Practitioner artifact | Researcher artifact |
|---:|---|---|---|---|
| 1 | Architecture vocabulary | Explain ISA versus chip versus API | Compile one function and inspect assembly | Trace one source statement through compiler, ISA, and execution resources |
| 2 | Memory hierarchy | Explain why “memory speed” is not one number | Run sequential/strided pointer tests | Fit latency and bandwidth regimes; discuss confounders |
| 3 | x86-64 | Explain registers, instructions, and out-of-order execution | Inspect scalar and vectorized x86-64 | Reconstruct a throughput model from counters and instruction tables |
| 4 | Arm A-profile | Explain AArch64 and weak ordering | Cross-compile and inspect A64/Neon | Analyze a litmus test and the required acquire/release edges |
| 5 | GPU foundations | Explain throughput versus latency | Write a portable vector-add kernel | Derive occupancy and arithmetic-intensity bounds |
| 6 | NVIDIA CUDA | Explain block, warp, SM, and memory spaces | Profile a CUDA kernel if hardware is available | Reconstruct coalescing, occupancy, and divergence hypotheses |
| 7 | Microbenchmarking | Explain measurement versus specification | Implement pointer-chase and bandwidth probes | Separate cache geometry hypotheses with controlled experiments |
| 8 | AMD CDNA/HIP | Compare wavefront/LDS with warp/shared memory | Port a small CUDA-shaped kernel to HIP | Analyze host-device links and HBM bottlenecks |
| 9 | Intel Xe/oneAPI | Explain Xe-core, XVE, XMX, and SLM | Express the kernel in SYCL | Compare subgroup/SIMD choices and matrix-engine utilization |
| 10 | Architecture choice | Place a workload on CPU or GPU and defend it | Produce a measured decision memo | Build a roofline-style model including transfer and launch overhead |

## Safe lab policy

Microbenchmarks are diagnostic, not universal rankings. Record the exact processor/GPU, firmware, driver, compiler, clock policy, power mode, NUMA placement, page size, data size, warm-up, repetitions, and uncertainty. Do not run stress tests on production machines without authorization.

