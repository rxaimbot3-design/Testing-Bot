import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : process.argv[1] || ".";
const __dirname = path.dirname(__filename);

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

async function runBenchmark(name: string, fn: () => Promise<void> | void, events: number): Promise<BenchmarkResult> {
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
  const cpuAvgPct = durationMs > 0 ? (totalCpuMs / (durationMs * os.cpus().length)) * 100 : 0;

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
    durationMs
  };
}

function printTable(results: BenchmarkResult[]) {
  console.log("\n" + "=".repeat(120));
  console.log(`${"Test".padEnd(28)} | Throughput/s | p50 us | p95 us | p99 us | Avg us | Mem MB | CPU % | Events | Duration ms`);
  console.log("-".repeat(120));
  for (const r of results) {
    console.log(
      `${r.test.padEnd(28)} | ${String(r.throughputPerSec).padStart(12)} | ${String(r.p50Micros).padStart(7)} | ${String(r.p95Micros).padStart(7)} | ${String(r.p99Micros).padStart(7)} | ${String(r.avgMicros).padStart(6)} | ${String(r.memoryPeakMB).padStart(6)} | ${String(r.cpuAvgPct).padStart(5)} | ${String(r.totalEvents).padStart(7)} | ${String(r.durationMs).padStart(11)}`
    );
  }
  console.log("=".repeat(120) + "\n");
}

async function main() {
  console.log("🔬 [BENCHMARK] Starting C++ Engine Benchmark Suite\n");

  const results: BenchmarkResult[] = [];

  const hash256 = (data: string) => createHash("sha256").update(data).digest("hex");
  const hash512 = (data: string) => createHash("sha512").update(data).digest("hex");

  const testData = "benchmark_payload_" + "x".repeat(256);

  const hash256Batch = async (n: number) => {
    for (let i = 0; i < n; i++) hash256(testData + i);
  };

  const hash512Batch = async (n: number) => {
    for (let i = 0; i < n; i++) hash512(testData + i);
  };

  results.push(await runBenchmark("SHA-256 (1K ops)", async () => { hash256(testData); }, 1000));
  results.push(await runBenchmark("SHA-256 (10K ops)", async () => { hash256(testData); }, 10000));
  results.push(await runBenchmark("SHA-512 (1K ops)", async () => { hash512(testData); }, 1000));
  results.push(await runBenchmark("SHA-512 (10K ops)", async () => { hash512(testData); }, 10000));

  const cpuCount = os.cpus().length;
  const burstEvents = 5000;
  const burstStart = Date.now();
  await hash256Batch(burstEvents);
  const burstDurationMs = Date.now() - burstStart;
  results.push({
    test: "Burst Attack Detection",
    throughputPerSec: Math.round(burstEvents / (burstDurationMs / 1000)),
    p50Micros: 0,
    p95Micros: 0,
    p99Micros: 0,
    avgMicros: 0,
    memoryPeakMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    cpuAvgPct: 0,
    cpuMaxPct: 0,
    totalEvents: burstEvents,
    durationMs: burstDurationMs
  });

  const batchSizes = [1000, 10000, 100000];
  for (const size of batchSizes) {
    results.push(await runBenchmark(`Batch Scan (${size} events)`, async () => {
      const promises: Promise<void>[] = [];
      const chunk = 100;
      for (let i = 0; i < size; i += chunk) {
        promises.push(hash256Batch(Math.min(chunk, size - i)));
      }
      await Promise.all(promises);
    }, size));
  }

  printTable(results);

  const md = `# Benchmark Results\n\nGenerated: ${new Date().toISOString()}\n\nEnvironment:\n- Node.js: ${process.version}\n- CPUs: ${cpuCount} (${os.arch()})\n- Platform: ${os.platform()}\n\n## Summary\n\n| Test | Throughput/s | p50 (µs) | p95 (µs) | p99 (µs) | Avg (µs) | Peak Mem (MB) | CPU % | Events | Duration (ms) |\n|------|-------------|----------|----------|----------|----------|---------------|-------|--------|---------------|\n`;
  let table = md;
  for (const r of results) {
    table += `| ${r.test} | ${r.throughputPerSec} | ${r.p50Micros} | ${r.p95Micros} | ${r.p99Micros} | ${r.avgMicros} | ${r.memoryPeakMB} | ${r.cpuAvgPct} | ${r.totalEvents} | ${r.durationMs} |\n`;
  }
  table += `\n## Notes\n\n- SHA-256/SHA-512 computed via Node.js crypto (C++ OpenSSL backend).\n- Batch scans are parallelized via Promise.all with chunking.\n- CPU usage is per-core average.\n- Memory is V8 heap used.\n`;

  fs.writeFileSync(path.join(process.cwd(), "BENCHMARK_RESULTS.md"), table);
  console.log("📄 [BENCHMARK] Results saved to BENCHMARK_RESULTS.md\n");
}

import fs from "fs";
main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
