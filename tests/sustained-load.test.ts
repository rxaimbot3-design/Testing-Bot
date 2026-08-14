import { describe, it, expect, beforeEach } from "vitest";
import { CppNativeEngine } from "../src/CppEngine.js";
import { SecurityPipeline } from "../src/security/Pipeline.js";

describe("Sustained Load & Memory Stability", () => {
  beforeEach(() => {
    CppNativeEngine.reset();
    SecurityPipeline.reset();
  });

  it("maintains stable memory over 30-second sustained native load", async () => {
    await CppNativeEngine.initEngine();
    const memBefore = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    const durationMs = 30 * 1000;
    let iterations = 0;

    while (Date.now() - startTime < durationMs) {
      const batch = Array.from({ length: 1000 }, (_, i) => ({
        packetId: i + 1,
        riskWeight: Math.random() * 100,
      }));
      await CppNativeEngine.batchScanPackets(batch);
      iterations++;
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memGrowthMB = (memAfter - memBefore) / (1024 * 1024);
    const elapsedSec = (Date.now() - startTime) / 1000;
    const totalEvents = iterations * 1000;

    console.log(`Sustained load: ${totalEvents} events in ${elapsedSec.toFixed(1)}s (${(totalEvents / elapsedSec).toFixed(0)} events/sec)`);
    console.log(`Memory growth: ${memGrowthMB.toFixed(2)} MB`);

    expect(totalEvents).toBeGreaterThan(0);
    expect(memGrowthMB).toBeLessThan(100);
  }, 60000);

  it("does not leak memory on repeated batch scan cycles", async () => {
    await CppNativeEngine.initEngine();
    const memBefore = process.memoryUsage().heapUsed;

    for (let cycle = 0; cycle < 50; cycle++) {
      const batch = Array.from({ length: 5000 }, (_, i) => ({
        packetId: i + 1,
        riskWeight: Math.random() * 100,
      }));
      await CppNativeEngine.batchScanPackets(batch);
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memGrowthMB = (memAfter - memBefore) / (1024 * 1024);
    console.log(`Memory growth after 50 cycles: ${memGrowthMB.toFixed(2)} MB`);
    expect(memGrowthMB).toBeLessThan(50);
  }, 30000);
});
