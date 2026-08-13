# Benchmark Documentation

## Running Benchmarks

### Prerequisites

- Node.js 20+
- Built C++ native engine (optional, falls back to worker/sync)
- Redis running (for cache benchmarks)

### Quick Benchmark

```bash
# Run built-in benchmarks
npm run benchmark
```

### Manual Benchmark Commands

#### C++ Engine Performance

```bash
# Native engine scan benchmark
for i in {1..1000}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:3000/api/cpp-engine/scan \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"packetId": 1, "riskWeight": 1.2}' | \
    jq '.result.latencyMicros'
done | awk '{sum+=$1; count++} END {print "Avg:", sum/count, "us"}'
```

#### API Response Time

```bash
# Health endpoint benchmark
ab -n 1000 -c 50 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health

# With curl timing
for i in {1..100}; do
  curl -o /dev/null -s -w "%{time_total}\n" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3000/api/health
done | awk '{sum+=$1; count++} END {print "Avg:", sum/count, "s"}'
```

#### Security Event Processing

```bash
# Simulate 100 nukers drill
curl -X POST http://localhost:3000/api/bot/simulate-100-nukers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### C++ Engine Batch Scan

```bash
# Batch scan benchmark
curl -X POST http://localhost:3000/api/cpp-engine/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packetId": 1, "riskWeight": 1.2, "batchSize": 1000}'
```

## Expected Results

### C++ Engine

| Metric | Target | Typical |
|--------|--------|---------|
| Single scan latency | < 1ms | 0.3-0.8ms |
| Batch throughput | > 100k events/sec | 100k-150k events/sec |
| Batch calls/sec | > 10 calls/sec | 10-20 calls/sec |
| Memory usage | < 50MB | 20-40MB |
| Hash latency (SHA-256) | < 1ms | 0.2-0.5ms |
| Hash latency (CRC-32) | < 0.5ms | 0.1-0.3ms |

### API Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Health check latency | < 10ms | 1-5ms |
| Auth verification | < 5ms | 1-3ms |
| Security scan | < 100ms | 20-80ms |
| AI chat response | < 2s | 0.5-1.5s |
| GitHub status | < 200ms | 50-150ms |

### Dashboard

| Metric | Target | Typical |
|--------|--------|---------|
| Initial load | < 2s | 0.5-1.5s |
| Tab switch | < 200ms | 50-150ms |
| Event feed update | < 100ms | 20-80ms |
| Analytics render | < 500ms | 100-300ms |

## Performance Characteristics

### Throughput
- **API**: 1000+ requests/second with rate limiting
- **Events**: 100,000+ events/second processing capacity (native C++ engine)
- **Discord Gateway**: 50+ shards supported
- **C++ Engine**: 100,000-150,000 scans/second (single-threaded, native)
- **C++ Batch**: 1-20 batch calls/second processing 1K-100K events each
- **C++ Batch Events**: 130K-500K events/second across batch sizes

### Latency

| Percentile | Target | Typical |
|-----------|--------|---------|
| p50 | < 50ms | 5-20ms |
| p95 | < 200ms | 20-100ms |
| p99 | < 1000ms | 50-500ms |

### Memory

| State | Heap | Native |
|-------|------|--------|
| Idle | ~200MB | ~30MB |
| Under load | ~500MB | ~40MB |
| Peak | ~1GB | ~50MB |

## Optimization Tips

### 1. Thread Pool Tuning

```env
UV_THREADPOOL_SIZE=128
```

### 2. Node.js Heap

```env
NODE_OPTIONS=--max-old-space-size=450
```

### 3. Redis Caching

- Enable for frequently accessed data
- TTL: 5 minutes for static data
- TTL: 30 seconds for dynamic data

### 4. Database Indexing

- Index on timestamp for audit logs
- Index on userId for user lookups
- Index on severity for filtered queries

### 5. Compression

- Enable gzip/brotli for API responses
- Use deflate for backup archives
- Compress static assets via Vite

### 6. Connection Pooling

- Reuse database connections
- Limit max connections to prevent exhaustion
- Monitor connection pool utilization

## Load Testing

### Artillery.io

```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: "Bearer $TOKEN"
scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
  - name: "Auth check"
    flow:
      - get:
          url: "/api/auth/session"
  - name: "Security stats"
    flow:
      - get:
          url: "/api/bot/security-status"
```

```bash
npm install -g artillery
artillery run artillery.yml
```

### k6

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'http_req_failed': ['rate<0.01']
  }
};

export default function() {
  const res = http.get('http://localhost:3000/api/health', {
    headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` }
  });
  check(res, {
    'status was 200': (r) => r.status == 200,
    'latency < 100ms': (r) => r.timings.duration < 100
  });
}
```

```bash
k6 run -e TOKEN=$TOKEN load-test.js
```

### wrk

```bash
wrk -t4 -c100 -d30s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health
```

## Profiling

### Node.js CPU Profiling

```bash
# Start with profiling
node --cpu-prof server-build/server.cjs

# Process profile
node --prof-process isolate-*.log > processed.txt
```

### Memory Profiling

```bash
# Start with inspector
node --inspect server-build/server.cjs

# Connect Chrome DevTools to http://localhost:9229
```

### Heap Snapshot

```bash
# Take heap snapshot via API
curl -X POST http://localhost:3000/api/debug/heap-snapshot \
  -H "Authorization: Bearer $TOKEN"
```

## Benchmark Results Template

```
=== Benchmark Run: 2026-08-13 ===
Environment: Node.js 22.x, 4 CPU, 8GB RAM

C++ Engine:
  - scanPacket throughput: 100,000-140,000 ops/sec
  - scanBatch (1K): ~167 batch calls/sec, ~166K events/sec
  - scanBatch (10K): ~14 batch calls/sec, ~135K events/sec
  - scanBatch (100K): ~1 batch call/sec, ~133K events/sec
  - Burst (50K): ~4,000-5,000 events/sec, ~230-350us avg latency
  - Memory: 25-90MB depending on batch size
  - SHA-256 batch: ~250K events/sec
  - SHA-512 batch: ~140K events/sec
  - CRC-32 batch: ~500K events/sec

API:
  - Health check (p50): 2ms
  - Health check (p95): 5ms
  - Auth check (p50): 1ms
  - Security scan (p50): 25ms

Dashboard:
  - Initial load: 0.8s
  - Tab switch: 80ms
```
