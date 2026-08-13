# C++ Engine Documentation

## Overview

The C++ Native Engine (`security_engine`) provides high-performance security operations through Node-API (N-API). It is compiled as a native addon and loaded by `src/CppEngine.ts`.

**Key Features:**
- Microsecond-precision packet scanning
- OpenSSL EVP cryptographic hash computation (SHA-256, SHA-512, CRC-32 fallback)
- Lock-free latency tracking with percentile calculation
- Cache-line-aligned arena allocator for zero-fragmentation memory management

## Build System

### Prerequisites
- Node.js 20+ with node-addon-api
- C++17 compiler (GCC 9+, Clang 10+, MSVC 2019+)
- OpenSSL 1.1.1+ development headers
- Python 3.8+ (for node-gyp)

### Building

```bash
# Install dependencies
npm ci

# Build native addon
npm run build:native

# Output: build/Release/security_engine.node
```

### binding.gyp

```python
{
  "targets": [
    {
      "target_name": "security_engine",
      "sources": [ "src/native/engine.cpp" ],
      "include_dirs": [ "<!(node -e \"require('node-addon-api').include\")" ],
      "dependencies": [ "<!(node -e \"require('node-addon-api').gyp\")" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='linux'", {
          "libraries": [ "-lssl", "-lcrypto" ]
        }]
      ]
    }
  ]
}
```

## Classes

### SecurityEngine (N-API ObjectWrap)

The main exported class. Wraps native C++ functionality for JavaScript consumption.

#### Constructor
```cpp
SecurityEngine(const Napi::CallbackInfo& info)
```
Initializes the engine with:
- 16 MiB `MemoryArena` (cache-line aligned)
- `LatencyTracker` with 4096-sample ring buffer
- Atomic counters for audit tracking

#### Methods

##### scanPacket(packetId: number, riskWeight: number): Object
Scans a single security packet.

**Parameters:**
- `packetId` (uint32): Unique packet identifier
- `riskWeight` (double): Risk weight (0.0 - 1000.0)

**Returns:**
```json
{
  "passed": true,
  "latencyMicros": 0.5,
  "score": 88.0,
  "checksum": 3735928559
}
```

**Implementation:**
1. Allocates 16 bytes from arena (cache-line aligned)
2. Writes packet metadata to arena slot
3. Computes XOR checksum (`packetId ^ 0xDEADBEEF`)
4. Records latency via `LatencyTracker`
5. Increments atomic audit counter

##### scanBatch(requests: Array<{packetId, riskWeight}>): Array
Scans multiple packets in a batch.

**Parameters:**
- Array of objects with `packetId` and `riskWeight`

**Returns:**
- Array of result objects

##### computeHash(data: string, algorithm: string): Object
Computes cryptographic hash.

**Parameters:**
- `data` (string): Input data
- `algorithm` (string): "sha256", "sha512", or "crc32"

**Returns:**
```json
{
  "hash": "a1b2c3...",
  "latencyMicros": 0.3,
  "algorithm": "sha256"
}
```

**Implementation:**
- SHA-256/SHA-512: OpenSSL EVP interface
- CRC-32: Custom reflected polynomial (0xEDB88320)
- Unknown algorithm falls back to SHA-256

##### getMetrics(): Object
Returns current engine metrics.

**Returns:**
```json
{
  "engineName": "Native High-Performance Security Core...",
  "architecture": "x86_64 Native",
  "status": "ACTIVE_MICROSECOND",
  "memoryAllocatedBytes": 16777216,
  "memoryUsedMB": 2.45,
  "averageLatencyMicroseconds": 0.5,
  "p50LatencyMicroseconds": 0.4,
  "p95LatencyMicroseconds": 0.8,
  "p99LatencyMicroseconds": 1.2,
  "throughputPerSecond": 25000,
  "simdAcceleration": false,
  "activeThreads": 4,
  "totalAuditsProcessed": 150000,
  "latencySampleCount": 150000
}
```

##### resetMetrics(): void
Resets all metrics and clears the arena.

**Effects:**
- `audit_counter_` → 0
- `start_time_ms_` → current time
- `arena_.reset()` → O(1) buffer reset
- `latency_.reset()` → Clear ring buffer

### MemoryArena

A bump-pointer allocator with cache-line alignment.

#### Methods

##### allocate(n: size_t): uint8_t*
Allocates `n` bytes, aligned to 64-byte cache lines.

**Returns:** Pointer to allocated memory, or `nullptr` on overflow.

##### reset(): void
Resets the allocation offset to 0 (O(1) operation).

##### capacity(): size_t
Returns total capacity (16 MiB).

##### used(): size_t
Returns current used bytes.

### LatencyTracker

Thread-safe ring buffer for latency samples with sorted-copy percentile calculation.

#### Methods

##### record(micros: int64_t): void
Records a latency sample.

##### average(): double
Returns arithmetic mean of all samples.

##### percentile(p: double): double
Returns the p-th percentile (0-100).

**Implementation:**
1. Copies ring buffer to vector
2. Sorts copy (O(n log n))
3. Returns value at `ceil(p/100 * size) - 1`

