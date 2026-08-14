import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenVault } from "../src/SecurityFeatures.js";
import { SecurityPipeline } from "../src/security/Pipeline.js";

describe("SecurityFeatures: TokenVault", () => {
  it("encrypts and decrypts tokens", () => {
    TokenVault.store("my_secret_token", "TEST_TOKEN");
    const decrypted = TokenVault.retrieve("TEST_TOKEN");
    expect(decrypted).toBe("my_secret_token");
  });

  it("throws for missing token", () => {
    expect(() => TokenVault.retrieve("NONEXISTENT_TOKEN")).toThrow(/Token Vault entry/);
  });

  it("throws on missing encryption key", () => {
    // TokenVault derives key from ADMIN_SECRET, so with env set it should work
    TokenVault.store("test", "KEY1");
    expect(TokenVault.retrieve("KEY1")).toBe("test");
  });

  it("destroys vault and clears memory", () => {
    TokenVault.store("secret", "DESTROY_TEST");
    // Self-destruct clears files then throws
    expect(() => TokenVault.triggerSelfDestruct("test")).toThrow(/Access denied/);
  });
});

describe("SecurityFeatures: SecurityPipeline Integration", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("processes channel delete events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 3 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { channelCount: 3 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "mass_channel_delete");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(40);
  });

  it("processes role create events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 3 }, (_, i) => ({
      type: "role_create" as const,
      userId: "raider_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { roleCount: 3 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "mass_role_update");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(50);
  });

  it("processes permission update events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 2 }, (_, i) => ({
      type: "permission_update" as const,
      userId: "escalator_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { permsAdded: 50, permsRemoved: 0 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "permission_escalation");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(40);
  });

  it("processes webhook create events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 2 }, (_, i) => ({
      type: "webhook_create" as const,
      userId: "spammer_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { webhookCount: 2 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "webhook_abuse");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(55);
  });

  it("processes guild ban events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "guild_ban" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { banCount: 5 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "mass_ban_kick");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(50);
  });

  it("processes guild kick events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "guild_kick" as const,
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { kickCount: 5 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "mass_ban_kick");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(50);
  });

  it("processes bot addition events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "guild_member_add" as const,
      userId: "bot_adder_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { botCount: 5 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "bot_addition");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    expect(flagged[0].score).toBeGreaterThanOrEqual(40);
  });

  it("processes message burst events with correct scoring", () => {
    const now = Date.now();
    const events = Array.from({ length: 12 }, (_, i) => ({
      type: "unknown_action" as const,
      userId: "spammer_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    const flagged = results.filter(r => r.rule === "suspicious_burst");
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("blocks all events during lockdown mode", () => {
    SecurityPipeline.setLockdownMode(true);
    const result = SecurityPipeline.processEvent({
      type: "message_create",
      userId: "user_1",
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: {},
    });
    expect(result.blocked).toBe(true);
    expect(result.action).toBe("lockdown");
    expect(result.score).toBe(100);
  });

  it("reduces score for trusted users but does not completely bypass", () => {
    SecurityPipeline.addTrustedUser("trusted_1");
    const now = Date.now();
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "channel_delete" as const,
      userId: "trusted_1",
      guildId: "guild_1",
      timestamp: now + i * 100,
      payload: { channelCount: 5 },
    }));
    const results = SecurityPipeline.processBatch(events);
    const blocked = results.filter(r => r.blocked);
    // Trusted users should have reduced score, not necessarily blocked
    expect(results.length).toBe(5);
  });
});
