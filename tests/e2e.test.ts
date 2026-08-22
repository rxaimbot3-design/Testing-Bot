import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

const ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";

const mockDiscordBot = {
  startDiscordBot: vi.fn().mockResolvedValue(undefined),
  stopDiscordBot: vi.fn().mockResolvedValue(undefined),
  getDiscordBotStatus: vi.fn(() => ({ status: "offline", logs: [] })),
  toggleLockdown: vi.fn(),
  addBotLog: vi.fn(),
  sendGitHubAlert: vi.fn(),
  getSecurityStats: vi.fn(() => ({ blockedAttacksCount: 0, quarantinedUsers: 0, backupCount: 0, ipBansCount: 0, verifiedIpsCount: 0, securityScore: 100, panicLockdownActive: false })),
  runNukeDefenseDrill: vi.fn(),
  triggerHoneypotTrap: vi.fn(),
  getClient: vi.fn(() => null),
};

vi.mock("../discord-bot", () => ({ ...mockDiscordBot }));

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

async function getTestApp(): Promise<Express> {
  process.env.NODE_ENV = "test";
  process.env.ADMIN_SECRET = ADMIN_SECRET;
  vi.resetModules();
  const server = await import("../server.js");
  return server.app;
}

describe("E2E: Full Server Startup and Health", () => {
  it("exports the express app", async () => {
    const app = await getTestApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(["healthy", "degraded"]).toContain(res.body.status);
  });
});

describe("E2E: Discord Bot Connection Flow", () => {
  beforeEach(() => {
    mockDiscordBot.startDiscordBot.mockResolvedValue(undefined);
    mockDiscordBot.getDiscordBotStatus.mockReturnValue({ status: "offline", logs: [] });
  });

  it("accepts bot connection with admin auth", async () => {
    const app = await getTestApp();
    const res = await request(app)
      .post("/api/discord/connect")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`)
      .send({ token: "MTIzNDU2Nzg5MDEyMzQ1Njc4.Gc1234.abcdefghijklmnopqrstuvwxyz1234567890" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDiscordBot.startDiscordBot).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("status");
  });

  it("returns 500 when startDiscordBot fails", async () => {
    mockDiscordBot.startDiscordBot.mockRejectedValue(new Error("Discord connection timeout"));
    const app = await getTestApp();
    const res = await request(app)
      .post("/api/discord/connect")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`)
      .send({ token: "MTIzNDU2Nzg5MDEyMzQ1Njc4.Gc1234.abcdefghijklmnopqrstuvwxyz1234567890" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Discord connection timeout");
  });
});

describe("E2E: Security Event Processing", () => {
  it("processes a security event through the pipeline", async () => {
    const mockStats = { totalEvents: 100, blocked: 50, quarantined: 10, lockdowns: 2 };
    mockDiscordBot.runNukeDefenseDrill.mockResolvedValue(mockStats);

    const app = await getTestApp();
    const res = await request(app)
      .post("/api/bot/simulate-100-nukers")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDiscordBot.runNukeDefenseDrill).toHaveBeenCalledTimes(1);
    expect(res.body.stats).toEqual(mockStats);
  });

  it("returns 500 when runNukeDefenseDrill fails", async () => {
    mockDiscordBot.runNukeDefenseDrill.mockRejectedValue(new Error("Drill execution failed"));
    const app = await getTestApp();
    const res = await request(app)
      .post("/api/bot/simulate-100-nukers")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("E2E: Backup and Restore Lifecycle", () => {
  it("runs backup integrity test end-to-end", async () => {
    const app = await getTestApp();
    const res = await request(app)
      .post("/api/admin/backup-integrity-test")
      .set("Authorization", `Bearer ${ADMIN_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("E2E: Admin Authentication Lifecycle", () => {
  it("completes login -> session -> logout flow", async () => {
    const app = await getTestApp();

    const loginRes = await request(app).post("/api/auth/login").send({ adminKey: ADMIN_SECRET });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const cookieHeader = loginRes.headers["set-cookie"];
    const sessionCookie = Array.isArray(cookieHeader) ? cookieHeader.find((c: string) => c.startsWith("admin_session_token=")) : undefined;
    const token = sessionCookie ? sessionCookie.split(";")[0].split("=")[1] : "";
    const sessionRes = await request(app).get("/api/auth/session").set("Cookie", `admin_session_token=${token}`);
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.authenticated).toBe(true);

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", `admin_session_token=${token}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
  });
});
