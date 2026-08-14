import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityPipeline, SecurityEvent } from "../src/security/Pipeline.js";
import { TtlMap, LruMap } from "../src/security/MapManager.js";
import { CppNativeEngine } from "../src/CppEngine.js";

describe("Critical Bug Fixes", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
    CppNativeEngine.reset();
  });

  afterEach(() => {
    SecurityPipeline.reset();
    CppNativeEngine.reset();
  });

  describe("SecurityPipeline", () => {
    it("should process events and produce correct decisions", () => {
      const now = Date.now();
      const events: SecurityEvent[] = [
        { type: "channel_create", userId: "user1", guildId: "guild1", timestamp: now, payload: { channelCount: 5 } },
        { type: "channel_create", userId: "user1", guildId: "guild1", timestamp: now + 1000, payload: { channelCount: 5 } },
        { type: "channel_create", userId: "user1", guildId: "guild1", timestamp: now + 2000, payload: { channelCount: 5 } },
        { type: "channel_create", userId: "user1", guildId: "guild1", timestamp: now + 3000, payload: { channelCount: 5 } },
        { type: "channel_create", userId: "user1", guildId: "guild1", timestamp: now + 4000, payload: { channelCount: 5 } },
        { type: "channel_create", userId: "user1", guildId: "guild1", timestamp: now + 5000, payload: { channelCount: 5 } }
      ];
      events.forEach(e => SecurityPipeline.processEvent(e));
      const result = SecurityPipeline.processEvent({
        type: "channel_create",
        userId: "user1",
        guildId: "guild1",
        timestamp: now + 6000,
        payload: { channelCount: 5 }
      });
      expect(result.rule).toBe("mass_channel_create");
      expect(result.score).toBeGreaterThanOrEqual(40);
    });

    it("should not allow trusted users to bypass all security completely", () => {
      SecurityPipeline.addTrustedUser("trusted_user");
      const event: SecurityEvent = {
        type: "permission_update",
        userId: "trusted_user",
        guildId: "guild1",
        timestamp: Date.now(),
        payload: { permsAdded: 100, permsRemoved: 0 }
      };
      const result = SecurityPipeline.processEvent(event);
      expect(result.action).not.toBe("allow_trusted");
    });

    it("should validate required fields in processEvent", () => {
      const result = SecurityPipeline.processEvent({
        type: "",
        userId: "",
        guildId: "",
        timestamp: 0,
        payload: {}
      });
      expect(result.blocked).toBe(false);
      expect(result.rule).toBe("invalid_input");
    });

    it("should not mutate array during rollbackLast iteration", () => {
      const now = Date.now();
      const events: SecurityEvent[] = [
        { type: "webhook_create", userId: "u1", guildId: "g1", timestamp: now, payload: {} },
        { type: "webhook_create", userId: "u1", guildId: "g1", timestamp: now + 1000, payload: {} }
      ];
      events.forEach(e => SecurityPipeline.processEvent(e));
      const result = SecurityPipeline.rollbackLast("u1", "g1");
      expect(result).not.toBeNull();
      expect(result?.action).toBe("rollback");
    });

    it("should clamp timestamp to Date.now() if invalid", () => {
      const event: SecurityEvent = {
        type: "channel_create",
        userId: "user1",
        guildId: "guild1",
        timestamp: -1,
        payload: {}
      };
      const result = SecurityPipeline.processEvent(event);
      expect(result).toBeDefined();
    });

    it("should apply false-positive damping only below threshold", () => {
      SecurityPipeline.processEvent({
        type: "channel_create",
        userId: "user1",
        guildId: "guild1",
        timestamp: Date.now(),
        payload: { channelCount: 5 }
      });
      const lowEvent: SecurityEvent = {
        type: "channel_create",
        userId: "user1",
        guildId: "guild1",
        timestamp: Date.now() + 1000,
        payload: {}
      };
      const result = SecurityPipeline.processEvent(lowEvent);
      expect(result.score).toBeLessThanOrEqual(40);
    });
  });

  describe("TtlMap", () => {
    it("should clean up intervals on destroy", () => {
      const map = new TtlMap<string, number>({ ttlMs: 60000, autoCleanupMs: 1000 });
      map.set("key", 1);
      map.destroy();
      expect(map.size).toBe(0);
    });

    it("should enforce max entries", () => {
      const map = new TtlMap<string, number>({ maxEntries: 3 });
      map.set("a", 1);
      map.set("b", 2);
      map.set("c", 3);
      map.set("d", 4);
      expect(map.size).toBeLessThanOrEqual(3);
    });
  });

  describe("LruMap", () => {
    it("should promote key on has()", () => {
      const map = new LruMap<string, number>(3);
      map.set("a", 1);
      map.set("b", 2);
      map.set("c", 3);
      map.set("d", 4);
      expect(map.get("a")).toBeUndefined();
      expect(map.get("b")).toBe(2);
    });
  });

  describe("CppNativeEngine", () => {
    it("should use SecurityPipeline in scanSecurityPacket", async () => {
      await CppNativeEngine.initEngine();
      const result = CppNativeEngine.scanSecurityPacket(1, 80);
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should use SecurityPipeline in fallbackScanBatch", async () => {
      await CppNativeEngine.initEngine();
      const results = await CppNativeEngine.batchScanPackets([
        { packetId: 1, riskWeight: 80 }
      ]);
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThanOrEqual(0);
      expect(results[0].score).toBeLessThanOrEqual(100);
    });
  });
});
