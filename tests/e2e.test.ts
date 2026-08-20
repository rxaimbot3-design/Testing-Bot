import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

describe("E2E: Full Server Startup and Health", () => {
  it("exports the express app", async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";
    process.env.DISCORD_BOT_TOKEN = "test_token";
    process.env.GEMINI_API_KEY = "test_gemini_key";
    process.env.DISCORD_OWNER_ID = "123";

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
    const app: Express = server.app;

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(["healthy", "degraded"]).toContain(res.body.status);
  });
});

describe("E2E: Discord Bot Connection Flow", () => {
  it("accepts bot connection with admin auth", async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";

    const startDiscordBot = vi.fn().mockResolvedValue(undefined);
    const getDiscordBotStatus = vi.fn(() => ({ status: "offline", logs: [] }));

    vi.mock("../discord-bot", () => ({
      startDiscordBot,
      stopDiscordBot: vi.fn(),
      getDiscordBotStatus,
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

    const res = await request(app)
      .post("/api/discord/connect")
      .set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`)
      .send({ token: "MTIzNDU2Nzg5MDEyMzQ1Njc4.Gc1234.abcdefghijklmnopqrstuvwxyz1234567890" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(startDiscordBot).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("status");
  });

  it("returns 500 when startDiscordBot fails", async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";

    const startDiscordBot = vi.fn().mockRejectedValue(new Error("Discord connection timeout"));

    vi.mock("../discord-bot", () => ({
      startDiscordBot,
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

    const res = await request(app)
      .post("/api/discord/connect")
      .set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`)
      .send({ token: "MTIzNDU2Nzg5MDEyMzQ1Njc4.Gc1234.abcdefghijklmnopqrstuvwxyz1234567890" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Discord connection timeout");
  });
});

describe("E2E: Security Event Processing", () => {
  it("processes a security event through the pipeline", async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";

    const mockStats = { totalEvents: 100, blocked: 50, quarantined: 10, lockdowns: 2 };
    const runNukeDefenseDrill = vi.fn().mockResolvedValue(mockStats);

    vi.mock("../discord-bot", () => ({
      startDiscordBot: vi.fn(),
      stopDiscordBot: vi.fn(),
      getDiscordBotStatus: vi.fn(() => ({ status: "offline", logs: [] })),
      toggleLockdown: vi.fn(),
      addBotLog: vi.fn(),
      sendGitHubAlert: vi.fn(),
      getSecurityStats: vi.fn(() => ({ blockedAttacksCount: 0, quarantinedUsers: 0, backupCount: 0, ipBansCount: 0, verifiedIpsCount: 0, securityScore: 100, panicLockdownActive: false })),
      runNukeDefenseDrill,
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

    const res = await request(app)
      .post("/api/bot/simulate-100-nukers")
      .set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(runNukeDefenseDrill).toHaveBeenCalledTimes(1);
    expect(res.body.stats).toEqual(mockStats);
  });

  it("returns 500 when runNukeDefenseDrill fails", async () => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_SECRET = "test_admin_secret_12345678901234567890123456789012";

    const runNukeDefenseDrill = vi.fn().mockRejectedValue(new Error("Drill execution failed"));

    vi.mock("../discord-bot", () => ({
      startDiscordBot: vi.fn(),
      stopDiscordBot: vi.fn(),
      getDiscordBotStatus: vi.fn(() => ({ status: "offline", logs: [] })),
      toggleLockdown: vi.fn(),
      addBotLog: vi.fn(),
      sendGitHubAlert: vi.fn(),
      getSecurityStats: vi.fn(() => ({ blockedAttacksCount: 0, quarantinedUsers: 0, backupCount: 0, ipBansCount: 0, verifiedIpsCount: 0, securityScore: 100, panicLockdownActive: false })),
      runNukeDefenseDrill,
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

    const res = await request(app)
      .post("/api/bot/simulate-100-nukers")
      .set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("E2E: Backup and Restore Lifecycle", () => {
  it("runs backup integrity test end-to-end", async () => {
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

    const res = await request(app)
      .post("/api/admin/backup-integrity-test")
      .set("Authorization", `Bearer ${process.env.ADMIN_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("E2E: Admin Authentication Lifecycle", () => {
  it("completes login -> session -> logout flow", async () => {
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

    const loginRes = await request(app).post("/api/auth/login").send({ adminKey: process.env.ADMIN_SECRET });
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