##### count(): size_t
Returns number of recorded samples.

##### reset(): void
Clears all samples.

## Memory Model

### Arena Allocation

```
┌─────────────────────────────────────────────────────────────┐
│  MemoryArena (16 MiB)                                       │
│  ┌─────────┬─────────┬─────────┬─────────┬───────────────┐  │
│  │ Slot 0  │ Slot 1  │ Slot 2  │ Slot 3  │ ...           │  │
│  │ (16 B)  │ (16 B)  │ (16 B)  │ (16 B)  │              │  │
│  └─────────┴─────────┴─────────┴─────────┴───────────────┘  │
│  ▲ offset_ advances linearly, never frees individual slots   │
└─────────────────────────────────────────────────────────────┘
```

**Properties:**
- Zero fragmentation
- O(1) allocation
- O(1) bulk reset
- Cache-line aligned (64 bytes)
- Thread-unsafe (single-threaded per engine instance)

### Atomic Operations

```cpp
std::atomic<uint64_t> audit_counter_{0};
std::atomic<int64_t>  start_time_ms_{0};
```

- `audit_counter_`: Relaxed memory order for throughput counting
- `start_time_ms_`: Used for elapsed time calculation

## Crypto Implementation

### CRC-32 (IEEE 802.3)

```cpp
uint32_t Crc32Core(const uint8_t* data, size_t len);
```

- **Polynomial**: 0xEDB88320 (reflected)
- **Initial value**: 0xFFFFFFFF
- **Final XOR**: 0xFFFFFFFF
- **Table**: Static 256-entry lookup table (initialized once via `std::call_once`)

### SHA-256 / SHA-512

Uses OpenSSL EVP interface:
```cpp
EVP_DigestInit_ex(ctx, md, nullptr);
EVP_DigestUpdate(ctx, data.c_str(), data.size());
EVP_DigestFinal_ex(ctx, digest, &digest_len);
```

## Detection Rules

### Packet Scoring

```cpp
score = max(0.0, 100.0 - riskWeight * 10.0);
```

| riskWeight | Score | Interpretation |
|-----------|-------|----------------|
| 0.0 | 100 | Perfectly safe |
| 5.0 | 50 | Moderate risk |
| 10.0 | 0 | Maximum risk |
| > 10.0 | 0 | Clamped to 0 |

### Checksum Validation

```cpp
slot32[2] = packet_id ^ 0xDEADBEEF;
slot32[3] = std::hash<uint32_t>{}(packet_id);
```

## Metrics Collection

### Throughput Calculation

```cpp
double elapsed_sec = max(1.0, (now - start_time_ms_) / 1000.0);
int64_t throughput = total / elapsed_sec;
```

### Percentile Calculation

```cpp
size_t idx = ceil(p / 100.0 * copy.size()) - 1;
return copy[idx];
```

### Memory Tracking

```cpp
double mem_used_mb = arena_.used() / (1024.0 * 1024.0);
```

## TypeScript Integration

### CppEngine.ts Architecture

```typescript
// Priority-based mode selection
if (nativeInstance) {
  engineMode = "native";
} else if (workerReady) {
  engineMode = "worker";
} else {
  engineMode = "sync";
}
```

### Fallback Strategy

| Primary | Fallback | Trigger |
|---------|----------|---------|
| Native C++ | Worker Thread | Module load failure |
| Worker Thread | Sync | Worker crash/timeout |
| Sync | Sync | Always available |

### Performance Targets

| Metric | Native | Worker | Sync |
|--------|--------|--------|------|
| Scan latency | < 1ms | 1-5ms | 5-20ms |
| Hash latency | < 1ms | 1-3ms | 3-10ms |
| Throughput | > 20k ops/s | 5-15k ops/s | 1-5k ops/s |

## Decision Engine

The native engine implements a deterministic PASS/FLAG/BLOCK decision layer:
- `score < 25.0` → `PASS`
- `25.0 ≤ score < 50.0` → `FLAG`
- `score ≥ 50.0` → `BLOCK`

Risk scoring blends rule-based detection with configurable `riskWeight` amplification.

## Thread Safety

- `SecurityEngine` instances are **not** thread-safe
- One instance per thread recommended
- `LatencyTracker` uses `std::mutex` for thread-safe access
- Atomic counters use relaxed memory ordering for performance

## Error Handling

### N-API Exceptions

```cpp
Napi::TypeError::New(env, "message").ThrowAsJavaScriptException();
Napi::Error::New(env, "message").ThrowAsJavaScriptException();
```

### OpenSSL Error Handling

```cpp
inline void DumpOpenSSLErrors() {
  ERR_print_errors_fp(stderr);
}
```

## Module Registration

```cpp
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  OpenSSL_add_all_digests();
  ERR_load_crypto_strings();
  return SecurityEngine::Init(env, exports);
}

NODE_API_MODULE(security_engine, Init)
```

## Testing

See `tests/cpp-engine.test.ts` for unit tests covering:
- Native module loading fallback
- Worker thread fallback
- Sync fallback
- Metrics reporting
- Batch operations
- Hash computation
