import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { CppNativeEngine } from "../src/CppEngine.js";

const FUZZ_ITERATIONS = 300;
const FUZZ_TIME_MS = 2000;

describe("CppEngine: Fuzz Tests", { retry: 0 }, () => {
  beforeEach(async () => {
    CppNativeEngine.reset();
    vi.resetModules();
  });

  it("survives random scan inputs without crashing", async () => {
    await CppNativeEngine.initEngine();
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const packetId = Math.floor(Math.random() * 100000);
      const riskWeight = Math.random() * 100;
      expect(() => CppNativeEngine.scanSecurityPacket(packetId, riskWeight)).not.toThrow();
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
  }, 10000);

  it("survives random batch scan inputs", async () => {
    await CppNativeEngine.initEngine();
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const count = Math.floor(Math.random() * 50);
      const requests = Array.from({ length: count }, () => ({
        packetId: Math.floor(Math.random() * 100000),
        riskWeight: Math.random() * 100,
      }));
      expect(() => CppNativeEngine.batchScanPackets(requests)).not.toThrow();
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
  }, 10000);

  it("survives random hash inputs", async () => {
    await CppNativeEngine.initEngine();
    const algorithms = ["sha256", "sha512", "crc32"] as const;
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const data = crypto.randomBytes(Math.floor(Math.random() * 1024)).toString("hex");
      const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
      expect(() => CppNativeEngine.batchComputeHashes([{ data, algorithm }])).not.toThrow();
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
  }, 10000);

  it("handles extremely large packet IDs", () => {
    CppNativeEngine.scanSecurityPacket(Number.MAX_SAFE_INTEGER, 1.5);
    CppNativeEngine.scanSecurityPacket(-1, 1.5);
    CppNativeEngine.scanSecurityPacket(0, 0);
  });

  it("handles boundary riskWeight values", () => {
    expect(() => CppNativeEngine.scanSecurityPacket(1, Number.MAX_VALUE)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(1, -Number.MAX_VALUE)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(1, NaN)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(1, Infinity)).not.toThrow();
    expect(() => CppNativeEngine.scanSecurityPacket(1, -Infinity)).not.toThrow();
  });

  it("handles empty and huge batch sizes", async () => {
    await CppNativeEngine.initEngine();
    expect(await CppNativeEngine.batchScanPackets([])).toHaveLength(0);
    const hugeBatch = Array.from({ length: 5000 }, (_, i) => ({ packetId: i, riskWeight: Math.random() * 5 }));
    const results = await CppNativeEngine.batchScanPackets(hugeBatch);
    expect(results).toHaveLength(5000);
  }, 10000);

  it("handles extremely long data strings for hashing", async () => {
    await CppNativeEngine.initEngine();
    const longString = "a".repeat(100000);
    const result = await CppNativeEngine.batchComputeHashes([{ data: longString, algorithm: "sha256" }]);
    expect(result[0].hash).toBeDefined();
    expect(result[0].hash).toHaveLength(64);
  });

  it("survives repeated init/reset cycles", async () => {
    for (let i = 0; i < 10; i++) {
      await CppNativeEngine.initEngine();
      CppNativeEngine.scanSecurityPacket(i, 1.2);
      CppNativeEngine.reset();
    }
  });
});
