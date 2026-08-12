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
    getDiscordBotStatus: vi.fn(() => ({ status: "offline", logs: [], ping: 0 })),
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
    const actual = await vi.importActual("../src/SecurityFeatures");
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

describe("Dashboard API: Public Config", () => {
  it("returns public config without auth", async () => {
    const res = await request(app).get("/api/config/public");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("discordClientId");
  });

  it("returns health status without auth", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Dashboard API: Admin Auth Flow", () => {
  it("rejects login with missing admin key", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("accepts valid admin secret", async () => {
    const res = await request(app).post("/api/auth/login").send({ adminKey: process.env.ADMIN_SECRET });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it("rejects invalid admin secret", async () => {
    const res = await request(app).post("/api/auth/login").send({ adminKey: "wrong_secret" });
    expect(res.status).toBe(401);
  });
});

describe("Dashboard API: Session Management", () => {
  it("returns unauthenticated for missing session", async () => {
    const res = await request(app).get("/api/auth/session");
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  it("validates session with admin secret", async () => {
    const res = await request(app).get("/api/auth/session").set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
  });

  it("logs out and clears session", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ adminKey: process.env.ADMIN_SECRET });
    const token = loginRes.body.token;
    const res = await request(app).post("/api/auth/logout").set("Cookie", `admin_session_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("Dashboard API: Security Stats", () => {
  it("returns security stats with auth", async () => {
    const res = await request(app).get("/api/bot/security-status").set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("blockedAttacksCount");
    expect(res.body).toHaveProperty("securityScore");
  });

  it("returns 401 without auth for security stats", async () => {
    const res = await request(app).get("/api/bot/security-status");
    expect(res.status).toBe(401);
  });
});

describe("Dashboard API: Rate Limiting", () => {
  it("blocks excessive requests to login endpoint", async () => {
    const adminSecret = process.env.ADMIN_SECRET!;
    const requests = Array.from({ length: 15 }, () =>
      request(app).post("/api/auth/login").send({ adminKey: adminSecret })
    );
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
