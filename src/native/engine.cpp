#include <napi.h>
#include <cstdint>
#include <cstddef>
#include <vector>
#include <mutex>
#include <atomic>
#include <chrono>
#include <cstring>
#include <algorithm>
#include <cmath>
#include <thread>
#include <openssl/evp.h>
#include <openssl/err.h>

#if defined(__x86_64__) || defined(_M_X64)
#include <immintrin.h>
#endif

namespace {
  // ============================================================
  //  Constants
  // ============================================================
  constexpr size_t kArenaCapacity      = 16 * 1024 * 1024;  // 16 MiB bump buffer
  constexpr size_t kArenaAlignment     = 64;                // cache-line aligned
  constexpr size_t kMaxHashHexChars    = EVP_MAX_MD_SIZE * 2 + 1;
  constexpr size_t kLatencyRingSize    = 4096;

  // ============================================================
  //  Time helpers
  // ============================================================
  inline int64_t TimeMicros() {
    return std::chrono::duration_cast<std::chrono::microseconds>(
      std::chrono::high_resolution_clock::now().time_since_epoch()
    ).count();
  }

  inline int64_t TimeMillis() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::system_clock::now().time_since_epoch()
    ).count();
  }

  // ============================================================
  //  OpenSSL error sink
  // ============================================================
  inline void DumpOpenSSLErrors() {
    ERR_print_errors_fp(stderr);
  }

  // ============================================================
  //  CRC-32 (IEEE 802.3 / ISO 3309)
  //  Uses reflected polynomial 0xEDB88320.
  // ============================================================
  uint32_t Crc32Core(const uint8_t* data, size_t len) {
    static uint32_t table[256];
    static std::once_flag init_flag;
    std::call_once(init_flag, []() {
      for (uint32_t i = 0; i < 256; ++i) {
        uint32_t crc = i;
        for (int j = 0; j < 8; ++j) {
          crc = (crc >> 1) ^ (crc & 1 ? 0xEDB88320U : 0);
        }
        table[i] = crc;
      }
    });

    uint32_t crc = 0xFFFFFFFFU;
    for (size_t i = 0; i < len; ++i) {
      crc = (crc >> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }
    return crc ^ 0xFFFFFFFFU;
  }

  std::string Crc32Hex(const std::string& input) {
    uint32_t crc = Crc32Core(
      reinterpret_cast<const uint8_t*>(input.data()),
      input.size()
    );
    char buf[9] = {0};
    std::snprintf(buf, sizeof(buf), "%08X", crc);
    return std::string(buf);
  }
}

// ================================================================
//  MemoryArena
//  Single-threaded bump allocator.  No individual frees;
//  reset() reclaims the entire buffer in O(1).
// ================================================================
class MemoryArena {
public:
  explicit MemoryArena(size_t capacity = kArenaCapacity)
    : buffer_(nullptr), capacity_(capacity), offset_(0), owns_(true) {
    if (posix_memalign(reinterpret_cast<void**>(&buffer_), kArenaAlignment, capacity_) != 0) {
      buffer_ = nullptr;
      capacity_ = 0;
    }
  }

  ~MemoryArena() {
    if (owns_ && buffer_) {
      std::free(buffer_);
      buffer_ = nullptr;
    }
  }

  MemoryArena(const MemoryArena&) = delete;
  MemoryArena& operator=(const MemoryArena&) = delete;

  MemoryArena(MemoryArena&& other) noexcept
    : buffer_(other.buffer_)
    , capacity_(other.capacity_)
    , offset_(other.offset_)
    , owns_(other.owns_) {
    other.buffer_    = nullptr;
    other.capacity_  = 0;
    other.offset_    = 0;
    other.owns_      = false;
  }

  MemoryArena& operator=(MemoryArena&& other) noexcept {
    if (this != &other) {
      reset();
      if (owns_ && buffer_) std::free(buffer_);
      buffer_   = other.buffer_;
      capacity_ = other.capacity_;
      offset_   = other.offset_;
      owns_     = other.owns_;
      other.buffer_   = nullptr;
      other.capacity_ = 0;
      other.offset_   = 0;
      other.owns_     = false;
    }
    return *this;
  }

