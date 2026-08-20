import { describe, it, expect, vi } from "vitest";
import { SecurityPipeline, type SecurityEvent } from "../src/security/Pipeline.js";
import { scanForSecrets, validateInput } from "../src/security.js";
import { BackupEngine } from "../src/security/BackupEngine.js";
import request from "supertest";
import crypto from "crypto";

const FUZZ_ITERATIONS = 500;
const FUZZ_TIME_MS = 2000;

describe("Fuzz: Security Pipeline", { retry: 0 }, () => {
  it("survives random events without crashing", () => {
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const event: SecurityEvent = {
        type: crypto.randomBytes(8).toString("hex").slice(0, 20),
        userId: crypto.randomBytes(16).toString("hex"),
        guildId: crypto.randomBytes(16).toString("hex"),
        timestamp: Date.now(),
        payload: { value: crypto.randomBytes(32).toString("hex") },
      };
      expect(() => SecurityPipeline.processEvent(event)).not.toThrow();
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
  }, 10000);

  it("handles extremely long strings in events", () => {
    const longString = "a".repeat(100000);
    const event: SecurityEvent = {
      type: longString,
      userId: longString,
      guildId: longString,
      timestamp: Date.now(),
      payload: { data: longString },
    };
    expect(() => SecurityPipeline.processEvent(event)).not.toThrow();
  });
});

describe("Fuzz: C++ Engine Wrapper", { retry: 0 }, () => {
  it("survives random payloads without crashing", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
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

  it("handles random hash requests", async () => {
    const { CppNativeEngine } = await import("../src/CppEngine.js");
    const algorithms = ["sha256", "sha512", "crc32"] as const;
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const data = crypto.randomBytes(64).toString("hex");
      const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
      expect(() => CppNativeEngine.batchComputeHashes([{ data, algorithm }])).not.toThrow();
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
  }, 10000);
});

describe("Fuzz: Backup Engine", { retry: 0 }, () => {
  it("survives random data inputs without crashing", () => {
    BackupEngine.init();
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const randomData = {
        id: crypto.randomBytes(16).toString("hex"),
        value: crypto.randomBytes(128).toString("hex"),
        nested: { deep: crypto.randomBytes(32).toString("hex") },
      };
      expect(() => BackupEngine.createBackup(randomData)).not.toThrow();
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
  }, 10000);

  it("handles unicode and special characters", () => {
    BackupEngine.init();
    const weirdData = { emoji: "🔥💀", chinese: "中文测试", sql: "'; DROP TABLE users;--" };
    expect(() => BackupEngine.createBackup(weirdData)).not.toThrow();
    const meta = BackupEngine.createBackup(weirdData);
    expect(BackupEngine.verifyBackup(meta.id)).toBe(true);
  });
});

describe("Fuzz: API Endpoints", { retry: 0 }, () => {
  it("handles random payloads without unhandled exceptions", async () => {
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

    const start = Date.now();
    let iterations = 0;
    let crashCount = 0;
    let unhandledErrorCount = 0;
    while (Date.now() - start < FUZZ_TIME_MS && iterations < FUZZ_ITERATIONS) {
      const randomBody = {
        [crypto.randomBytes(8).toString("hex")]: crypto.randomBytes(32).toString("hex"),
      };
      try {
        const res = await request(app)
          .post("/api/auth/login")
          .send(randomBody);
        // Real behavior: malformed login payloads must return 400, never 500
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("success", false);
        expect(res.body).toHaveProperty("error");
      } catch (err: any) {
        // Unhandled exception / crash
        unhandledErrorCount++;
        console.error("Unhandled error during fuzz:", err?.message || err);
      }
      iterations++;
    }
    expect(iterations).toBeGreaterThan(0);
    expect(unhandledErrorCount).toBe(0);
  }, 10000);
});
