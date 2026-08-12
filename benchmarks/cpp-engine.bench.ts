import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { CppNativeEngine } from "../src/CppEngine.js";

const __filename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : process.argv[1] || ".";
const __dirname = path.dirname(__filename);

// ================================================================
//  Benchmark result schema
// ================================================================
interface BenchmarkResult {
  test: string;
  throughputPerSec: number;
  p50Micros: number;
  p95Micros: number;
  p99Micros: number;
  avgMicros: number;
  memoryPeakMB: number;
  cpuAvgPct: number;
  cpuMaxPct: number;
  totalEvents: number;
  durationMs: number;
}

// ================================================================
//  Statistical helpers
// ================================================================
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ================================================================
//  Core benchmark runner
// ================================================================
async function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  events: number
): Promise<BenchmarkResult> {
  const memBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const start = Date.now();

  const latencies: number[] = [];
  const totalEvents = Math.max(1, events);

  for (let i = 0; i < totalEvents; i++) {
    const t0 = process.hrtime.bigint();
    await fn();
    const t1 = process.hrtime.bigint();
    latencies.push(Number(t1 - t0) / 1000);
  }

  const end = Date.now();
  const memAfter = process.memoryUsage();
  const cpuAfter = process.cpuUsage(cpuBefore);
  const durationMs = end - start;
  const throughput = totalEvents / (durationMs / 1000);

  const cpuUserMs = cpuAfter.user / 1000;
  const cpuSystemMs = cpuAfter.system / 1000;
  const totalCpuMs = cpuUserMs + cpuSystemMs;
  const cpuAvgPct = durationMs > 0
    ? (totalCpuMs / (durationMs * os.cpus().length)) * 100
    : 0;

  return {
    test: name,
    throughputPerSec: Math.round(throughput),
    p50Micros: Math.round(percentile(latencies, 50)),
    p95Micros: Math.round(percentile(latencies, 95)),
    p99Micros: Math.round(percentile(latencies, 99)),
    avgMicros: Math.round(average(latencies)),
    memoryPeakMB: Math.round((memAfter.heapUsed / 1024 / 1024) * 100) / 100,
    cpuAvgPct: Math.round(cpuAvgPct * 100) / 100,
    cpuMaxPct: Math.round(cpuAvgPct * 100) / 100,
    totalEvents,
    durationMs,
  };
}

// ================================================================
//  Output formatting
// ================================================================
function printTable(results: BenchmarkResult[]) {
  console.log("\n" + "=".repeat(120));
  console.log(
    `${"Test".padEnd(28)} | Throughput/s | p50 us | p95 us | p99 us | Avg us | Mem MB | CPU % | Events | Duration ms`
  );
  console.log("-".repeat(120));
  for (const r of results) {
    console.log(
      `${r.test.padEnd(28)} | ${String(r.throughputPerSec).padStart(12)} | ${String(r.p50Micros).padStart(7)} | ${String(r.p95Micros).padStart(7)} | ${String(r.p99Micros).padStart(7)} | ${String(r.avgMicros).padStart(6)} | ${String(r.memoryPeakMB).padStart(6)} | ${String(r.cpuAvgPct).padStart(5)} | ${String(r.totalEvents).padStart(7)} | ${String(r.durationMs).padStart(11)}`
    );
  }
  console.log("=".repeat(120) + "\n");
}

