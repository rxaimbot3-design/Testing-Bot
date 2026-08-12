import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityPipeline, type SecurityEvent } from "../src/security/Pipeline.js";
import { CppNativeEngine } from "../src/CppEngine.js";
import request from "supertest";

const CONCURRENT_LEVELS = [1000, 10000];

describe("Load: Security Pipeline Throughput", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it.each(CONCURRENT_LEVELS)("processes %i concurrent events", async (count) => {
    const events: SecurityEvent[] = Array.from({ length: count }, (_, i) => ({
      type: "message_create",
      userId: `user_${i % 100}`,
      guildId: `guild_${i % 10}`,
      timestamp: Date.now() + i,
      payload: {},
    }));

    const start = Date.now();
    const results = SecurityPipeline.processBatch(events);
    const elapsed = Date.now() - start;

    expect(results).toHaveLength(count);
    expect(elapsed).toBeLessThan(5000);
  });

  it("measures latency under load", () => {
    const latencies: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const event: SecurityEvent = {
        type: "message_create",
        userId: `user_${i}`,
        guildId: "guild_1",
        timestamp: Date.now(),
        payload: {},
      };
      const start = performance.now();
      SecurityPipeline.processEvent(event);
      latencies.push(performance.now() - start);
    }
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    expect(avg).toBeLessThan(5);
  });
});

describe("Load: C++ Engine Throughput", () => {
  beforeEach(async () => {
    vi.resetModules();
    await CppNativeEngine.initEngine();
  });

  it("processes 10K batch scans within time limit", async () => {
    const requests = Array.from({ length: 10000 }, (_, i) => ({ packetId: i, riskWeight: 1.2 }));
    const start = Date.now();
    const results = await CppNativeEngine.batchScanPackets(requests);
    const elapsed = Date.now() - start;
    expect(results).toHaveLength(10000);
    expect(elapsed).toBeLessThan(3000);
  });

  it("computes 10K hashes within time limit", async () => {
    const requests = Array.from({ length: 10000 }, (_, i) => ({
      data: `data_${i}`,
      algorithm: "sha256" as const,
    }));
    const start = Date.now();
    const results = await CppNativeEngine.batchComputeHashes(requests);
    const elapsed = Date.now() - start;
    expect(results).toHaveLength(10000);
    expect(elapsed).toBeLessThan(3000);
  });
});

describe("Load: Memory Stability", () => {
  it("does not leak memory during sustained pipeline processing", () => {
    const memBefore = process.memoryUsage().heapUsed;
    for (let i = 0; i < 5000; i++) {
      const event: SecurityEvent = {
        type: "message_create",
        userId: `user_${i % 500}`,
        guildId: `guild_${i % 50}`,
        timestamp: Date.now() + i,
        payload: { iteration: i },
      };
      SecurityPipeline.processEvent(event);
    }
    const memAfter = process.memoryUsage().heapUsed;
    const growth = memAfter - memBefore;
    expect(growth).toBeLessThan(50 * 1024 * 1024);
  });
});

describe("Load: Rate Limiting", () => {
  it("handles burst of requests without crashing", async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";

    vi.mock("../discord-bot", () => ({
      startDiscordBot: vi.fn(),
      stopDiscordBot: vi.fn(),
      getDiscordBotStatus: vi.fn(() => ({ status: "offline", logs: [] })),
      toggleLockdown: vi.fn(),
      addBotLog: vi.fn(),
      sendGitHubAlert: vi.fn(),
      getSecurityStats: vi.fn(() => ({ blockedAttacksCount: 0, quarantinedUsers: 0, backupCount: 0, ipBansCount: 0, verifiedIpsCount: 0, securityScore: 100, panicLockdownActive: false })),
      runNukeDefenseDrill: vi.fn(),
      triggerHoneypotTrap: vi.fn(),
      getClient: vi.fn(() => null),
    }));

    vi.mock("../src/SecurityFeatures", async () => {
      const actual: any = await vi.importActual("../src/SecurityFeatures");
      return {
        ...actual,
        MongoRedisEngine: {
          ...actual.MongoRedisEngine,
          initRedis: vi.fn().mockResolvedValue(undefined),
        },
      };
    });

    vi.resetModules();
    const server = await import("../server.js");
    const app = server.app;

    const requests = Array.from({ length: 200 }, () =>
      request(app).get("/api/health")
    );
    const responses = await Promise.all(requests);
    expect(responses.length).toBe(200);
    const successCount = responses.filter((r) => r.status === 200).length;
    expect(successCount).toBeGreaterThan(0);
  });
});
