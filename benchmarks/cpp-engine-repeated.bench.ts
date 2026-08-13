import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { CppNativeEngine } from "../src/CppEngine.js";

const __filename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : process.argv[1] || ".";
const __dirname = path.dirname(__filename);

interface RunResult {
  throughputPerSec: number;
  eventsPerSec: number;
  batchCallsPerSec?: number;
  p50Micros: number;
  p95Micros: number;
  p99Micros: number;
  avgMicros: number;
  memoryPeakMB: number;
  cpuAvgPct: number;
  totalEvents: number;
  durationMs: number;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function median(values: number[]): number {
  return percentile(values, 50);
}

function stats(values: number[]): { min: number; max: number; mean: number; median: number; p95: number; p99: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const median = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  return { min, max, mean, median, p95, p99 };
}

async function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  eventsPerRun: number,
  runs = 10,
  warmupRuns = 3,
  batchSize = 1
): Promise<{ name: string; results: RunResult[]; stats: ReturnType<typeof stats>; eventsStats: ReturnType<typeof stats> }> {
  const results: RunResult[] = [];

  // Warmup runs (not measured)
  for (let w = 0; w < warmupRuns; w++) {
    for (let i = 0; i < eventsPerRun; i++) {
      await fn();
    }
  }

  // Measured runs
  for (let r = 0; r < runs; r++) {
    const start = Date.now();
    const cpuBefore = process.cpuUsage();
    const latencies: number[] = [];

    for (let i = 0; i < eventsPerRun; i++) {
      const t0 = process.hrtime.bigint();
      await fn();
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1000);
    }

    const end = Date.now();
    const cpuAfter = process.cpuUsage(cpuBefore);
    const durationMs = end - start;
    const throughput = eventsPerRun / (durationMs / 1000);
    const eventsPerSec = (eventsPerRun * batchSize) / (durationMs / 1000);
    const batchCallsPerSec = batchSize > 1 ? eventsPerRun / (durationMs / 1000) : undefined;

    const cpuUserMs = cpuAfter.user / 1000;
    const cpuSystemMs = cpuAfter.system / 1000;
    const totalCpuMs = cpuUserMs + cpuSystemMs;
    const cpuAvgPct = durationMs > 0
      ? (totalCpuMs / (durationMs * os.cpus().length)) * 100
      : 0;

    results.push({
      throughputPerSec: Math.round(throughput),
      eventsPerSec: Math.round(eventsPerSec),
      batchCallsPerSec: batchCallsPerSec ? Math.round(batchCallsPerSec) : undefined,
      p50Micros: Math.round(percentile(latencies, 50)),
      p95Micros: Math.round(percentile(latencies, 95)),
      p99Micros: Math.round(percentile(latencies, 99)),
      avgMicros: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      memoryPeakMB: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      cpuAvgPct: Math.round(cpuAvgPct * 100) / 100,
      totalEvents: eventsPerRun,
      durationMs,
    });
  }

  const throughputs = results.map(r => r.throughputPerSec);
  const eventsThroughputs = results.map(r => r.eventsPerSec);
  const tStats = stats(throughputs);
  const eStats = stats(eventsThroughputs);

  return { name, results, stats: tStats, eventsStats: eStats };
}

function printResults(name: string, data: { name: string; results: RunResult[]; stats: ReturnType<typeof stats>; eventsStats: ReturnType<typeof stats> }) {
  console.log(`\n${"=".repeat(100)}`);
  console.log(`${name} (${data.results.length} measured runs, ${data.results[0].totalEvents.toLocaleString()} events/run)`);
  console.log(`${"=".repeat(100)}`);
  console.log(`Throughput/s:    min=${data.stats.min.toLocaleString()} max=${data.stats.max.toLocaleString()} mean=${Math.round(data.stats.mean).toLocaleString()} median=${data.stats.median.toLocaleString()} p95=${data.stats.p95.toLocaleString()} p99=${data.stats.p99.toLocaleString()}`);
  console.log(`Events/s:        min=${data.eventsStats.min.toLocaleString()} max=${data.eventsStats.max.toLocaleString()} mean=${Math.round(data.eventsStats.mean).toLocaleString()} median=${data.eventsStats.median.toLocaleString()} p95=${data.eventsStats.p95.toLocaleString()} p99=${data.eventsStats.p99.toLocaleString()}`);
  console.log(`\nPer-run breakdown:`);
  console.log(`  Run | Throughput/s | Events/s | Batch/s | p50 us | p95 us | p99 us | Avg us | Mem MB | CPU % | Duration ms`);
  data.results.forEach((r, i) => {
    const batchStr = r.batchCallsPerSec !== undefined ? String(r.batchCallsPerSec).padStart(7) : "".padStart(7);
    console.log(`  ${String(i + 1).padStart(2)}  | ${String(r.throughputPerSec).padStart(12)} | ${String(r.eventsPerSec).padStart(9)} | ${batchStr} | ${String(r.p50Micros).padStart(6)} | ${String(r.p95Micros).padStart(6)} | ${String(r.p99Micros).padStart(6)} | ${String(r.avgMicros).padStart(6)} | ${String(r.memoryPeakMB).padStart(6)} | ${String(r.cpuAvgPct).padStart(5)} | ${String(r.durationMs).padStart(10)}`);
  });
}

