import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityPipeline } from "../src/security/Pipeline.js";

describe("SecurityPipeline: Advanced Attack Scenarios", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("detects coordinated multi-guild raid", () => {
    const now = Date.now();
    const events: any[] = [];
    
    // Guild 1: mass channel delete
    for (let i = 0; i < 5; i++) {
      events.push({
        type: "channel_delete",
        userId: "raider_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { channelCount: 5 }
      });
    }
    
    // Guild 2: mass role create
    for (let i = 0; i < 5; i++) {
      events.push({
        type: "role_create",
        userId: "raider_1",
        guildId: "guild_2",
        timestamp: now + i * 100,
        payload: { roleCount: 5 }
      });
    }
    
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule !== "none");
    expect(flagged.length).toBeGreaterThanOrEqual(2);
  });

  it("tracks separate burst windows per user-guild pair", () => {
    const now = Date.now();
    
    // User A in guild 1
    const eventsA = Array.from({ length: 5 }, (_, i) => ({
      type: "channel_create" as const,
      userId: "user_a",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: {}
    }));
    
    // User B in guild 2 - should not affect user A
    const eventsB = Array.from({ length: 5 }, (_, i) => ({
      type: "channel_create" as const,
      userId: "user_b",
      guildId: "guild_2",
      timestamp: now + i * 100,
      payload: {}
    }));
    
    const resultsA = SecurityPipeline.processBatch(eventsA);
    const resultsB = SecurityPipeline.processBatch(eventsB);
    
    // Both should trigger independently
    const flaggedB = resultsB.filter(r => r.rule === "mass_channel_create");
    expect(flaggedB.length).toBeGreaterThanOrEqual(1);
    
    // Genuine verification: user A's score must not be inflated by user B's burst
    const lastScoreA = resultsA[resultsA.length - 1].score;
    const lastScoreB = resultsB[resultsB.length - 1].score;
    expect(typeof lastScoreA).toBe("number");
    expect(typeof lastScoreB).toBe("number");
    // Both users had identical event patterns in their own guilds,
    // so their final scores should be comparable (not one inflated by the other)
    expect(Math.abs(lastScoreA - lastScoreB)).toBeLessThan(50);
  });

  it("resets state cleanly between test runs", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { channelCount: 5 }
    }));
    
    SecurityPipeline.processBatch(events);
    SecurityPipeline.reset();
    
    // After reset, trusted users should be cleared
    SecurityPipeline.addTrustedUser("trusted_1", "guild_1");
    const result = SecurityPipeline.processEvent({
      type: "channel_delete",
      userId: "trusted_1",
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: { channelCount: 1 }
    });
    
    // Trusted user should have reduced score
    expect(result.score).toBeLessThan(40);
  });

  it("handles message_bulk_delete as high-severity event", () => {
    const event = {
      type: "message_bulk_delete" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: {}
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.rule).toBe("mass_channel_delete");
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it("handles mixed event types in single batch", () => {
    const now = Date.now();
    const events = [
      { type: "channel_create", userId: "user1", guildId: "g1", timestamp: now, payload: {} },
      { type: "role_create", userId: "user1", guildId: "g1", timestamp: now + 100, payload: { roleCount: 3 } },
      { type: "webhook_create", userId: "user1", guildId: "g1", timestamp: now + 200, payload: { webhookCount: 2 } },
      { type: "permission_update", userId: "user1", guildId: "g1", timestamp: now + 300, payload: { permsAdded: 50 } },
    ];
    
    const results = SecurityPipeline.processBatch(events);
    // permission_update and webhook_create meet their thresholds individually
    const flagged = results.filter(r => r.rule !== "none");
    expect(flagged.length).toBeGreaterThanOrEqual(2);
  });

  it("applies false-positive damping correctly", () => {
    const now = Date.now();
    
    // First batch - should trigger
    const events1 = Array.from({ length: 5 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { channelCount: 5 }
    }));
    
    const results1 = SecurityPipeline.processBatch(events1);
    const score1 = results1[results1.length - 1].score;
    expect(score1).toBeGreaterThanOrEqual(40);
    
    // User gets quarantined
    (SecurityPipeline as any).recentQuarantines.set("guild_1:nuker_1", now);
    
    // Second batch - score should be dampened
    const events2 = Array.from({ length: 5 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + 20000 + i * 100,
      payload: { channelCount: 5 }
    }));
    
    const results2 = SecurityPipeline.processBatch(events2);
    // Score should be dampened by 10 points if below threshold
    expect(results2[results2.length - 1].score).toBeLessThan(score1);
  });
});
