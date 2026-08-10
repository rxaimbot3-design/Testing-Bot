import { describe, it, expect } from "vitest";
import { scanForSecrets, validateInput } from "../src/security.js";
import crypto from "crypto";

describe("Security: Secrets Scanner", () => {
  it("detects GitHub personal access tokens", () => {
    const content = "Here is a token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects Gemini API keys", () => {
    const content = "key=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects Discord bot tokens", () => {
    const content = "token: MTIzNDU2Nzg5MDEyMzQ1Njc4.Gc1234.abcdefghijklmnopqrstuvwxyz1234567890";
    const findings = scanForSecrets(content);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for clean content", () => {
    const content = "Hello world, no secrets here!";
    const findings = scanForSecrets(content);
    expect(findings).toHaveLength(0);
  });
});

describe("Security: Input Validation", () => {
  it("rejects missing required fields", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 3, maxLength: 20 } }, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username is required");
  });

  it("rejects too-short strings", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 3, maxLength: 20 } }, { username: "ab" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username must be at least 3 characters");
  });

  it("rejects too-long strings", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 3, maxLength: 5 } }, { username: "abcdef" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("username must be at most 5 characters");
  });

  it("accepts valid input", () => {
    const result = validateInput({ username: { required: true, type: "string", minLength: 3, maxLength: 20 } }, { username: "admin" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Security: Token Hashing", () => {
  it("produces consistent SHA-256 hashes", () => {
    const token = "session_" + crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});
