# Benchmark Results

## Important Scope Clarification

**All benchmarks below measure the isolated native C++ security engine only.**
These numbers do NOT represent end-to-end Discord bot throughput.

End-to-end throughput is limited by:
- Discord Gateway intents (~120 events/sec per shard)
- Network I/O latency
- JavaScript/TypeScript event processing overhead
- Database/Redis round-trip times

## Native C++ Engine Benchmarks

Tested on: Node v20.20.2, Linux x64, Node v22.22.3 (worker thread fallback)

| Benchmark | Events/sec | Notes |
|-----------|-----------|-------|
| `scanPacket` | ~1.4M – 2.5M | Single packet security scan |
| `scanBatch` | ~2.8M – 5.0M | Batch of 1000 packets |
| `Burst` | ~2.2M – 3.1M | Burst mode with concurrent requests |

## Worker Thread Performance

| Test | Result |
|------|--------|
| Sustained load (30s) | 12,583,000 events processed |
| Events/sec (sustained) | ~419,419 events/sec |
| Memory growth (30s) | 5.59 MB |
| Memory growth (50 cycles) | 0.28 – 1.32 MB (no leaks) |

## Production Scale Estimates

Based on observed engine performance and Discord API limits:

| Metric | Estimate | Notes |
|--------|----------|-------|
| Max guilds per instance | 50–100 | Limited by event processing queue depth |
| Max events/sec per guild | ~100–500 | Discord gateway sends ~120 events/sec per shard |
| Bot instances needed for 10K guilds | 100–200 | Horizontal scaling via multiple bot instances |
| Memory per 100 guilds | ~200–400 MB | Depends on event history retention |

## Known Limitations

1. **In-memory state**: SecurityFeatures.ts uses in-memory Maps that grow unbounded in production. For 500+ guilds, persistent storage (Redis/DB) is recommended.

2. **File I/O per action**: `admin_audit.json` and `admin_sessions.json` are written on every action/login. This creates I/O bottlenecks at high scale.

3. **Discord Gateway limits**: Discord sends ~120 events/sec per shard. The C++ engine can process millions of events/sec, but the actual throughput is capped by Discord's API.

4. **Single-instance limits**: A single bot instance is suitable for 50–100 guilds. For enterprise deployments, use multiple instances with shared Redis state.

## How to Reproduce

```bash
# Install dependencies
npm install --no-audit --no-fund --ignore-scripts

# Run benchmarks
npm run benchmark

# Run sustained load test
npx vitest run tests/sustained-load.test.ts

# Run stress tests
npx vitest run tests/stress.test.ts
```