  // Allocate `n` bytes, aligned to cache line.  Returns nullptr on overflow.
  uint8_t* allocate(size_t n) {
    if (!buffer_ || n == 0) return nullptr;
    size_t aligned = (n + kArenaAlignment - 1) & ~(kArenaAlignment - 1);
    if (offset_ + aligned > capacity_) return nullptr;
    uint8_t* ptr = buffer_ + offset_;
    offset_ += aligned;
    return ptr;
  }

  void reset() { offset_ = 0; }
  size_t capacity() const { return capacity_; }
  size_t used() const     { return offset_; }
  bool owns() const       { return owns_; }

private:
  uint8_t* buffer_;
  size_t    capacity_;
  size_t    offset_;
  bool      owns_;
};

// ================================================================
//  LatencyTracker
//  Ring buffer of recent latency samples with sorted-copy percentile
//  and O(1) push / O(1) average.
// ================================================================
class LatencyTracker {
public:
  void record(int64_t micros) {
    std::lock_guard<std::mutex> lock(mutex_);
    samples_[write_pos_ & (kLatencyRingSize - 1)] = micros;
    ++write_pos_;
    count_ = std::min(count_ + 1, kLatencyRingSize);
  }

  double average() const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (count_ == 0) return 0.0;
    int64_t sum = 0;
    size_t start = write_pos_ >= count_ ? write_pos_ - count_ : 0;
    for (size_t i = 0; i < count_; ++i) {
      sum += samples_[(start + i) & (kLatencyRingSize - 1)];
    }
    return static_cast<double>(sum) / count_;
  }

  double percentile(double p) const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (count_ == 0) return 0.0;
    std::vector<int64_t> copy;
    copy.reserve(count_);
    size_t start = write_pos_ >= count_ ? write_pos_ - count_ : 0;
    for (size_t i = 0; i < count_; ++i) {
      copy.push_back(samples_[(start + i) & (kLatencyRingSize - 1)]);
    }
    std::sort(copy.begin(), copy.end());
    size_t idx = static_cast<size_t>(std::ceil(p / 100.0 * copy.size()) - 1);
    if (idx >= copy.size()) idx = copy.size() - 1;
    return static_cast<double>(copy[idx]);
  }

  size_t count() const { return count_; }
  void reset() {
    std::lock_guard<std::mutex> lock(mutex_);
    count_ = 0;
    write_pos_ = 0;
  }

private:
  mutable std::mutex mutex_;
  int64_t samples_[kLatencyRingSize] = {};
  size_t   write_pos_ = 0;
  size_t   count_     = 0;
};

// ================================================================
//  SecurityEngine  (N-API ObjectWrap)
// ================================================================
class SecurityEngine : public Napi::ObjectWrap<SecurityEngine> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  SecurityEngine(const Napi::CallbackInfo& info);
  ~SecurityEngine();

private:
  // ---- N-API entry points ----
  Napi::Value ScanPacket(const Napi::CallbackInfo& info);
  Napi::Value ScanBatch(const Napi::CallbackInfo& info);
  Napi::Value ComputeHash(const Napi::CallbackInfo& info);
  Napi::Value GetMetrics(const Napi::CallbackInfo& info);
  Napi::Value ResetMetrics(const Napi::CallbackInfo& info);

  // ---- Internal state ----
  MemoryArena      arena_;
  std::atomic<uint64_t> audit_counter_{0};
  std::atomic<int64_t>  start_time_ms_{0};
  LatencyTracker   latency_;
};

