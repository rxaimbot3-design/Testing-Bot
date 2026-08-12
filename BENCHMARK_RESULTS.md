# Benchmark Results

Generated: 2026-08-12T17:47:27.327Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
| Node SHA-256 (1K) | 200000 | 3 | 6 | 31 | 4 | 8.29 | 24.65 | 1000 | 5 |
| Node SHA-256 (10K) | 232558 | 1 | 3 | 19 | 4 | 7.78 | 37.65 | 10000 | 43 |
| Node SHA-512 (1K) | 250000 | 2 | 7 | 37 | 4 | 10.54 | 29.92 | 1000 | 4 |
| Node SHA-512 (10K) | 322581 | 2 | 5 | 20 | 3 | 10.32 | 34.83 | 10000 | 31 |
| Native scanPacket (1K) | 333333 | 2 | 3 | 12 | 3 | 9.38 | 25.72 | 1000 | 3 |
| Native scanPacket (10K) | 500000 | 1 | 2 | 11 | 2 | 7.78 | 30.18 | 10000 | 20 |
| Native scanBatch (1K) | 500 | 1983 | 1983 | 1983 | 1983 | 9.39 | 25.46 | 1 | 2 |
| Native scanBatch (10K) | 42 | 23483 | 23483 | 23483 | 23483 | 10.84 | 27.35 | 1 | 24 |
| Native SHA-256 (1K) | 111 | 8479 | 8479 | 8479 | 8479 | 7.4 | 31.58 | 1 | 9 |
| Native SHA-512 (1K) | 111 | 9022 | 9022 | 9022 | 9022 | 7.8 | 25.33 | 1 | 9 |
| Native CRC-32 (1K) | 333 | 3742 | 3742 | 3742 | 3742 | 8.08 | 31.61 | 1 | 3 |
| Burst Attack (5K scanPacket) | 500000 | 0 | 0 | 0 | 0 | 9 | 0 | 5000 | 10 |

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
