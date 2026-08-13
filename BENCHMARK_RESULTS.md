# Benchmark Results

Generated: 2026-08-13T07:57:50.102Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
| Node SHA-256 (1K) | 500000 | 2 | 3 | 12 | 2 | 8.2 | 32.17 | 1000 | 2 |
| Node SHA-256 (10K) | 434783 | 2 | 3 | 8 | 2 | 8.39 | 42.15 | 10000 | 23 |
| Node SHA-512 (1K) | 500000 | 1 | 4 | 5 | 2 | 10.83 | 32.21 | 1000 | 2 |
| Node SHA-512 (10K) | 526316 | 1 | 3 | 6 | 2 | 10.62 | 30.92 | 10000 | 19 |
| Native scanPacket (1K) | 100000 | 7 | 14 | 40 | 10 | 9.02 | 24.73 | 1000 | 10 |
| Native scanPacket (10K) | 666667 | 1 | 7 | 9 | 1 | 10.1 | 57.18 | 10000 | 15 |
| Native scanBatch (1K) | 1000 | 1209 | 1209 | 1209 | 1209 | 7.3 | 45.75 | 1 | 1 |
| Native scanBatch (10K) | 200 | 4618 | 4618 | 4618 | 4618 | 8.57 | 42.23 | 1 | 5 |
| Native scanBatch (100K) | 23 | 43767 | 43767 | 43767 | 43767 | 23.8 | 34.19 | 1 | 44 |
| Native SHA-256 (1K) | 250 | 3418 | 3418 | 3418 | 3418 | 24.46 | 30.02 | 1 | 4 |
| Native SHA-256 (10K) | 53 | 19367 | 19367 | 19367 | 19367 | 29.51 | 44.39 | 1 | 19 |
| Native SHA-512 (1K) | 333 | 2665 | 2665 | 2665 | 2665 | 30.13 | 22.3 | 1 | 3 |
| Native SHA-512 (10K) | 34 | 28339 | 28339 | 28339 | 28339 | 26.9 | 33.18 | 1 | 29 |
| Native CRC-32 (1K) | 111 | 9015 | 9015 | 9015 | 9015 | 27.2 | 39.81 | 1 | 9 |
| Native CRC-32 (10K) | 26 | 38969 | 38969 | 38969 | 38969 | 29.89 | 25.5 | 1 | 39 |
| Burst Attack (50K scanPacket) | 2525 | 396 | 475 | 594 | 396 | 25 | 0 | 50000 | 19804 |

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
