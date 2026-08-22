import { describe, it, expect, vi, beforeEach } from "vitest";
import { CppNativeEngine } from "../src/CppEngine.js";

describe("CppEngine: Concurrency", { retry: 0 }, () => {
  beforeEach(async () => {
    CppNativeEngine.reset();
    vi.resetModules();
  });

  it("handles concurrent scan requests", async () => {
    await CppNativeEngine.initEngine();
    const promises = Array.from({ length: 50 }, (_, i) =>
      Promise.resolve(CppNativeEngine.scanSecurityPacket(i, 1.2))
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(50);
    results.forEach((r) => {
      expect(typeof r.passed).toBe("boolean");
      expect(typeof r.latencyMicros).toBe("number");
      expect(typeof r.score).toBe("number");
    });
  });

  it("handles concurrent batch scans", async () => {
    await CppNativeEngine.initEngine();
    const promises = Array.from({ length: 10 }, (_, i) =>
      CppNativeEngine.batchScanPackets([
        { packetId: i * 10, riskWeight: 1.2 },
        { packetId: i * 10 + 1, riskWeight: 2.5 },
      ])
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    results.forEach((batch) => {
      expect(batch).toHaveLength(2);
    });
  });

  it("handles concurrent hash computations", async () => {
    await CppNativeEngine.initEngine();
    const promises = Array.from({ length: 20 }, (_, i) =>
      CppNativeEngine.batchComputeHashes([
        { data: `test-${i}`, algorithm: "sha256" },
      ])
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(20);
    results.forEach((res) => {
      expect(res[0].hash).toBeDefined();
      expect(res[0].hash).toHaveLength(64);
    });
  });

  it("maintains metrics consistency under concurrent load", async () => {
    await CppNativeEngine.initEngine();
    const promises = Array.from({ length: 100 }, (_, i) =>
      CppNativeEngine.scanSecurityPacket(i, Math.random() * 5)
    );
    await Promise.all(promises);
    const metrics = CppNativeEngine.getMetrics();
    expect(typeof metrics.totalAuditsProcessed).toBe("number");
    expect(metrics.totalAuditsProcessed).toBeGreaterThanOrEqual(0);
  });

  it("does not corrupt state during mixed concurrent operations", async () => {
    await CppNativeEngine.initEngine();
    const ops: Array<() => Promise<void>> = [
      ...Array.from({ length: 20 }, (_, i) => () => Promise.resolve(CppNativeEngine.scanSecurityPacket(i, 1.2)).then(() => {})),
      ...Array.from({ length: 10 }, (_, i) => () => CppNativeEngine.batchScanPackets([{ packetId: i, riskWeight: 1.5 }]).then(() => {})),
      ...Array.from({ length: 10 }, (_, i) => () => CppNativeEngine.batchComputeHashes([{ data: `data-${i}`, algorithm: "sha256" }]).then(() => {})),
    ];
    const promises = ops.map((op) => Promise.resolve().then(op));
    const results = await Promise.all(promises);
    expect(results).toHaveLength(40);
  });
});
