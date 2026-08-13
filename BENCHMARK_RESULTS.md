# Benchmark Results

Generated: 2026-08-13T07:39:15.564Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
| Node SHA-256 (1K) | 333333 | 2 | 3 | 15 | 2 | 8.16 | 23.42 | 1000 | 3 |
| Node SHA-256 (10K) | 476190 | 1 | 3 | 7 | 2 | 8.41 | 42.13 | 10000 | 21 |
| Node SHA-512 (1K) | 333333 | 1 | 5 | 8 | 2 | 10.57 | 24.18 | 1000 | 3 |
| Node SHA-512 (10K) | 476190 | 1 | 4 | 10 | 2 | 10.3 | 37.27 | 10000 | 21 |
| Native scanPacket (1K) | 111111 | 7 | 14 | 24 | 9 | 9.17 | 26.66 | 1000 | 9 |
| Native scanPacket (10K) | 121951 | 7 | 13 | 26 | 8 | 9.85 | 26.91 | 10000 | 82 |
| Native scanBatch (1K) | 143 | 7404 | 7404 | 7404 | 7404 | 8.66 | 26.56 | 1 | 7 |
| Native scanBatch (10K) | 13 | 78940 | 78940 | 78940 | 78940 | 14.56 | 31.75 | 1 | 79 |
| Native scanBatch (100K) | 1 | 823039 | 823039 | 823039 | 823039 | 69.74 | 30.14 | 1 | 824 |
| Native SHA-256 (1K) | 333 | 3415 | 3415 | 3415 | 3415 | 70.09 | 28.59 | 1 | 3 |
| Native SHA-256 (10K) | 30 | 32763 | 32763 | 32763 | 32763 | 73.37 | 27.44 | 1 | 33 |
| Native SHA-512 (1K) | 200 | 4826 | 4826 | 4826 | 4826 | 73.76 | 37.44 | 1 | 5 |
| Native SHA-512 (10K) | 16 | 60848 | 60848 | 60848 | 60848 | 77.12 | 25.2 | 1 | 61 |
| Native CRC-32 (1K) | 500 | 2247 | 2247 | 2247 | 2247 | 77.35 | 28.59 | 1 | 2 |
| Native CRC-32 (10K) | 42 | 23543 | 23543 | 23543 | 23543 | 68.66 | 29.53 | 1 | 24 |
| Burst Attack (5K scanPacket) | 1666667 | 0 | 0 | 0 | 0 | 70 | 0 | 5000 | 3 |

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
