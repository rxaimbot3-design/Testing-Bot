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
      timestamp: now + i * 200,
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
    expect(SecurityPipeline.escalate({ blocked: true, action: "block", reason: "high", score: 95 })).toBe("lockdown");
    expect(SecurityPipeline.escalate({ blocked: true, action: "block", reason: "high", score: 75 })).toBe("ban");
    expect(SecurityPipeline.escalate({ blocked: true, action: "block", reason: "high", score: 55 })).toBe("quarantine");
    expect(SecurityPipeline.escalate({ blocked: false, action: "monitor", reason: "low", score: 20 })).toBe("monitor");
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
      userId: "u1",
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
      userId: "u2",
      guildId: "g2",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results.every((r) => !r.blocked)).toBe(true);
  });
});
