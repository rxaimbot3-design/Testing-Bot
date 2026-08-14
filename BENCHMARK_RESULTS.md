# Benchmark Results

**Important:** The distributable source ZIP does not include the compiled `security_engine.node` binary. The results below were generated on a separately compiled native build. In environments without the compiled binary, the engine falls back to the worker-thread or sync path, which has different performance characteristics.

Generated: 2026-08-13T08:10:00.000Z

Environment:
- Node.js: v22.22.3
- CPUs: 4 (x64)
- Platform: linux
- Engine Mode: native
- Benchmark method: 3 warmup runs + 10 measured runs per test

## Scope

These benchmarks measure **isolated native C++ security-engine throughput** under synthetic load. They do **not** represent end-to-end Discord bot throughput, which includes:
- Discord Gateway event ingestion
- discord.js message dispatch
- Event normalization and enrichment
- Security pipeline evaluation
- Discord API rate-limit handling
- Database/Redis I/O

> **Do not market these numbers as "bot protects X Discord events/sec."** They are native engine benchmarks only.

## Summary (10 measured runs, statistical summary)

| Test | Metric | Min | Max | Mean | Median | p95 | p99 |
|------|--------|-----|-----|------|--------|-----|-----|
| scanPacket 10K | Throughput/s | 1,428,571 | 2,500,000 | 1,835,714 | 1,666,667 | 2,500,000 | 2,500,000 |
| scanPacket 10K | Events/s | 1,428,571 | 2,500,000 | 1,835,714 | 1,666,667 | 2,500,000 | 2,500,000 |
| scanBatch 100K | Batch calls/s | 28 | 50 | 40 | 38 | 50 | 50 |
| scanBatch 100K | Events/s | 2,777,778 | 5,000,000 | 3,973,118 | 3,846,154 | 5,000,000 | 5,000,000 |
| SHA-256 10K | Batch calls/s | 34 | 91 | 67 | 77 | 91 | 91 |
| SHA-256 10K | Events/s | 344,828 | 909,091 | 669,728 | 769,231 | 909,091 | 909,091 |
| Burst 50K | Throughput/s | 2,173,913 | 3,125,000 | 2,792,295 | 2,941,176 | 3,125,000 | 3,125,000 |
| Burst 50K | Events/s | 2,173,913 | 3,125,000 | 2,792,295 | 2,941,176 | 3,125,000 | 3,125,000 |

## Per-Run Breakdown

### scanPacket 10K (10 runs of 10,000 events each)

| Run | Throughput/s | Events/s | p50 us | p95 us | p99 us | Avg us | Mem MB | CPU % | Duration ms |
|-----|-------------|----------|--------|--------|--------|--------|--------|-------|-------------|
| 1 | 1,666,667 | 1,666,667 | 0 | 1 | 1 | 0 | 8.82 | 23.01 | 6 |
| 2 | 1,428,571 | 1,428,571 | 0 | 1 | 3 | 1 | 9.18 | 31.35 | 7 |
| 3 | 1,428,571 | 1,428,571 | 0 | 1 | 2 | 1 | 7.57 | 50.59 | 7 |
| 4 | 2,000,000 | 2,000,000 | 0 | 1 | 1 | 0 | 8.09 | 24.71 | 5 |
| 5 | 2,000,000 | 2,000,000 | 0 | 1 | 1 | 0 | 8.69 | 24.89 | 5 |
| 6 | 2,500,000 | 2,500,000 | 0 | 1 | 1 | 0 | 8.92 | 36.98 | 4 |
| 7 | 1,666,667 | 1,666,667 | 0 | 1 | 1 | 0 | 9.69 | 23.40 | 6 |
| 8 | 2,000,000 | 2,000,000 | 0 | 1 | 1 | 0 | 10.49 | 27.17 | 5 |
| 9 | 2,000,000 | 2,000,000 | 0 | 1 | 1 | 0 | 10.98 | 27.52 | 5 |
| 10 | 1,666,667 | 1,666,667 | 0 | 1 | 1 | 0 | 11.41 | 23.91 | 6 |

