import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityPipeline, type SecurityEvent, type PipelineResult } from "../src/security/Pipeline.js";

describe("Security Pipeline: Independent Stages", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("processes a clean event without blocking", () => {
    const event: SecurityEvent = {
      type: "message_create",
      userId: "user_1",
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: {},
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.blocked).toBe(false);
    expect(result.action).toBe("monitor");
  });

  it("detects mass channel creation", () => {
    const userId = "nuker_1";
    const guildId = "guild_1";
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 6 }, (_, i) => ({
      type: "channel_create",
      userId,
      guildId,
      timestamp: now + i * 100,
      payload: { massAction: true },
    }));
    const results = SecurityPipeline.processBatch(events);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0].reason).toMatch(/High risk score|Medium risk score/);
  });

  it("detects mass role modification", () => {
    const userId = "nuker_2";
    const guildId = "guild_2";
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 4 }, (_, i) => ({
      type: "role_update",
      userId,
      guildId,
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  it("detects permission escalation", () => {
    const event: SecurityEvent = {
      type: "permission_update",
      userId: "nuker_3",
      guildId: "guild_3",
      timestamp: Date.now(),
      payload: { role: "admin", permissions: "administrator" },
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("detects burst activity", () => {
    const userId = "spammer_1";
    const guildId = "guild_4";
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 12 }, (_, i) => ({
      type: "unknown_action",
      userId,
      guildId,
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    const highScore = results.filter((r) => r.score >= 30);
    expect(highScore.length).toBeGreaterThanOrEqual(1);
  });

  it("allows trusted users regardless of activity", () => {
    SecurityPipeline.addTrustedUser("trusted_user");
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 20 }, (_, i) => ({
      type: "channel_create",
      userId: "trusted_user",
      guildId: "guild_5",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    results.forEach((r) => {
      expect(r.blocked).toBe(false);
      expect(r.action).toBe("allow_trusted");
    });
  });

  it("prevents false positives for normal single events", () => {
    const event: SecurityEvent = {
      type: "channel_create",
      userId: "normal_user",
      guildId: "guild_6",
      timestamp: Date.now(),
      payload: {},
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.blocked).toBe(false);
    expect(result.score).toBeLessThan(30);
  });

  it("applies automatic escalation correctly", () => {
    expect(SecurityPipeline.escalate({ blocked: true, action: "block", reason: "high", score: 95, rule: "test", canRollback: true })).toBe("lockdown");
    expect(SecurityPipeline.escalate({ blocked: true, action: "block", reason: "high", score: 75, rule: "test", canRollback: true })).toBe("ban");
    expect(SecurityPipeline.escalate({ blocked: true, action: "block", reason: "high", score: 55, rule: "test", canRollback: true })).toBe("quarantine");
    expect(SecurityPipeline.escalate({ blocked: false, action: "monitor", reason: "low", score: 20, rule: "test", canRollback: false })).toBe("monitor");
  });

  it("handles invalid/malformed events gracefully", () => {
    const badEvent = { type: "", userId: "", guildId: "", timestamp: NaN, payload: null } as SecurityEvent;
    const result = SecurityPipeline.processEvent(badEvent);
    expect(result).toBeDefined();
    expect(typeof result.blocked).toBe("boolean");
  });

  it("handles concurrent processing without state corruption", async () => {
    const userId = "concurrent_user";
    const guildId = "guild_7";
    const now = Date.now();
    const batch1 = Array.from({ length: 50 }, (_, i) => ({
      type: "message_create" as const,
      userId,
      guildId,
      timestamp: now + i,
      payload: {},
    }));
    const batch2 = Array.from({ length: 50 }, (_, i) => ({
      type: "message_create" as const,
      userId,
      guildId,
      timestamp: now + i + 1000,
      payload: {},
    }));
    const [results1, results2] = await Promise.all([
      Promise.resolve(SecurityPipeline.processBatch(batch1)),
      Promise.resolve(SecurityPipeline.processBatch(batch2)),
    ]);
    expect(results1).toHaveLength(50);
    expect(results2).toHaveLength(50);
  });
});

describe("Security Pipeline: Threshold Behavior", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("does not flag below mass channel threshold", () => {
    const now = Date.now();
    const events = Array.from({ length: 4 }, (_, i) => ({
      type: "channel_create" as const,
      userId: `u1_${i}`,
      guildId: "g1",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results.every((r) => !r.blocked)).toBe(true);
  });

  it("does not flag below mass role threshold", () => {
    const now = Date.now();
    const events = Array.from({ length: 2 }, (_, i) => ({
      type: "role_update" as const,
      userId: `u2_${i}`,
      guildId: "g2",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results.every((r) => !r.blocked)).toBe(true);
  });
});

describe("Security Pipeline: Attack Simulations", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("detects and blocks mass channel deletion raid", () => {
    const now = Date.now();
    const events = Array.from({ length: 15 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { massAction: true },
    }));
    const results = SecurityPipeline.processBatch(events);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0].rule).toBe("mass_channel_delete");
  });

  it("detects and blocks mass role change raid", () => {
    const now = Date.now();
    const events = Array.from({ length: 10 }, (_, i) => ({
      type: "role_update" as const,
      userId: "nuker_2",
      guildId: "guild_2",
      timestamp: now + i * 100,
      payload: { massAction: true },
    }));
    const results = SecurityPipeline.processBatch(events);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0].rule).toBe("mass_role_update");
  });

  it("detects and blocks mass ban/kick raid", () => {
    const now = Date.now();
    const events: SecurityEvent[] = [
      ...Array.from({ length: 8 }, (_, i) => ({
        type: "guild_ban" as const,
        userId: "nuker_3",
        guildId: "guild_3",
        timestamp: now + i * 100,
        payload: {},
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        type: "guild_kick" as const,
        userId: "nuker_3",
        guildId: "guild_3",
        timestamp: now + (i + 8) * 100,
        payload: {},
      })),
    ];
    const results = SecurityPipeline.processBatch(events);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0].rule).toBe("mass_ban_kick");
  });

  it("detects permission escalation attack", () => {
    const event: SecurityEvent = {
      type: "permission_update",
      userId: "attacker_1",
      guildId: "guild_4",
      timestamp: Date.now(),
      payload: { role: "admin", permissions: "administrator" },
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.rule).toBe("permission_escalation");
  });

  it("detects webhook abuse", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "webhook_create" as const,
      userId: "spammer_1",
      guildId: "guild_5",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter((r) => r.score >= 30);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].rule).toBe("webhook_abuse");
  });

  it("detects bot addition flood", () => {
    const now = Date.now();
    const events = Array.from({ length: 8 }, (_, i) => ({
      type: "guild_member_add" as const,
      userId: "bot_farmer_1",
      guildId: "guild_6",
      timestamp: now + i * 100,
      payload: { bot: true },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter((r) => r.score >= 30);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].rule).toBe("bot_addition");
  });

  it("allows trusted users during raid simulation", () => {
    SecurityPipeline.addTrustedUser("trusted_admin");
    const now = Date.now();
    const events = Array.from({ length: 20 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "trusted_admin",
      guildId: "guild_7",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results.every((r) => r.action === "allow_trusted")).toBe(true);
  });

  it("supports emergency lockdown mode", () => {
    SecurityPipeline.setLockdownMode(true);
    const event: SecurityEvent = {
      type: "message_create",
      userId: "random_user",
      guildId: "guild_8",
      timestamp: Date.now(),
      payload: {},
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.blocked).toBe(true);
    expect(result.action).toBe("lockdown");
    expect(result.score).toBe(100);
    expect(result.rule).toBe("emergency_lockdown");
  });

  it("supports rollback of last decision", () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      type: "channel_create" as const,
      userId: "user_1",
      guildId: "guild_9",
      timestamp: Date.now() + i * 100,
      payload: { massAction: true },
    }));
    SecurityPipeline.processBatch(events);
    const rollback = SecurityPipeline.rollbackLast("user_1", "guild_9");
    expect(rollback).not.toBeNull();
    expect(rollback?.action).toBe("rollback");
  });
});
