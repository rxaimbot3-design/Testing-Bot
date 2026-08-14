import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

let app: Express;

beforeEach(async () => {
  process.env.NODE_ENV = "test";
  process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";
  process.env.DISCORD_BOT_TOKEN = "test_discord_token";
  process.env.GEMINI_API_KEY = "test_gemini_key";
  process.env.DISCORD_OWNER_ID = "123456789";

  vi.mock("../discord-bot", () => ({
    startDiscordBot: vi.fn().mockResolvedValue(undefined),
    stopDiscordBot: vi.fn().mockResolvedValue(undefined),
    getDiscordBotStatus: vi.fn(() => ({ status: "online", logs: [], ping: 42 })),
    toggleLockdown: vi.fn().mockResolvedValue("offline"),
    addBotLog: vi.fn(),
    sendGitHubAlert: vi.fn(),
    getSecurityStats: vi.fn(() => ({
      blockedAttacksCount: 0,
      quarantinedUsers: 0,
      backupCount: 0,
      ipBansCount: 0,
      verifiedIpsCount: 0,
      securityScore: 100,
      panicLockdownActive: false,
    })),
    runNukeDefenseDrill: vi.fn().mockResolvedValue({ neutralized: 100 }),
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
  app = server.app;
});

describe("Dashboard API: Extended Coverage", () => {
  it("returns detailed health without auth", async () => {
    const res = await request(app).get("/api/health/detailed");
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown route", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("returns public config fields", async () => {
    const res = await request(app).get("/api/config/public");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("discordClientId");
  });

  it("requires auth for admin whitelist", async () => {
    const res = await request(app).get("/api/admin/whitelist");
    expect(res.status).toBe(401);
  });

  it("requires auth for audit logs", async () => {
    const res = await request(app).get("/api/admin/audit-logs");
    expect(res.status).toBe(401);
  });

  it("requires auth for secrets scan endpoint", async () => {
    const res = await request(app).post("/api/admin/secrets-scan").send({ targetPath: "/tmp" });
    expect(res.status).toBe(401);
  });

  it("requires auth for enterprise status", async () => {
    const res = await request(app).get("/api/enterprise/status");
    expect(res.status).toBe(401);
  });

  it("requires auth for cpp engine stats", async () => {
    const res = await request(app).get("/api/cpp-engine/stats");
    expect(res.status).toBe(401);
  });

  it("requires auth for security stats", async () => {
    const res = await request(app).get("/api/security/ultra-stats");
    expect(res.status).toBe(401);
  });

  it("requires auth for snapshots list", async () => {
    const res = await request(app).get("/api/snapshots");
    expect(res.status).toBe(401);
  });

  it("requires auth for github status", async () => {
    const res = await request(app).get("/api/github/status");
    expect(res.status).toBe(401);
  });

  it("requires auth for gemini chat", async () => {
    const res = await request(app).post("/api/gemini/chat").send({ message: "hi" });
    expect(res.status).toBe(401);
  });

  it("requires auth for bot lockdown", async () => {
    const res = await request(app).post("/api/bot/lockdown").send({ active: true });
    expect(res.status).toBe(401);
  });

  it("requires auth for system restart", async () => {
    const res = await request(app).post("/api/system/restart").send({});
    expect(res.status).toBe(401);
  });
});