### scanBatch 100K (10 runs of 100,000 events per batch)

| Run | Batch calls/s | Events/s | p50 us | p95 us | p99 us | Avg us | Mem MB | CPU % | Duration ms |
|-----|--------------|----------|--------|--------|--------|--------|--------|-------|-------------|
| 1 | 50 | 5,000,000 | 20,407 | 20,407 | 20,407 | 20,407 | 50.62 | 25.54 | 20 |
| 2 | 34 | 3,448,276 | 29,780 | 29,780 | 29,780 | 29,780 | 56.57 | 25.97 | 29 |
| 3 | 33 | 3,333,333 | 29,747 | 29,747 | 29,747 | 29,747 | 63.26 | 25.63 | 30 |
| 4 | 31 | 3,125,000 | 32,079 | 32,079 | 32,079 | 32,079 | 29.37 | 36.77 | 32 |
| 5 | 38 | 3,846,154 | 25,692 | 25,692 | 25,692 | 25,692 | 36.88 | 25.82 | 26 |
| 6 | 48 | 4,761,905 | 20,599 | 20,599 | 20,599 | 20,599 | 59.78 | 24.51 | 21 |
| 7 | 28 | 2,777,778 | 36,051 | 36,051 | 36,051 | 36,051 | 24.53 | 33.11 | 36 |
| 8 | 45 | 4,545,455 | 21,753 | 21,753 | 21,753 | 21,753 | 47.88 | 26.05 | 22 |
| 9 | 45 | 4,545,455 | 21,209 | 21,209 | 21,209 | 21,209 | 53.52 | 24.16 | 22 |
| 10 | 43 | 4,347,826 | 22,800 | 22,800 | 22,800 | 22,800 | 76.41 | 24.77 | 23 |

### Burst Attack 50K (10 runs of 50,000 events each)

| Run | Throughput/s | Events/s | p50 us | p95 us | p99 us | Avg us | Mem MB | CPU % | Duration ms |
|-----|-------------|----------|--------|--------|--------|--------|--------|-------|-------------|
| 1 | 3,125,000 | 3,125,000 | 0 | 0 | 0 | 0 | 28.34 | 25.35 | 16 |
| 2 | 2,777,778 | 2,777,778 | 0 | 0 | 1 | 0 | 31.63 | 25.66 | 18 |
| 3 | 2,500,000 | 2,500,000 | 0 | 0 | 1 | 0 | 17.76 | 25.30 | 20 |
| 4 | 2,173,913 | 2,173,913 | 0 | 0 | 1 | 0 | 25.72 | 25.11 | 23 |
| 5 | 2,272,727 | 2,272,727 | 0 | 0 | 1 | 0 | 30.59 | 23.85 | 22 |
| 6 | 3,125,000 | 3,125,000 | 0 | 0 | 0 | 0 | 35.43 | 25.59 | 16 |
| 7 | 2,941,176 | 2,941,176 | 0 | 0 | 0 | 0 | 38.65 | 25.43 | 17 |
| 8 | 3,125,000 | 3,125,000 | 0 | 0 | 0 | 0 | 39.75 | 25.18 | 16 |
| 9 | 2,941,176 | 2,941,176 | 0 | 0 | 0 | 0 | 41.56 | 24.71 | 17 |
| 10 | 2,941,176 | 2,941,176 | 0 | 0 | 1 | 0 | 27.39 | 26.26 | 17 |

## Key Findings

1. **scanPacket**: After warmup, stable throughput of ~1.4M-2.5M events/sec (single-threaded, native C++).
2. **scanBatch**: 100K-event batches process at ~2.8M-5.0M events/sec (30-50 batch calls/sec).
3. **SHA-256**: Batch hashing at ~350K-900K events/sec depending on batch size and JIT state.
4. **Burst**: Sustained 50K-event burst at ~2.2M-3.1M events/sec with stable memory (~25-40MB).
5. **JIT warmup**: First 3 runs show lower throughput; measured runs represent steady-state performance.

## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results show both batch invocation rate and total event throughput.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
- All benchmarks include 3 warmup runs before measurement to account for JIT optimization.
