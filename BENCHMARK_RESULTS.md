# Benchmark Results

Generated: 2026-08-12T19:23:53.488Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
| Node SHA-256 (1K) | 166667 | 3 | 5 | 49 | 5 | 8.17 | 24.43 | 1000 | 6 |
| Node SHA-256 (10K) | 333333 | 2 | 4 | 24 | 3 | 8.35 | 42.58 | 10000 | 30 |
| Node SHA-512 (1K) | 333333 | 2 | 5 | 23 | 3 | 11.09 | 37.98 | 1000 | 3 |
| Node SHA-512 (10K) | 312500 | 2 | 5 | 20 | 3 | 10.91 | 32.39 | 10000 | 32 |
| Native scanPacket (1K) | 111111 | 1 | 29 | 71 | 9 | 10.34 | 26.41 | 1000 | 9 |
| Native scanPacket (10K) | 555556 | 1 | 1 | 7 | 2 | 8.31 | 57.91 | 10000 | 18 |
| Native scanBatch (1K) | 500 | 1763 | 1763 | 1763 | 1763 | 9.96 | 31.1 | 1 | 2 |
| Native scanBatch (10K) | 143 | 7352 | 7352 | 7352 | 7352 | 10.37 | 42.2 | 1 | 7 |
| Native scanBatch (100K) | 15 | 66512 | 66512 | 66512 | 66512 | 23.34 | 33.33 | 1 | 66 |
| Native SHA-256 (1K) | 167 | 6699 | 6699 | 6699 | 6699 | 24 | 56.15 | 1 | 6 |
| Native SHA-256 (10K) | 33 | 30370 | 30370 | 30370 | 30370 | 28.97 | 36.26 | 1 | 30 |
| Native SHA-512 (1K) | 333 | 3683 | 3683 | 3683 | 3683 | 29.59 | 30.57 | 1 | 3 |
| Native SHA-512 (10K) | 20 | 49600 | 49600 | 49600 | 49600 | 25.77 | 32.17 | 1 | 49 |
| Native CRC-32 (1K) | 83 | 12245 | 12245 | 12245 | 12245 | 26.08 | 38.69 | 1 | 12 |
| Native CRC-32 (10K) | 22 | 45686 | 45686 | 45686 | 45686 | 28.74 | 25.06 | 1 | 46 |
| Burst Attack (5K scanPacket) | 2500000 | 0 | 0 | 0 | 0 | 29 | 0 | 5000 | 2 |

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
