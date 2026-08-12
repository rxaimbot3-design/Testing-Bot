# Benchmark Documentation

## Running Benchmarks

### Prerequisites
- Node.js 20+
- Built C++ native engine
- Redis running (for cache benchmarks)

### Quick Benchmark
```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark
npm run benchmark -- --filter=cpp-engine
```

### Manual Benchmark Commands

#### C++ Engine Performance
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/cpp-engine/scan \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"packetId": 1, "riskWeight": 1.2}' \
  --repeat 1000 \
  --rate-limit 100
```

#### API Response Time
```bash
ab -n 1000 -c 50 -H "Authorization: Bearer <token>" http://localhost:3000/api/health
```

#### Security Event Processing
```bash
# Simulate 100 nukers drill
curl -X POST http://localhost:3000/api/bot/simulate-100-nukers \
  -H "Authorization: Bearer <token>"
```

## Expected Results

### C++ Engine
| Metric | Target | Typical |
|--------|--------|---------|
| Packet scan latency | < 1ms | 0.3-0.8ms |
| Throughput | > 10k ops/sec | 15-25k ops/sec |
| Memory usage | < 50MB | 20-40MB |

### API Performance
| Metric | Target | Typical |
|--------|--------|---------|
| Health check latency | < 10ms | 1-5ms |
| Auth verification | < 5ms | 1-3ms |
| Security scan | < 100ms | 20-80ms |
| AI chat response | < 2s | 0.5-1.5s |

### Dashboard
| Metric | Target | Typical |
|--------|--------|---------|
| Initial load | < 2s | 0.5-1.5s |
| Tab switch | < 200ms | 50-150ms |
| Event feed update | < 100ms | 20-80ms |

## Performance Characteristics

### Throughput
- **API**: 1000+ requests/second with rate limiting
- **Events**: 10,000+ events/second processing capacity
- **Discord Gateway**: 50+ shards supported

### Latency
- **p50**: < 50ms for most endpoints
- **p95**: < 200ms for standard operations
- **p99**: < 1000ms including AI operations

### Memory
- **Base**: ~200MB heap
- **Under load**: ~500MB heap
- **C++ engine**: ~30MB native memory

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

### 7. Caching Strategy
```
┌─────────────────┐     ┌─────────────────┐
│   Request       │────▶│   Redis Cache   │
│                 │     │   (TTL: 5min)   │
└─────────────────┘     └─────────────────┘
         │                       │
         │ Cache Hit            │ Cache Miss
         ▼                       ▼
   ┌─────────────┐     ┌─────────────────┐
   │   Return    │     │   Compute       │
   │   Cached    │     │   & Store       │
   └─────────────┘     └─────────────────┘
```

## Load Testing

### Artillery.io
```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
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
  ]
};

export default function() {
  const res = http.get('http://localhost:3000/api/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
}
```

```bash
k6 run load-test.js
```

## Profiling

### Node.js Profiling
```bash
node --prof server-build/server.cjs
node --prof-process isolate-*.log > processed.txt
```

### Memory Profiling
```bash
node --inspect server-build/server.cjs
# Connect Chrome DevTools to http://localhost:9229
```

### CPU Profiling
```bash
node --cpu-prof server-build/server.cjs
# Output: CPU profile in .nodejs/*.cpuprofile
```
