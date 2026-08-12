# Benchmark Results

Generated: 2026-08-12T19:46:13.524Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
| Node SHA-256 (1K) | 333333 | 2 | 3 | 7 | 3 | 8.15 | 24.93 | 1000 | 3 |
| Node SHA-256 (10K) | 434783 | 1 | 3 | 6 | 2 | 8.34 | 42.67 | 10000 | 23 |
| Node SHA-512 (1K) | 333333 | 2 | 5 | 8 | 3 | 10.87 | 30.85 | 1000 | 3 |
| Node SHA-512 (10K) | 434783 | 1 | 4 | 6 | 2 | 10.78 | 38.19 | 10000 | 23 |
| Native scanPacket (1K) | 100000 | 8 | 14 | 24 | 10 | 10.06 | 25.12 | 1000 | 10 |
| Native scanPacket (10K) | 105263 | 9 | 13 | 21 | 9 | 10.72 | 26.86 | 10000 | 95 |
| Native scanBatch (1K) | 125 | 7918 | 7918 | 7918 | 7918 | 10.25 | 24.97 | 1 | 8 |
| Native scanBatch (10K) | 12 | 82296 | 82296 | 82296 | 82296 | 14.62 | 30.49 | 1 | 83 |
| Native scanBatch (100K) | 1 | 996551 | 996551 | 996551 | 996551 | 69.36 | 30.03 | 1 | 996 |
| Native SHA-256 (1K) | 250 | 4699 | 4699 | 4699 | 4699 | 69.71 | 29.67 | 1 | 4 |
| Native SHA-256 (10K) | 27 | 37762 | 37762 | 37762 | 37762 | 73.1 | 28.3 | 1 | 37 |
| Native SHA-512 (1K) | 167 | 6522 | 6522 | 6522 | 6522 | 73.49 | 40.74 | 1 | 6 |
| Native SHA-512 (10K) | 17 | 59630 | 59630 | 59630 | 59630 | 76.84 | 25.5 | 1 | 59 |
| Native CRC-32 (1K) | 500 | 2312 | 2312 | 2312 | 2312 | 77.07 | 29.48 | 1 | 2 |
| Native CRC-32 (10K) | 30 | 32933 | 32933 | 32933 | 32933 | 68.54 | 36.72 | 1 | 33 |
| Burst Attack (5K scanPacket) | 1250000 | 0 | 0 | 0 | 0 | 70 | 0 | 5000 | 4 |

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
