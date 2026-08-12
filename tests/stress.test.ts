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