async function main() {
  console.log("🔬 [BENCHMARK] C++ Native Engine - Repeated Runs (3 warmup + 10 measured)\n");

  await CppNativeEngine.initEngine();
  const engineMode = (CppNativeEngine as any).engineMode || "unknown";
  console.log(`⚡ Engine mode: ${engineMode}\n`);

  const testData = "benchmark_payload_" + "x".repeat(256);

  // 1. scanPacket 10K events, 10 measured runs
  const scanPacketResults = await runBenchmark("Native scanPacket (10K events)", async () => {
    CppNativeEngine.scanSecurityPacket(Math.floor(Math.random() * 10000), Math.random() * 10);
  }, 10000, 10, 3, 1);
  printResults("scanPacket 10K", scanPacketResults);

  // 2. scanBatch 100K events, 10 measured runs
  const buildBatch = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ packetId: i, riskWeight: Math.random() * 5, eventType: Math.floor(Math.random() * 3), channelCount: Math.floor(Math.random() * 10) }));

  const scanBatchResults = await runBenchmark("Native scanBatch (100K events)", async () => {
    await CppNativeEngine.batchScanPackets(buildBatch(100000));
  }, 1, 10, 3, 100000);
  printResults("scanBatch 100K", scanBatchResults);

  // 3. SHA-256 batch 10K, 10 measured runs
  const sha256Results = await runBenchmark("Native SHA-256 (10K events)", async () => {
    await CppNativeEngine.batchComputeHashes(
      Array.from({ length: 10000 }, () => ({ data: testData, algorithm: "sha256" as const }))
    );
  }, 1, 10, 3, 10000);
  printResults("SHA-256 10K", sha256Results);

  // 4. Burst 50K events, 10 measured runs
  const burstResults = await runBenchmark("Burst Attack (50K events)", async () => {
    CppNativeEngine.scanSecurityPacket(Math.floor(Math.random() * 10000), Math.random() * 10);
  }, 50000, 10, 3, 1);
  printResults("Burst 50K", burstResults);

  // Summary
  console.log(`\n${"=".repeat(100)}`);
  console.log("SUMMARY (after warmup)");
  console.log(`${"=".repeat(100)}`);
  console.log(`scanPacket 10K: ${Math.round(scanPacketResults.stats.mean).toLocaleString()} ± ${Math.round(scanPacketResults.stats.max - scanPacketResults.stats.min).toLocaleString()} throughput/s, ${Math.round(scanPacketResults.eventsStats.mean).toLocaleString()} ± ${Math.round(scanPacketResults.eventsStats.max - scanPacketResults.eventsStats.min).toLocaleString()} events/s`);
  console.log(`scanBatch 100K: ${Math.round(scanBatchResults.stats.mean).toLocaleString()} ± ${Math.round(scanBatchResults.stats.max - scanBatchResults.stats.min).toLocaleString()} calls/s, ${Math.round(scanBatchResults.eventsStats.mean).toLocaleString()} ± ${Math.round(scanBatchResults.eventsStats.max - scanBatchResults.eventsStats.min).toLocaleString()} events/s`);
  console.log(`SHA-256 10K:   ${Math.round(sha256Results.stats.mean).toLocaleString()} ± ${Math.round(sha256Results.stats.max - sha256Results.stats.min).toLocaleString()} calls/s, ${Math.round(sha256Results.eventsStats.mean).toLocaleString()} ± ${Math.round(sha256Results.eventsStats.max - sha256Results.eventsStats.min).toLocaleString()} events/s`);
  console.log(`Burst 50K:     ${Math.round(burstResults.stats.mean).toLocaleString()} ± ${Math.round(burstResults.stats.max - burstResults.stats.min).toLocaleString()} throughput/s, ${Math.round(burstResults.eventsStats.mean).toLocaleString()} ± ${Math.round(burstResults.eventsStats.max - burstResults.eventsStats.min).toLocaleString()} events/s`);
}

main().catch(console.error);