// ================================================================
//  Main benchmark suite
// ================================================================
async function main() {
  console.log("🔬 [BENCHMARK] C++ Native Engine + Node.js Crypto Benchmark Suite\n");

  // Initialize native engine (falls back to sync if native is unavailable)
  await CppNativeEngine.initEngine();
  const engineMode = (CppNativeEngine as any).engineMode || "unknown";
  console.log(`⚡ [BENCHMARK] Engine mode: ${engineMode}\n`);

  const results: BenchmarkResult[] = [];
  const cpuCount = os.cpus().length;
  const testData = "benchmark_payload_" + "x".repeat(256);

  // ----------------------------------------------------------
  // 1. Node.js Crypto baselines (OpenSSL-backed)
  // ----------------------------------------------------------
  const hash256 = (data: string) => createHash("sha256").update(data).digest("hex");
  const hash512 = (data: string) => createHash("sha512").update(data).digest("hex");

  results.push(await runBenchmark("Node SHA-256 (1K)", async () => { hash256(testData); }, 1000));
  results.push(await runBenchmark("Node SHA-256 (10K)", async () => { hash256(testData); }, 10000));
  results.push(await runBenchmark("Node SHA-512 (1K)", async () => { hash512(testData); }, 1000));
  results.push(await runBenchmark("Node SHA-512 (10K)", async () => { hash512(testData); }, 10000));

  // ----------------------------------------------------------
  // 2. Native C++ scanPacket
  // ----------------------------------------------------------
  results.push(await runBenchmark("Native scanPacket (1K)", async () => {
    CppNativeEngine.scanSecurityPacket(Math.floor(Math.random() * 10000), 1.2);
  }, 1000));

  results.push(await runBenchmark("Native scanPacket (10K)", async () => {
    CppNativeEngine.scanSecurityPacket(Math.floor(Math.random() * 10000), 1.2);
  }, 10000));

  // ----------------------------------------------------------
  // 3. Native C++ scanBatch
  // ----------------------------------------------------------
  const buildBatch = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ packetId: i, riskWeight: Math.random() * 5 }));

  results.push(await runBenchmark("Native scanBatch (1K)", async () => {
    await CppNativeEngine.batchScanPackets(buildBatch(1000));
  }, 1));  // 1 iteration of 1K batch

  results.push(await runBenchmark("Native scanBatch (10K)", async () => {
    await CppNativeEngine.batchScanPackets(buildBatch(10000));
  }, 1));

  // ----------------------------------------------------------
  // 4. Native C++ computeHash (sha256, sha512, crc32)
  // ----------------------------------------------------------
  results.push(await runBenchmark("Native SHA-256 (1K)", async () => {
    await CppNativeEngine.batchComputeHashes(
      Array.from({ length: 1000 }, () => ({ data: testData, algorithm: "sha256" as const }))
    );
  }, 1));

  results.push(await runBenchmark("Native SHA-512 (1K)", async () => {
    await CppNativeEngine.batchComputeHashes(
      Array.from({ length: 1000 }, () => ({ data: testData, algorithm: "sha512" as const }))
    );
  }, 1));

  results.push(await runBenchmark("Native CRC-32 (1K)", async () => {
    await CppNativeEngine.batchComputeHashes(
      Array.from({ length: 1000 }, () => ({ data: testData, algorithm: "crc32" as const }))
    );
  }, 1));

  // ----------------------------------------------------------
  // 5. Burst attack simulation
  // ----------------------------------------------------------
  const burstEvents = 5000;
  const burstStart = Date.now();
  for (let i = 0; i < burstEvents; i++) {
    CppNativeEngine.scanSecurityPacket(i, Math.random() * 10);
  }
  const burstDurationMs = Date.now() - burstStart;
  results.push({
    test: "Burst Attack (5K scanPacket)",
    throughputPerSec: Math.round(burstEvents / (burstDurationMs / 1000)),
    p50Micros: 0,
    p95Micros: 0,
    p99Micros: 0,
    avgMicros: 0,
    memoryPeakMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    cpuAvgPct: 0,
    cpuMaxPct: 0,
    totalEvents: burstEvents,
    durationMs: burstDurationMs,
  });

  // ----------------------------------------------------------
  // 6. Metrics snapshot
  // ----------------------------------------------------------
  const metrics = CppNativeEngine.getMetrics();
  console.log("\n📊 [BENCHMARK] Live Engine Metrics");
  console.log(JSON.stringify(metrics, null, 2));

  // ----------------------------------------------------------
  // Print results table
  // ----------------------------------------------------------
  printTable(results);

  // ----------------------------------------------------------
  // Generate Markdown report
  // ----------------------------------------------------------
  const md = `# Benchmark Results

Generated: ${new Date().toISOString()}

Environment:
- Node.js: ${process.version}
- CPUs: ${cpuCount} (${os.arch()})
- Platform: ${os.platform()}
- Engine Mode: ${engineMode}

## Summary

| Test | Throughput/s | p50 (us) | p95 (us) | p99 (us) | Avg (us) | Peak Mem (MB) | CPU % | Events | Duration (ms) |
|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|
`;
  let table = md;
  for (const r of results) {
    table += `| ${r.test} | ${r.throughputPerSec} | ${r.p50Micros} | ${r.p95Micros} | ${r.p99Micros} | ${r.avgMicros} | ${r.memoryPeakMB} | ${r.cpuAvgPct} | ${r.totalEvents} | ${r.durationMs} |\n`;
  }
  table += `
## Notes

- Native benchmarks exercise the compiled C++ N-API addon (security_engine.node).
- Node.js crypto benchmarks use the built-in OpenSSL bindings.
- scanBatch results are measured per full batch invocation.
- CPU usage is per-core average across all logical CPUs.
- Memory is V8 heap used; native arena memory is tracked via engine metrics.
`;

  const outPath = path.join(process.cwd(), "BENCHMARK_RESULTS.md");
  fs.writeFileSync(outPath, table);
  console.log(`📄 [BENCHMARK] Results saved to ${outPath}\n`);
}

// ================================================================
//  Entry point
// ================================================================
import fs from "fs";
main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
