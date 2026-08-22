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

describe("Backup API: Extended Coverage", () => {
  it("requires auth for backup integrity test", async () => {
    const res = await request(app).post("/api/admin/backup-integrity-test").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for snapshots list", async () => {
    const res = await request(app).get("/api/snapshots");
    expect(res.status).toBe(401);
  });

  it("requires auth for snapshot creation", async () => {
    const res = await request(app).post("/api/snapshots/create").send({ name: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for snapshot restore", async () => {
    const res = await request(app).post("/api/snapshots/restore").send({ snapshotId: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for cache backup", async () => {
    const res = await request(app).post("/api/enterprise/cache-backup").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for admin whitelist", async () => {
    const res = await request(app).get("/api/admin/whitelist");
    expect(res.status).toBe(401);
  });

  it("requires auth for admin whitelist post", async () => {
    const res = await request(app).post("/api/admin/whitelist").send({ userId: "123" });
    expect(res.status).toBe(401);
  });

  it("requires auth for admin whitelist delete", async () => {
    const res = await request(app).delete("/api/admin/whitelist/123");
    expect(res.status).toBe(401);
  });

  it("requires auth for secrets scan", async () => {
    const res = await request(app).post("/api/admin/secrets-scan").send({ targetPath: "/tmp" });
    expect(res.status).toBe(401);
  });

  it("requires auth for audit logs", async () => {
    const res = await request(app).get("/api/admin/audit-logs");
    expect(res.status).toBe(401);
  });

  it("requires auth for zero downtime restart", async () => {
    const res = await request(app).post("/api/enterprise/zero-downtime-restart").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for hot reload", async () => {
    const res = await request(app).post("/api/enterprise/hot-reload").send({ config: {} });
    expect(res.status).toBe(401);
  });

  it("requires auth for Query Gateway", async () => {
    const res = await request(app).post("/api/query-gateway").send({ query: "{}" });
    expect(res.status).toBe(401);
  });

  it("requires auth for bot lockdown", async () => {
    const res = await request(app).post("/api/bot/lockdown").send({ active: true });
    expect(res.status).toBe(401);
  });

  it("requires auth for cpp engine scan", async () => {
    const res = await request(app).post("/api/cpp-engine/scan").send({ data: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for security ultra stats", async () => {
    const res = await request(app).get("/api/security/ultra-stats");
    expect(res.status).toBe(401);
  });

  it("requires auth for token rotation", async () => {
    const res = await request(app).post("/api/security/rotate-token").send({ token: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for oauth scan", async () => {
    const res = await request(app).post("/api/security/oauth-scan").send({ token: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for ai raid prediction", async () => {
    const res = await request(app).get("/api/security/ai-raid-prediction");
    expect(res.status).toBe(401);
  });

  it("requires auth for ai report", async () => {
    const res = await request(app).get("/api/security/ai-report");
    expect(res.status).toBe(401);
  });

  it("requires auth for ai assistant", async () => {
    const res = await request(app).post("/api/security/ai-assistant").send({ message: "hi" });
    expect(res.status).toBe(401);
  });

  it("requires auth for ai optimize", async () => {
    const res = await request(app).get("/api/security/ai-optimize");
    expect(res.status).toBe(401);
  });

  it("requires auth for system restart", async () => {
    const res = await request(app).post("/api/system/restart").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for discord connect", async () => {
    const res = await request(app).post("/api/discord/connect").send({ token: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for discord disconnect", async () => {
    const res = await request(app).post("/api/discord/disconnect").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for bot verify audit", async () => {
    const res = await request(app).post("/api/bot/verify-audit").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for simulate nukers", async () => {
    const res = await request(app).post("/api/bot/simulate-100-nukers").send({});
    expect(res.status).toBe(401);
  });

  it("requires auth for premium activate", async () => {
    const res = await request(app).post("/api/premium/activate").send({ key: "test" });
    expect(res.status).toBe(401);
  });

  it("requires auth for economy leaderboard", async () => {
    const res = await request(app).get("/api/economy/leaderboard");
    expect(res.status).toBe(401);
  });

  it("requires auth for mongo redis status", async () => {
    const res = await request(app).get("/api/enterprise/mongo-redis");
    expect(res.status).toBe(401);
  });
});
