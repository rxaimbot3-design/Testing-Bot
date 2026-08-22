import { describe, it, expect, beforeEach, vi } from "vitest";
import { CppNativeEngine } from "../src/CppEngine.js";
import { SecurityPipeline, type SecurityEvent } from "../src/security/Pipeline.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

describe("Regression: Production Bug Fixes", () => {
  describe("CppEngine: Sync metrics accounting", () => {
    beforeEach(() => {
      CppNativeEngine.reset();
      vi.resetModules();
    });

    it("increments totalAuditsProcessed when scanning in sync fallback mode", async () => {
      await CppNativeEngine.initEngine();
      const metricsBefore = CppNativeEngine.getMetrics();
      const beforeCount = metricsBefore.totalAuditsProcessed;

      CppNativeEngine.scanSecurityPacket(1, 1.5);
      const metricsAfter = CppNativeEngine.getMetrics();
      expect(metricsAfter.totalAuditsProcessed).toBeGreaterThan(beforeCount);
    });

    it("reports non-zero throughput after multiple scans", async () => {
      await CppNativeEngine.initEngine();
      for (let i = 0; i < 10; i++) {
        CppNativeEngine.scanSecurityPacket(i, 1.2);
      }
      const metrics = CppNativeEngine.getMetrics();
      expect(metrics.totalAuditsProcessed).toBeGreaterThanOrEqual(10);
      expect(metrics.throughputPerSecond).toBeGreaterThan(0);
    });

    it("resets totalAuditsProcessed to zero after resetMetrics", async () => {
      await CppNativeEngine.initEngine();
      CppNativeEngine.scanSecurityPacket(1, 1.5);
      CppNativeEngine.resetMetrics();
      const metrics = CppNativeEngine.getMetrics();
      expect(metrics.totalAuditsProcessed).toBe(0);
      expect(metrics.throughputPerSecond).toBe(0);
    });
  });

  describe("withTimeout: error propagation", () => {
    it("propagates rejection when wrapped promise rejects before timeout", async () => {
      const { withTimeout } = await import("../src/bot/utils.js");
      const failingPromise = Promise.reject(new Error("original failure"));
      await expect(withTimeout(failingPromise, 5000)).rejects.toThrow("original failure");
    });

    it("rejects with timeout message when wrapped promise takes too long", async () => {
      const { withTimeout } = await import("../src/bot/utils.js");
      const slowPromise = new Promise(() => {});
      await expect(withTimeout(slowPromise, 100, "custom timeout")).rejects.toThrow("custom timeout");
    });

    it("resolves with value when wrapped promise resolves before timeout", async () => {
      const { withTimeout } = await import("../src/bot/utils.js");
      const fastPromise = Promise.resolve("success");
      await expect(withTimeout(fastPromise, 5000)).resolves.toBe("success");
    });
  });

  describe("createZipArchiveBuffer: directory validation", () => {
    beforeEach(() => {
      process.env.ADMIN_SECRET = crypto.randomBytes(32).toString("hex");
    });

    it("throws clear error when baseDir does not exist", async () => {
      const server = await import("../server.js");
      const nonexistentDir = path.join(os.tmpdir(), "zip-test-nonexistent-" + process.pid);
      try {
        server.createZipArchiveBuffer(nonexistentDir);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.message).toContain("does not exist");
      }
    });

    it("throws clear error when baseDir is a file, not a directory", async () => {
      const server = await import("../server.js");
      const tmpFile = path.join(os.tmpdir(), "zip-test-file-" + process.pid + ".txt");
      fs.writeFileSync(tmpFile, "not a directory");
      try {
        server.createZipArchiveBuffer(tmpFile);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.message).toContain("does not exist");
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    });
  });

  describe("TokenVault: decryption failure handling", () => {
    beforeEach(() => {
      vi.resetModules();
      try { fs.unlinkSync(path.join(process.cwd(), "vault_tokens.json")); } catch {}
      try { fs.unlinkSync(path.join(process.cwd(), "vault_salt.txt")); } catch {}
    });

    it("throws normal error on wrong key instead of self-destructing", async () => {
      const key1 = crypto.randomBytes(32).toString("hex");
      process.env.ADMIN_SECRET = key1;
      const { TokenVault } = await import("../src/SecurityFeatures.js");
      TokenVault.store("secret_token", "TEST_KEY");
      // Change master secret to simulate wrong key
      (TokenVault as any).masterSecret = crypto.randomBytes(32).toString("hex");
      expect(() => TokenVault.retrieve("TEST_KEY")).toThrow(/decrypt/i);
    });

    it("does not clear vault on normal decryption error", async () => {
      const key1 = crypto.randomBytes(32).toString("hex");
      process.env.ADMIN_SECRET = key1;
      const { TokenVault } = await import("../src/SecurityFeatures.js");
      TokenVault.store("token_a", "KEY_A");
      TokenVault.store("token_b", "KEY_B");
      // Wrong key should only fail for that specific token, not wipe the whole vault
      (TokenVault as any).masterSecret = crypto.randomBytes(32).toString("hex");
      expect(() => TokenVault.retrieve("KEY_A")).toThrow();
      // Restore correct key - other tokens should still be accessible
      (TokenVault as any).masterSecret = key1;
      expect(TokenVault.retrieve("KEY_B")).toBe("token_b");
    });
  });

  describe("SecurityPipeline: rollback clears quarantine damping", () => {
    beforeEach(() => {
      SecurityPipeline.reset();
    });

    it("clears recentQuarantines when rolling back a quarantine decision", () => {
      const now = Date.now();
      const events: SecurityEvent[] = Array.from({ length: 6 }, (_, i) => ({
        type: "channel_create" as const,
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { massAction: true },
      }));
      SecurityPipeline.processBatch(events);
      SecurityPipeline.processEvent({
        type: "channel_create",
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + 1000,
        payload: { massAction: true },
      });

      const rollback = SecurityPipeline.rollbackLast("nuker_1", "guild_1");
      expect(rollback).not.toBeNull();
      expect(rollback?.action).toBe("rollback");

      // After rollback, quarantine damping should be cleared
      expect((SecurityPipeline as any).recentQuarantines.has("guild_1:nuker_1")).toBe(false);
    });

    it("clears recentQuarantines when rolling back a lockdown decision", () => {
      SecurityPipeline.setLockdownMode(true);
      const result = SecurityPipeline.processEvent({
        type: "message_create",
        userId: "random_user",
        guildId: "guild_1",
        timestamp: Date.now(),
        payload: {},
      });
      expect(result.blocked).toBe(true);
      expect(result.action).toBe("lockdown");

      const rollback = SecurityPipeline.rollbackLast("random_user", "guild_1");
      expect(rollback).not.toBeNull();
      expect(rollback?.action).toBe("rollback");
      // Quarantine should be cleared because lockdown was rolled back
      expect((SecurityPipeline as any).recentQuarantines.has("guild_1:random_user")).toBe(false);
    });

    it("Pipeline: action is derived from adjusted score, not raw score", () => {
      // Raw score from evaluateEvent will be 55 (5 channel_create events with channelCount:5)
      // but after false-positive damping (if recently quarantined), adjustedScore drops to 45
      // The action must reflect the adjusted score, not the raw score
      const events: SecurityEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: "channel_create",
        userId: "damping_user",
        guildId: "guild_damping",
        timestamp: Date.now() + i * 100,
        payload: { channelCount: 5 },
      }));
      // First batch triggers quarantine and populates recentQuarantines
      SecurityPipeline.processBatch(events);
      // Second batch with same pattern but after quarantine should be dampened
      const secondBatch: SecurityEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: "channel_create",
        userId: "damping_user",
        guildId: "guild_damping",
        timestamp: Date.now() + 20000 + i * 100,
        payload: { channelCount: 5 },
      }));
      const results = SecurityPipeline.processBatch(secondBatch);
      const lastResult = results[results.length - 1];
      // If raw score was 55 but damping brings it to 45, action must be "monitor" (not "quarantine")
      expect(lastResult.action).toBe("monitor");
      expect(lastResult.blocked).toBe(false);
      expect(lastResult.score).toBeLessThan(50);
    });

    it("Trusted users are guild-scoped: trusted in A does not imply trusted in B", () => {
      SecurityPipeline.addTrustedUser("cross_user", "guild_A");
      const eventInA: SecurityEvent = {
        type: "role_update",
        userId: "cross_user",
        guildId: "guild_A",
        timestamp: Date.now(),
        payload: { roleCount: 3 },
      };
      const resultInA = SecurityPipeline.processEvent(eventInA);
      expect(resultInA.action).not.toBe("lockdown");

      const eventInB: SecurityEvent = {
        type: "role_update",
        userId: "cross_user",
        guildId: "guild_B",
        timestamp: Date.now(),
        payload: { roleCount: 3 },
      };
      const resultInB = SecurityPipeline.processEvent(eventInB);
      // In guild B, the user is NOT trusted, so quarantine should apply (score 50)
      expect(resultInB.action).toBe("quarantine");
    });

    it("recentQuarantines is guild-scoped: quarantine in A does not dampen B", () => {
      // Trigger quarantine in guild A
      const eventsA: SecurityEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: "role_update",
        userId: "dampen_user",
        guildId: "guild_A",
        timestamp: Date.now() + i * 100,
        payload: { roleCount: 3 },
      }));
      SecurityPipeline.processBatch(eventsA);

      // Same user in guild B should NOT be dampened
      const eventsB: SecurityEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: "role_update",
        userId: "dampen_user",
        guildId: "guild_B",
        timestamp: Date.now() + i * 100,
        payload: { roleCount: 3 },
      }));
      const resultsB = SecurityPipeline.processBatch(eventsB);
      const lastB = resultsB[resultsB.length - 1];
      // Should still be blocked/quarantined, not dampened to monitor
      expect(lastB.action).toBe("quarantine");
      expect(lastB.blocked).toBe(true);
    });
  });
});
