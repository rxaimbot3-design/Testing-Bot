import crypto from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BackupEngine, type BackupMetadata } from "../src/security/BackupEngine.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("BackupEngine: Initialization and Configuration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    BackupEngine.init();
    BackupEngine.setRetentionDays(30);
  });

  it("creates backup directory on init", () => {
    const customDir = path.join(os.tmpdir(), "test-backups-" + Date.now());
    BackupEngine.init();
    // After init, the default dir is created; we test via createBackup
    const meta = BackupEngine.createBackup({ test: true }, "init-test");
    expect(meta.id).toBeDefined();
    expect(fs.existsSync(path.join(BackupEngine["backupDir"], `${meta.id}.json`))).toBe(true);
  });

  it("accepts encryption key on init", () => {
    const key = crypto.randomBytes(32).toString("hex");
    BackupEngine.init(key);
    const meta = BackupEngine.createBackup({ secret: true });
    expect(meta.encrypted).toBe(true);
  });
});

describe("BackupEngine: Backup Creation", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("creates a backup with metadata", () => {
    const data = { channels: [{ id: "1", name: "general" }], roles: [{ id: "2", name: "admin" }] };
    const meta = BackupEngine.createBackup(data, "daily");
    expect(meta.id).toBeDefined();
    expect(meta.version).toBeGreaterThanOrEqual(1);
    expect(meta.encrypted).toBe(false);
    expect(meta.checksum).toHaveLength(64);
    expect(meta.label).toBe("daily");
  });

  it("assigns incrementing versions", () => {
    const meta1 = BackupEngine.createBackup({ v: 1 });
    const meta2 = BackupEngine.createBackup({ v: 2 });
    expect(meta2.version).toBeGreaterThan(meta1.version);
  });

  it("writes backup file to disk", () => {
    const meta = BackupEngine.createBackup({ sample: true });
    const filePath = path.join(BackupEngine["backupDir"], `${meta.id}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    expect(raw.id).toBe(meta.id);
  });
});

describe("BackupEngine: Incremental Backup", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("creates an incremental backup linked to base", () => {
    const base = BackupEngine.createBackup({ base: true });
    const incr = BackupEngine.createIncrementalBackup(base.id, { added: "channel-xyz" });
    expect(incr).not.toBeNull();
    expect(incr!.baseId).toBe(base.id);
    expect(incr!.version).toBe(base.version + 1);
  });

  it("returns null for non-existent base backup", () => {
    const result = BackupEngine.createIncrementalBackup("nonexistent_backup_id", {});
    expect(result).toBeNull();
  });
});

describe("BackupEngine: Integrity Verification", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("verifies an intact backup", () => {
    const meta = BackupEngine.createBackup({ verify: true });
    expect(BackupEngine.verifyBackup(meta.id)).toBe(true);
  });

  it("reports false for corrupted backup data", () => {
    const meta = BackupEngine.createBackup({ good: true });
    const filePath = path.join(BackupEngine["backupDir"], `${meta.id}.json`);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    parsed.checksum = "bad_checksum";
    fs.writeFileSync(filePath, JSON.stringify(parsed));
    expect(BackupEngine.verifyBackup(meta.id)).toBe(false);
  });

  it("reports false for missing backup", () => {
    expect(BackupEngine.verifyBackup("missing_backup")).toBe(false);
  });
});

describe("BackupEngine: Versioned Backups", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("lists backups in reverse chronological order", () => {
    BackupEngine.createBackup({ order: 1 });
    BackupEngine.createBackup({ order: 2 });
    BackupEngine.createBackup({ order: 3 });
    const list = BackupEngine.listBackups();
    expect(list).toHaveLength(3);
    expect(list[0].timestamp >= list[1].timestamp).toBe(true);
  });

  it("deletes backups correctly", () => {
    const meta = BackupEngine.createBackup({ delete: true });
    expect(BackupEngine.deleteBackup(meta.id)).toBe(true);
    expect(BackupEngine.deleteBackup(meta.id)).toBe(false);
  });
});

describe("BackupEngine: Selective and Full Restore", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("restores full backup data", () => {
    const original = { channels: [{ id: "1", name: "general" }], roles: [{ id: "2", name: "admin" }] };
    const meta = BackupEngine.createBackup(original);
    const restored = BackupEngine.restoreBackup(meta.id);
    expect(restored).toEqual(original);
  });

  it("throws for missing backup on restore", () => {
    expect(() => BackupEngine.restoreBackup("nonexistent")).toThrow("Backup not found");
  });

  it("testRestore returns success for valid backup", () => {
    const meta = BackupEngine.createBackup({ test: "restore" });
    const result = BackupEngine.testRestore(meta.id);
    expect(result.success).toBe(true);
    expect(result.message).toContain(meta.id);
  });

  it("testRestore returns failure for invalid backup", () => {
    const result = BackupEngine.testRestore("nonexistent");
    expect(result.success).toBe(false);
  });
});

describe("BackupEngine: Encryption and Decryption", () => {
  it("encrypts and decrypts data correctly", () => {
    const key = crypto.randomBytes(32).toString("hex");
    BackupEngine.init(key);
    const original = { secret: "top-secret-data", tokens: ["a", "b", "c"] };
    const meta = BackupEngine.createBackup(original);
    expect(meta.encrypted).toBe(true);
    const restored = BackupEngine.restoreBackup(meta.id);
    expect(restored).toEqual(original);
  });

  it("throws on decryption with wrong key", () => {
    const key1 = crypto.randomBytes(32).toString("hex");
    const key2 = crypto.randomBytes(32).toString("hex");
    BackupEngine.init(key1);
    const meta = BackupEngine.createBackup({ secret: true });
    BackupEngine.init(key2);
    expect(() => BackupEngine.restoreBackup(meta.id)).toThrow("Decryption failed");
  });

  it("stores backups unencrypted when no key is provided", () => {
    BackupEngine.init();
    const meta = BackupEngine.createBackup({ plain: true });
    expect(meta.encrypted).toBe(false);
    const restored = BackupEngine.restoreBackup(meta.id);
    expect(restored).toEqual({ plain: true });
  });
});

describe("BackupEngine: Retention Policy", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("enforces retention by removing old backups", () => {
    BackupEngine.setRetentionDays(0);
    const meta = BackupEngine.createBackup({ old: true });
    // With 0-day retention, the newly created backup should be immediately removed
    const list = BackupEngine.listBackups();
    expect(list.find((b) => b.id === meta.id)).toBeUndefined();
  });

  it("keeps recent backups within retention window", () => {
    BackupEngine.setRetentionDays(30);
    const meta = BackupEngine.createBackup({ recent: true });
    const list = BackupEngine.listBackups();
    expect(list.find((b) => b.id === meta.id)).toBeDefined();
  });
});

describe("BackupEngine: Corrupted Data Handling", () => {
  beforeEach(() => {
    BackupEngine.init();
  });

  it("skips corrupted files when listing backups", () => {
    const dir = BackupEngine["backupDir"];
    fs.writeFileSync(path.join(dir, "corrupted.json"), "not json{{{");
    const meta = BackupEngine.createBackup({ good: true });
    const list = BackupEngine.listBackups();
    expect(list.find((b) => b.id === meta.id)).toBeDefined();
    expect(list.every((b) => b.id !== "corrupted.json")).toBe(true);
  });

  it("cleanupCorrupted removes unreadable files", () => {
    const dir = BackupEngine["backupDir"];
    fs.writeFileSync(path.join(dir, "bad.json"), "{ invalid");
    const removed = BackupEngine.cleanupCorrupted();
    expect(removed).toContain("bad.json");
  });
});
