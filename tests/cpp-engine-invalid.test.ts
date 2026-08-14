import { describe, it, expect, vi, beforeEach } from "vitest";
import { CppNativeEngine } from "../src/CppEngine.js";

describe("CppEngine: Invalid Input Tests", () => {
  beforeEach(async () => {
    CppNativeEngine.reset();
    vi.resetModules();
  });

  it("handles non-numeric packetId", () => {
    const result = CppNativeEngine.scanSecurityPacket(NaN as any, 1.5);
    expect(result.passed).toBe(true);
    expect(typeof result.latencyMicros).toBe("number");
  });

  it("handles non-numeric riskWeight", () => {
    const result = CppNativeEngine.scanSecurityPacket(1, NaN as any);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("handles null and undefined inputs", () => {
    expect(() => CppNativeEngine.scanSecurityPacket(null as any, 1.5)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(undefined as any, 1.5)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(1, null as any)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(1, undefined as any)).not.toThrow();
  });

  it("handles string inputs", () => {
    expect(() => CppNativeEngine.scanSecurityPacket("abc" as any, "1.5" as any)).not.toThrow();
  });

  it("handles extremely large riskWeight clamping", () => {
    const result = CppNativeEngine.scanSecurityPacket(1, 999999);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.passed).toBe("boolean");
  });

  it("handles extremely negative riskWeight clamping", () => {
    const result = CppNativeEngine.scanSecurityPacket(1, -999999);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.passed).toBe("boolean");
  });

  it("handles empty batch", async () => {
    const results = await CppNativeEngine.batchScanPackets([]);
    expect(results).toHaveLength(0);
  });

  it("handles batch with invalid entries", async () => {
    const results = await CppNativeEngine.batchScanPackets([
      { packetId: NaN as any, riskWeight: "bad" as any },
      { packetId: 1, riskWeight: 1.5 },
    ]);
    expect(results).toHaveLength(2);
  });

  it("handles empty string hash data", async () => {
    const results = await CppNativeEngine.batchComputeHashes([{ data: "", algorithm: "sha256" }]);
    expect(results[0].hash).toBeDefined();
  });

  it("handles invalid hash algorithm", async () => {
    const results = await CppNativeEngine.batchComputeHashes([{ data: "test", algorithm: "invalid" as any }]);
    expect(results[0].hash).toBeDefined();
  });

  it("handles null/undefined hash data", async () => {
    expect(() => CppNativeEngine.batchComputeHashes([{ data: null as any, algorithm: "sha256" }])).not.toThrow();
    expect(() => CppNativeEngine.batchComputeHashes([{ data: undefined as any, algorithm: "sha256" }])).not.toThrow();
  });

  it("getMetrics does not throw even when uninitialized", async () => {
    const metrics = CppNativeEngine.getMetrics();
    expect(metrics).toHaveProperty("engineName");
    expect(metrics).toHaveProperty("status");
  });

  it("resetMetrics does not throw", () => {
    expect(() => CppNativeEngine.resetMetrics()).not.toThrow();
  });

  it("shutdown does not throw", async () => {
    await expect(CppNativeEngine.shutdown()).resolves.toBeUndefined();
  });

  it("handles boolean inputs", () => {
    expect(() => CppNativeEngine.scanSecurityPacket(true as any, false as any)).not.toThrow();
  });

  it("handles object inputs", () => {
    expect(() => CppNativeEngine.scanSecurityPacket({} as any, [] as any)).not.toThrow();
  });

  it("handles array inputs", () => {
    expect(() => CppNativeEngine.scanSecurityPacket([1] as any, [2] as any)).not.toThrow();
  });
});
