# Benchmark Results

Generated: 2026-08-12T19:00:50.076Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
| Node SHA-256 (1K) | 333333 | 2 | 4 | 21 | 3 | 8.29 | 29.27 | 1000 | 3 |
| Node SHA-256 (10K) | 263158 | 2 | 4 | 20 | 4 | 7.92 | 43.23 | 10000 | 38 |
| Node SHA-512 (1K) | 333333 | 2 | 5 | 12 | 3 | 10.77 | 27.92 | 1000 | 3 |
| Node SHA-512 (10K) | 333333 | 2 | 5 | 16 | 3 | 10.67 | 34.79 | 10000 | 30 |
| Native scanPacket (1K) | 58824 | 13 | 34 | 68 | 17 | 10.33 | 24.74 | 1000 | 17 |
| Native scanPacket (10K) | 70922 | 12 | 29 | 57 | 14 | 7.15 | 26.6 | 10000 | 141 |
| Native scanBatch (1K) | 91 | 10288 | 10288 | 10288 | 10288 | 10.25 | 23.55 | 1 | 11 |
| Native scanBatch (10K) | 8 | 121541 | 121541 | 121541 | 121541 | 15 | 27.38 | 1 | 122 |
| Native scanBatch (100K) | 1 | 1161499 | 1161499 | 1161499 | 1161499 | 81.07 | 28.32 | 1 | 1161 |
| Native SHA-256 (1K) | 200 | 5233 | 5233 | 5233 | 5233 | 81.41 | 26.42 | 1 | 5 |
| Native SHA-256 (10K) | 18 | 55336 | 55336 | 55336 | 55336 | 84.75 | 26.8 | 1 | 55 |
| Native SHA-512 (1K) | 56 | 17389 | 17389 | 17389 | 17389 | 77.38 | 53.06 | 1 | 18 |
| Native SHA-512 (10K) | 12 | 83026 | 83026 | 83026 | 83026 | 80.78 | 25.16 | 1 | 83 |
| Native CRC-32 (1K) | 500 | 2709 | 2709 | 2709 | 2709 | 81.01 | 34.44 | 1 | 2 |
| Native CRC-32 (10K) | 38 | 26304 | 26304 | 26304 | 26304 | 83.23 | 25.96 | 1 | 26 |
| Burst Attack (5K scanPacket) | 294118 | 0 | 0 | 0 | 0 | 78 | 0 | 5000 | 17 |

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
