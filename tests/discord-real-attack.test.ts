import { describe, it, expect, beforeEach } from "vitest";
import { SecurityPipeline } from "../src/security/Pipeline.js";

describe("Real Discord Attack Simulations", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("detects classic nuke: mass channel delete + role delete + ban", () => {
    const now = Date.now();
    const events: any[] = [];
    
    // Phase 1: Delete 5 channels rapidly
    for (let i = 0; i < 5; i++) {
      events.push({
        type: "channel_delete",
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + i * 200,
        payload: { channelCount: 5 }
      });
    }
    
    // Phase 2: Delete 5 roles rapidly
    for (let i = 0; i < 5; i++) {
      events.push({
        type: "role_update",
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + 1000 + i * 200,
        payload: { roleCount: 5 }
      });
    }
    
    // Phase 3: Mass ban
    for (let i = 0; i < 5; i++) {
      events.push({
        type: "guild_ban",
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + 2000 + i * 200,
        payload: { banCount: 5 }
      });
    }
    
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule !== "none");
    expect(flagged.length).toBeGreaterThanOrEqual(3);
  });

  it("detects webhook spam for mass DM/mention attack", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "webhook_create" as const,
      userId: "spammer_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { webhookCount: 5 }
    }));
    
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "webhook_abuse");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("detects permission escalation for admin takeover", () => {
    const now = Date.now();
    const events = Array.from({ length: 3 }, (_, i) => ({
      type: "permission_update" as const,
      userId: "escalator_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { permsAdded: 50, permsRemoved: 0 }
    }));
    
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "permission_escalation");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("detects bot farm addition for raid amplification", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "guild_member_add" as const,
      userId: "bot_adder_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { botCount: 5 }
    }));
    
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "bot_addition");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("detects spam burst from compromised account", () => {
    const now = Date.now();
    const events = Array.from({ length: 15 }, (_, i) => ({
      type: "message_create" as const,
      userId: "compromised_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: {}
    }));
    
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "suspicious_burst");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("handles slow-and-low attack across longer window", () => {
    const now = Date.now();
    // 1 action every 3 seconds for 30 seconds = 10 actions
    // With 3s intervals, 5 actions take 12s, which exceeds the 10s window
    const events = Array.from({ length: 10 }, (_, i) => ({
      type: "channel_create" as const,
      userId: "slow_nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 3000,
      payload: {}
    }));
    
    const results = SecurityPipeline.processBatch(events);
    // Should not trigger mass_channel_create (needs 5 in 10s, but 5 actions take 12s)
    const massCreate = results.filter(r => r.rule === "mass_channel_create");
    expect(massCreate.length).toBe(0);
  });

  it("distinguishes between legitimate bulk actions and attacks", () => {
    const now = Date.now();
    // Trusted users bypass lockdown but do not get reduced scores for normal events
    SecurityPipeline.setLockdownMode(true);
    SecurityPipeline.addTrustedUser("admin_1");
    
    const trustedResult = SecurityPipeline.processEvent({
      type: "channel_create",
      userId: "admin_1",
      guildId: "guild_1",
      timestamp: now,
      payload: {}
    });
    
    const untrustedResult = SecurityPipeline.processEvent({
      type: "channel_create",
      userId: "stranger_1",
      guildId: "guild_1",
      timestamp: now,
      payload: {}
    });
    
    // Trusted user bypasses lockdown, untrusted is blocked
    expect(trustedResult.blocked).toBe(false);
    expect(untrustedResult.blocked).toBe(true);
  });

  it("detects extreme coordinated attack with high scores", () => {
    const now = Date.now();
    const events: any[] = [];
    
    // 10 channel deletes
    for (let i = 0; i < 10; i++) {
      events.push({
        type: "channel_delete",
        userId: "super_nuker",
        guildId: "guild_1",
        timestamp: now + i * 50,
        payload: { channelCount: 10 }
      });
    }
    
    // 10 role deletes
    for (let i = 0; i < 10; i++) {
      events.push({
        type: "role_update",
        userId: "super_nuker",
        guildId: "guild_1",
        timestamp: now + 500 + i * 50,
        payload: { roleCount: 10 }
      });
    }
    
    // 10 bans
    for (let i = 0; i < 10; i++) {
      events.push({
        type: "guild_ban",
        userId: "super_nuker",
        guildId: "guild_1",
        timestamp: now + 1000 + i * 50,
        payload: { banCount: 10 }
      });
    }
    
    const results = SecurityPipeline.processBatch(events);
    const maxScore = Math.max(...results.map(r => r.score));
    expect(maxScore).toBeGreaterThanOrEqual(50);
  });
});
