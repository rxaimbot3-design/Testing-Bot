import { describe, it, expect, vi } from "vitest";
import { scanForSecrets, hashToken, validateInput, runBackupIntegrityTest } from "../src/security.js";
import crypto from "crypto";

describe("Security: Token Hashing Consistency", () => {
  it("produces consistent SHA-256 hashes for identical tokens", () => {
    const token = "test_token_" + crypto.randomBytes(32).toString("hex");
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("produces different hashes for different tokens", () => {
    const hash1 = hashToken("token_a");
    const hash2 = hashToken("token_b");
    expect(hash1).not.toBe(hash2);
  });

  it("produces valid hex output", () => {
    const hash = hashToken("any_token_value");
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it("handles empty string hashing", () => {
    const hash = hashToken("");
    expect(hash).toHaveLength(64);
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("handles unicode tokens", () => {
    const token = "tōkēn_日本語_🔒";
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
  });
});

describe("Security: Secret Pattern Detection Edge Cases", () => {
  it("detects GitHub tokens with mixed case", () => {
    const content = "token: ghp_AbCdEf1234567890ABCDEF1234567890AB12";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects obfuscated Discord tokens with Bot prefix", () => {
    const content = "Bot MTIzNDU2Nzg5MDEyMzQ1Njc4.Gc1234.abcdefghijklmnopqrstuvwxyz1234567890";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects partial token leaks in longer strings", () => {
    const content = "Here is a ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 embedded in text";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects Slack tokens", () => {
    const content = "xoxb-1234567890-1234567890-ABCDEFGHIJabcdefghi";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects Stripe live keys", () => {
    const content = "sk_live_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("does not produce false positives on similar patterns", () => {
    const content = "ghp_short ghp_123 ghp_too_short ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789AB";
    const findings = scanForSecrets(content);
    expect(findings.length).toBe(1);
  });

  it("returns empty for content with no secrets", () => {
    const content = "Hello world, no secrets here! Just normal text.";
    const findings = scanForSecrets(content);
    expect(findings).toHaveLength(0);
  });

  it("handles empty string input", () => {
    const findings = scanForSecrets("");
    expect(findings).toHaveLength(0);
  });

  it("handles null-like inputs gracefully", () => {
    expect(scanForSecrets(null as any)).toHaveLength(0);
    expect(scanForSecrets(undefined as any)).toHaveLength(0);
  });
});

describe("Security: Input Validation Boundaries", () => {
  it("rejects non-string values when type is string", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 20 } }, { username: 12345 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username must be a string");
  });

  it("rejects exactly-at-minimum boundary violation", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 3, maxLength: 20 } }, { username: "ab" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username must be at least 3 characters");
  });

  it("accepts exactly-at-minimum boundary", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 3, maxLength: 20 } }, { username: "abc" });
    expect(result.valid).toBe(true);
  });

  it("rejects exactly-at-maximum boundary violation", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 5 } }, { username: "abcdef" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username must be at most 5 characters");
  });

  it("accepts exactly-at-maximum boundary", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 5 } }, { username: "abcde" });
    expect(result.valid).toBe(true);
  });

  it("rejects whitespace-only as missing required", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 20 } }, { username: "   " });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username is required");
  });

  it("rejects null as missing required", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 20 } }, { username: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username is required");
  });

  it("rejects undefined as missing required", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 20 } }, { username: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username is required");
  });

  it("validates multiple fields and returns all errors", () => {
    const result = validateInput(
      { username: { required: true, type: "string", minLength: 3, maxLength: 20 }, email: { required: true, type: "string" } },
      { username: "ab" }
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username must be at least 3 characters");
    expect(result.errors).toContain("email is required");
  });

  it("skips optional fields that are missing", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 1, maxLength: 20 }, bio: { type: "string" } }, { username: "admin" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Security: Hash Collision Resistance", () => {
  it("produces unique hashes for distinct inputs", () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      hashes.add(hashToken(`token_${i}_${crypto.randomBytes(16).toString("hex")}`));
    }
    expect(hashes.size).toBe(1000);
  });

  it("has no collisions for sequential inputs", () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      hashes.add(hashToken(`seq_${i}`));
    }
    expect(hashes.size).toBe(10000);
  });

  it("does not leak prefix information", () => {
    const hash1 = hashToken("password123");
    const hash2 = hashToken("password124");
    expect(hash1.substring(0, 10)).not.toBe(hash2.substring(0, 10));
  });
});

describe("Security: Timing-Safe Comparison", () => {
  it("matches equal secrets using timingSafeEqual", () => {
    const secret = "admin_secret_key_1234567890";
    const input = "admin_secret_key_1234567890";
    const isEqual = crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(input));
    expect(isEqual).toBe(true);
  });

  it("rejects unequal secrets using timingSafeEqual", () => {
    const secret = "admin_secret_key_1234567890";
    const input = "admin_secret_key_123456789X";
    const isEqual = crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(input));
    expect(isEqual).toBe(false);
  });

  it("throws for buffers of different lengths", () => {
    const secret = "short";
    const input = "much_longer_input_value";
    expect(() => {
      crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(input));
    }).toThrow();
  });

  it("validates admin secret length before comparison", () => {
    const validSecret = "a".repeat(32);
    const input = "a".repeat(32);
    expect(input.length).toBe(validSecret.length);
    expect(crypto.timingSafeEqual(Buffer.from(input), Buffer.from(validSecret))).toBe(true);
  });
});

describe("Security: Backup Integrity Test", () => {
  it("runs backup integrity test successfully", async () => {
    const result = await runBackupIntegrityTest();
    expect(result.passed).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});