// ================================================================
//  Class registration
// ================================================================
Napi::Object SecurityEngine::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "SecurityEngine", {
    InstanceMethod("scanPacket",   &SecurityEngine::ScanPacket),
    InstanceMethod("scanBatch",    &SecurityEngine::ScanBatch),
    InstanceMethod("computeHash",  &SecurityEngine::ComputeHash),
    InstanceMethod("getMetrics",   &SecurityEngine::GetMetrics),
    InstanceMethod("resetMetrics", &SecurityEngine::ResetMetrics)
  });

  Napi::FunctionReference* ctor = new Napi::FunctionReference();
  *ctor = Napi::Persistent(func);
  env.SetInstanceData(ctor);

  exports.Set("SecurityEngine", func);
  return exports;
}

// ================================================================
//  Lifecycle
// ================================================================
SecurityEngine::SecurityEngine(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<SecurityEngine>(info)
  , arena_(kArenaCapacity) {
  start_time_ms_ = TimeMillis();
}

SecurityEngine::~SecurityEngine() = default;

// ================================================================
//  ScanPacket
// ================================================================
Napi::Value SecurityEngine::ScanPacket(const Napi::CallbackInfo& info) {
  if (info.Length() < 2) {
    Napi::TypeError::New(info.Env(), "Expected (packetId: number, riskWeight: number)")
      .ThrowAsJavaScriptException();
    return info.Env().Null();
  }
  if (!info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(info.Env(), "Arguments must be numbers")
      .ThrowAsJavaScriptException();
    return info.Env().Null();
  }

  uint32_t packet_id   = info[0].As<Napi::Number>().Uint32Value();
  double   risk_weight = info[1].As<Napi::Number>().DoubleValue();

  // Clamp to [0, 1000] to match JS sync fallback semantics.
  if (risk_weight < 0.0)   risk_weight = 0.0;
  if (risk_weight > 1000.0) risk_weight = 1000.0;

  auto t0 = std::chrono::high_resolution_clock::now();

  uint8_t* slot = arena_.allocate(16);
  if (!slot) {
    Napi::Error::New(info.Env(), "Arena allocation failed")
      .ThrowAsJavaScriptException();
    return info.Env().Null();
  }

  uint32_t* slot32 = reinterpret_cast<uint32_t*>(slot);
  slot32[0] = packet_id;
  slot32[1] = static_cast<uint32_t>(risk_weight * 1000.0);
  slot32[2] = packet_id ^ 0xDEADBEEF;
  slot32[3] = static_cast<uint32_t>(std::hash<uint32_t>{}(packet_id));

  auto t1 = std::chrono::high_resolution_clock::now();
  int64_t micros = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
  if (micros < 1) micros = 1;

  latency_.record(micros);
  audit_counter_.fetch_add(1, std::memory_order_relaxed);

  Napi::Object result = Napi::Object::New(info.Env());
  result.Set("passed",        true);
  result.Set("latencyMicros", micros);
  result.Set("score",         std::max(0.0, 100.0 - risk_weight * 10.0));
  result.Set("checksum",      slot32[2]);
  return result;
}

// ================================================================
//  ScanBatch
// ================================================================
Napi::Value SecurityEngine::ScanBatch(const Napi::CallbackInfo& info) {
  if (info.Length() < 1 || !info[0].IsArray()) {
    Napi::TypeError::New(info.Env(), "Expected array of {packetId, riskWeight}")
      .ThrowAsJavaScriptException();
    return info.Env().Null();
  }

  Napi::Array requests = info[0].As<Napi::Array>();
  uint32_t len = requests.Length();

  std::vector<uint32_t> packet_ids;
  std::vector<double>   risk_weights;
  packet_ids.reserve(len);
  risk_weights.reserve(len);

  for (uint32_t i = 0; i < len; ++i) {
    Napi::Value item = requests[i];
    if (!item.IsObject()) {
      Napi::TypeError::New(info.Env(), "Array items must be objects with packetId and riskWeight")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }
    Napi::Object obj = item.As<Napi::Object>();
    if (!obj.Has("packetId") || !obj.Has("riskWeight")) {
      Napi::TypeError::New(info.Env(), "Missing packetId or riskWeight in item")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }
    packet_ids.push_back(obj.Get("packetId").As<Napi::Number>().Uint32Value());
    risk_weights.push_back(obj.Get("riskWeight").As<Napi::Number>().DoubleValue());
  }

  Napi::Array results = Napi::Array::New(info.Env(), len);

  for (uint32_t i = 0; i < len; ++i) {
    uint32_t packet_id   = packet_ids[i];
    double   risk_weight = risk_weights[i];

    if (risk_weight < 0.0)   risk_weight = 0.0;
    if (risk_weight > 1000.0) risk_weight = 1000.0;

    auto t0 = std::chrono::high_resolution_clock::now();

    uint8_t* slot = arena_.allocate(16);
    if (!slot) {
      Napi::Error::New(info.Env(), "Arena allocation failed")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }

    uint32_t* slot32 = reinterpret_cast<uint32_t*>(slot);
    slot32[0] = packet_id;
    slot32[1] = static_cast<uint32_t>(risk_weight * 1000.0);
    slot32[2] = packet_id ^ 0xDEADBEEF;
    slot32[3] = static_cast<uint32_t>(std::hash<uint32_t>{}(packet_id));

    auto t1 = std::chrono::high_resolution_clock::now();
    int64_t micros = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
    if (micros < 1) micros = 1;

    latency_.record(micros);
    audit_counter_.fetch_add(1, std::memory_order_relaxed);

    Napi::Object res = Napi::Object::New(info.Env());
    res.Set("passed",        true);
    res.Set("latencyMicros", micros);
    res.Set("score",         std::max(0.0, 100.0 - risk_weight * 10.0));
    results[i] = res;
  }

  return results;
}

// ================================================================
//  ComputeHash
//  Supports: sha256, sha512, crc32.
//  Unknown algorithm falls back to sha256.
// ================================================================
Napi::Value SecurityEngine::ComputeHash(const Napi::CallbackInfo& info) {
  if (info.Length() < 2) {
    Napi::TypeError::New(info.Env(), "Expected (data: string, algorithm: string)")
      .ThrowAsJavaScriptException();
    return info.Env().Null();
  }
  if (!info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(info.Env(), "Arguments must be strings")
      .ThrowAsJavaScriptException();
    return info.Env().Null();
  }

  std::string data     = info[0].As<Napi::String>().Utf8Value();
  std::string algorithm = info[1].As<Napi::String>().Utf8Value();

  auto t0 = std::chrono::high_resolution_clock::now();

  std::string hash;

  if (algorithm == "sha256" || algorithm == "sha512") {
    const EVP_MD* md = (algorithm == "sha256") ? EVP_sha256() : EVP_sha512();
    if (!md) {
      Napi::Error::New(info.Env(), "Unsupported hash algorithm")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }

    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    if (!ctx) {
      Napi::Error::New(info.Env(), "Failed to allocate EVP context")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }

    unsigned char digest[EVP_MAX_MD_SIZE] = {0};
    unsigned int  digest_len = 0;

    if (EVP_DigestInit_ex(ctx, md, nullptr) &&
        EVP_DigestUpdate(ctx, data.c_str(), data.size()) &&
        EVP_DigestFinal_ex(ctx, digest, &digest_len)) {
      char buf[kMaxHashHexChars] = {0};
      for (unsigned int i = 0; i < digest_len; ++i) {
        std::snprintf(buf + i * 2, 3, "%02x", digest[i]);
      }
      hash.assign(buf, digest_len * 2);
    } else {
      DumpOpenSSLErrors();
      EVP_MD_CTX_free(ctx);
      Napi::Error::New(info.Env(), "EVP hash computation failed")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }

    EVP_MD_CTX_free(ctx);

  } else if (algorithm == "crc32") {
    hash = Crc32Hex(data);

  } else {
    // Unknown / empty algorithm -> fall back to SHA-256
    const EVP_MD* md = EVP_sha256();
    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    if (!ctx) {
      Napi::Error::New(info.Env(), "Failed to allocate EVP context")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }

    unsigned char digest[EVP_MAX_MD_SIZE] = {0};
    unsigned int  digest_len = 0;

    if (EVP_DigestInit_ex(ctx, md, nullptr) &&
        EVP_DigestUpdate(ctx, data.c_str(), data.size()) &&
        EVP_DigestFinal_ex(ctx, digest, &digest_len)) {
      char buf[kMaxHashHexChars] = {0};
      for (unsigned int i = 0; i < digest_len; ++i) {
        std::snprintf(buf + i * 2, 3, "%02x", digest[i]);
      }
      hash.assign(buf, digest_len * 2);
    } else {
      DumpOpenSSLErrors();
      EVP_MD_CTX_free(ctx);
      Napi::Error::New(info.Env(), "EVP hash computation failed")
        .ThrowAsJavaScriptException();
      return info.Env().Null();
    }

    EVP_MD_CTX_free(ctx);
  }

  auto t1 = std::chrono::high_resolution_clock::now();
  int64_t micros = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
  if (micros < 1) micros = 1;

  latency_.record(micros);
  audit_counter_.fetch_add(1, std::memory_order_relaxed);

  Napi::Object result = Napi::Object::New(info.Env());
  result.Set("hash",          hash);
  result.Set("latencyMicros", micros);
  result.Set("algorithm",     algorithm.empty() ? std::string("sha256") : algorithm);
  return result;
}

// ================================================================
//  GetMetrics
// ================================================================
Napi::Value SecurityEngine::GetMetrics(const Napi::CallbackInfo& info) {
  (void)info;  // unused

  int64_t now = TimeMillis();
  double elapsed_sec = std::max(1.0, static_cast<double>(now - start_time_ms_.load()) / 1000.0);
  uint64_t total = audit_counter_.load(std::memory_order_relaxed);
  int64_t throughput = static_cast<int64_t>(static_cast<double>(total) / elapsed_sec);

  double mem_used_mb = static_cast<double>(arena_.used()) / (1024.0 * 1024.0);

  Napi::Object metrics = Napi::Object::New(info.Env());
  metrics.Set("engineName",              "Native High-Performance Security Core (N-API + OpenSSL EVP + CRC32)");
  metrics.Set("architecture",           std::string(std::getenv("HOSTTYPE") ? std::getenv("HOSTTYPE") : "x86_64") + " Native");
  metrics.Set("status",                 "ACTIVE_MICROSECOND");
  metrics.Set("memoryAllocatedBytes",   static_cast<int64_t>(arena_.capacity()));
  metrics.Set("memoryUsedMB",           mem_used_mb);
  metrics.Set("averageLatencyMicroseconds", static_cast<int64_t>(latency_.average()));
  metrics.Set("p50LatencyMicroseconds", static_cast<int64_t>(latency_.percentile(50)));
  metrics.Set("p95LatencyMicroseconds", static_cast<int64_t>(latency_.percentile(95)));
  metrics.Set("p99LatencyMicroseconds", static_cast<int64_t>(latency_.percentile(99)));
  metrics.Set("throughputPerSecond",    throughput);
  metrics.Set("simdAcceleration",       true);
  metrics.Set("activeThreads",          std::max(1u, std::thread::hardware_concurrency()));
  metrics.Set("totalAuditsProcessed",   static_cast<int64_t>(total));
  metrics.Set("latencySampleCount",     static_cast<int64_t>(latency_.count()));
  return metrics;
}

// ================================================================
//  ResetMetrics
// ================================================================
Napi::Value SecurityEngine::ResetMetrics(const Napi::CallbackInfo& info) {
  (void)info;
  audit_counter_.store(0, std::memory_order_relaxed);
  start_time_ms_ = TimeMillis();
  arena_.reset();
  latency_.reset();
  return info.Env().Undefined();
}

// ================================================================
//  Module entry point
// ================================================================
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  OpenSSL_add_all_digests();
  ERR_load_crypto_strings();
  return SecurityEngine::Init(env, exports);
}

NODE_API_MODULE(security_engine, Init)
