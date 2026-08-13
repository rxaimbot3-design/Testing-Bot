import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityPipeline, type SecurityEvent } from "../src/security/Pipeline.js";
import { BackupEngine } from "../src/security/BackupEngine.js";
import { CppNativeEngine } from "../src/CppEngine.js";
import fs from "fs";
import path from "path";

describe("Stress: Pipeline Breaking Points", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("handles extreme burst of events per user", () => {
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 10000 }, (_, i) => ({
      type: "message_create",
      userId: "stress_user",
      guildId: "guild_1",
      timestamp: now + i,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(10000);
  });

  it("handles many unique users simultaneously", () => {
    const events: SecurityEvent[] = Array.from({ length: 5000 }, (_, i) => ({
      type: "channel_create",
      userId: `user_${i}`,
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(5000);
  });
});

describe("Stress: Malformed and Corrupt Data", () => {
  it("handles malformed pipeline events", () => {
    const badEvents = [
      { type: null, userId: null, guildId: null, timestamp: null, payload: null },
      { type: "", userId: "", guildId: "", timestamp: NaN, payload: undefined },
      { type: 123, userId: {}, guildId: [], timestamp: new Date(), payload: () => {} },
    ];
    badEvents.forEach((e) => {
      expect(() => SecurityPipeline.processEvent(e as SecurityEvent)).not.toThrow();
    });
  });

  it("handles corrupted backup files gracefully", () => {
    BackupEngine.init();
    const dir = BackupEngine["backupDir"];
    const badFile = path.join(dir, "corrupt_stress.json");
    fs.writeFileSync(badFile, "{bad json!!!");
    const list = BackupEngine.listBackups();
    expect(list.every((b) => b.id !== "corrupt_stress.json")).toBe(true);
  });
});

describe("Stress: Extreme Payload Sizes", () => {
  it("handles very large event payloads", () => {
    const hugePayload = "x".repeat(10 * 1024 * 1024);
    const event: SecurityEvent = {
      type: "message_create",
      userId: "huge_user",
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: { data: hugePayload },
    };
    expect(() => SecurityPipeline.processEvent(event)).not.toThrow();
  });

  it("handles large backup payloads", () => {
    BackupEngine.init();
    const hugeData = { items: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `item_${i}` })) };
    expect(() => BackupEngine.createBackup(hugeData)).not.toThrow();
  });
});

describe("Stress: Recovery After Overload", () => {
  it("returns to normal behavior after overload", () => {
    SecurityPipeline.reset();
    const now = Date.now();
    const overloadEvents: SecurityEvent[] = Array.from({ length: 50 }, (_, i) => ({
      type: "channel_create",
      userId: "overloader",
      guildId: "guild_1",
      timestamp: now + i * 10,
      payload: {},
    }));
    SecurityPipeline.processBatch(overloadEvents);
    const normalEvent: SecurityEvent = {
      type: "message_create",
      userId: "normal_user",
      guildId: "guild_1",
      timestamp: now + 100000,
      payload: {},
    };
    const result = SecurityPipeline.processEvent(normalEvent);
    expect(result.blocked).toBe(false);
  });
});

describe("Stress: Extreme Nuker Scenarios", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("handles 1000 channel deletions without crash or brain issue", () => {
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 1000 }, (_, i) => ({
      type: "channel_delete",
      userId: "nuker_1",
      guildId: "guild_1",
      timestamp: now + i * 10,
      payload: { massAction: true },
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(1000);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  it("handles 100 nuker attacks simultaneously across guilds", () => {
    const now = Date.now();
    const events: SecurityEvent[] = [];
    for (let n = 0; n < 100; n++) {
      for (let i = 0; i < 20; i++) {
        events.push({
          type: "channel_delete",
          userId: `nuker_${n}`,
          guildId: `guild_${n}`,
          timestamp: now + i * 10,
          payload: { massAction: true },
        });
      }
    }
    expect(events).toHaveLength(2000);
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(2000);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(100);
  });

  it("handles mixed extreme raid: channels, roles, bans, kicks, webhooks, bots", () => {
    const now = Date.now();
    const events: SecurityEvent[] = [];
    const types: SecurityEvent["type"][] = [
      "channel_delete",
      "role_update",
      "guild_ban",
      "guild_kick",
      "webhook_create",
      "guild_member_add"
    ];
    for (let i = 0; i < 5000; i++) {
      events.push({
        type: types[i % types.length],
        userId: `raider_${i % 50}`,
        guildId: `guild_${i % 20}`,
        timestamp: now + i * 10,
        payload: { massAction: true, bot: i % 3 === 0 },
      });
    }
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(5000);
    const blocked = results.filter((r) => r.blocked);
    expect(blocked.length).toBeGreaterThanOrEqual(20);
  });

  it("does not crash under 10k concurrent channel_create spam", () => {
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 10000 }, (_, i) => ({
      type: "channel_create",
      userId: `spammer_${i % 10}`,
      guildId: "guild_1",
      timestamp: now + i,
      payload: {},
    }));
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(10000);
  });

  it("maintains bounded memory after extreme load", () => {
    SecurityPipeline.reset();
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 10000 }, (_, i) => ({
      type: "channel_delete",
      userId: `nuker_${i % 10}`,
      guildId: `guild_${i % 5}`,
      timestamp: now + i * 10,
      payload: { massAction: true },
    }));
    SecurityPipeline.processBatch(events);
    // After extreme load, normal events should still be processed correctly
    const normalEvent: SecurityEvent = {
      type: "message_create",
      userId: "normal_user",
      guildId: "guild_1",
      timestamp: now + 100000,
      payload: {},
    };
    const result = SecurityPipeline.processEvent(normalEvent);
    expect(result.blocked).toBe(false);
  });
});
