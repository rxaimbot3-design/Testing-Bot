import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanForSecrets, hashToken, validateInput } from "../src/security.js";
import { SecurityPipeline, type SecurityEvent } from "../src/security/Pipeline.js";
import { BackupEngine } from "../src/security/BackupEngine.js";
import { CppNativeEngine } from "../src/CppEngine.js";
import crypto from "crypto";

describe("Regression: Known Bug Fixes", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
    BackupEngine.init();
  });

  it("does not crash on empty secret scan input", () => {
    expect(() => scanForSecrets("")).not.toThrow();
    expect(() => scanForSecrets(null as any)).not.toThrow();
    expect(() => scanForSecrets(undefined as any)).not.toThrow();
  });

  it("does not crash on empty hash input", () => {
    expect(() => hashToken("")).not.toThrow();
    expect(() => hashToken(null as any)).not.toThrow();
  });

  it("does not crash on empty validation input", () => {
    expect(() => validateInput({}, null)).not.toThrow();
    expect(() => validateInput({}, undefined)).not.toThrow();
  });

  it("pipeline handles duplicate events from same user without double-penalizing", () => {
    const now = Date.now();
    const events: SecurityEvent[] = [
      { type: "channel_create", userId: "u1", guildId: "g1", timestamp: now, payload: {} },
      { type: "channel_create", userId: "u1", guildId: "g1", timestamp: now + 100, payload: {} },
    ];
    const results = SecurityPipeline.processBatch(events);
    expect(results).toHaveLength(2);
    expect(results.every((r) => typeof r.score === "number")).toBe(true);
  });

  it("backup engine handles special characters in labels", () => {
    const meta = BackupEngine.createBackup({ test: true }, "backup/with:special?chars");
    expect(meta.label).toBe("backup/with:special?chars");
    const restored = BackupEngine.restoreBackup(meta.id);
    expect(restored).toEqual({ test: true });
  });

  it("cpp engine handles NaN riskWeight gracefully", () => {
    expect(() => CppNativeEngine.scanSecurityPacket(1, NaN)).not.toThrow();
  });

  it("cpp engine handles Infinity riskWeight gracefully", () => {
    expect(() => CppNativeEngine.scanSecurityPacket(1, Infinity)).not.toThrow();
  });

  it("scanForSecrets does not enter infinite loop on malformed regex input", () => {
    const content = "ghp_invalid_token_format_here";
    const findings = scanForSecrets(content);
    expect(Array.isArray(findings)).toBe(true);
  });
});

describe("Regression: Edge Cases That Caused Previous Failures", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
    BackupEngine.init();
  });

  it("validateInput handles empty schema", () => {
    const result = validateInput({}, { any: "value" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("backup engine handles restore without verification flag", () => {
    const meta = BackupEngine.createBackup({ noVerify: true });
    const restored = BackupEngine.restoreBackup(meta.id, false);
    expect(restored).toEqual({ noVerify: true });
  });

  it("security pipeline handles same-timestamp events", () => {
    const now = Date.now();
    const events: SecurityEvent[] = Array.from({ length: 10 }, () => ({
      type: "message_create",
      userId: "u1",
      guildId: "g1",
      timestamp: now,
      payload: {},
    }));
    expect(() => SecurityPipeline.processBatch(events)).not.toThrow();
  });

  it("hashToken handles tokens with trailing newlines", () => {
    const hash1 = hashToken("token\n");
    const hash2 = hashToken("token");
    expect(hash1).not.toBe(hash2);
  });
});

describe("Regression: Backward Compatibility", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
    BackupEngine.init();
  });

  it("SecurityPipeline.processEvent still returns the expected shape", () => {
    const result = SecurityPipeline.processEvent({
      type: "message_create",
      userId: "u1",
      guildId: "g1",
      timestamp: Date.now(),
      payload: {},
    });
    expect(result).toHaveProperty("blocked");
    expect(result).toHaveProperty("action");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("score");
  });

  it("BackupEngine.listBackups still returns an array", () => {
    const list = BackupEngine.listBackups();
    expect(Array.isArray(list)).toBe(true);
  });

  it("CppNativeEngine.scanSecurityPacket still returns expected shape", () => {
    const result = CppNativeEngine.scanSecurityPacket(1, 1);
    expect(result).toHaveProperty("passed");
    expect(result).toHaveProperty("latencyMicros");
    expect(result).toHaveProperty("score");
  });
});
