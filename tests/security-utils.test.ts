import { describe, it, expect } from "vitest";
import { scanForSecrets, validateInput, hashToken } from "../src/security.js";

describe("Security Utilities", () => {
  describe("scanForSecrets", () => {
    it("should detect GitHub personal access tokens", () => {
      const findings = scanForSecrets("token: ghp_1234567890abcdef1234567890abcdef1234567890");
      expect(findings.length).toBeGreaterThan(0);
    });

    it("should detect Google API keys", () => {
      const findings = scanForSecrets("key: AIzaSy1234567890abcdef1234567890abcdef12345");
      expect(findings.length).toBeGreaterThan(0);
    });

    it("should detect Discord bot tokens", () => {
      const findings = scanForSecrets("token: MTA5ODQ2ODk3MjQ2NjQ2NjY2.abc123.abcdefghijklmnopqrstuvwxyz1234567890");
      expect(findings.length).toBeGreaterThan(0);
    });

    it("should return empty for clean content", () => {
      const findings = scanForSecrets("Hello world, no secrets here!");
      expect(findings.length).toBe(0);
    });
  });

  describe("hashToken", () => {
    it("should hash tokens consistently", () => {
      const h1 = hashToken("my-secret-token");
      const h2 = hashToken("my-secret-token");
      expect(h1).toBe(h2);
    });

    it("should produce different hashes for different tokens", () => {
      const h1 = hashToken("token1");
      const h2 = hashToken("token2");
      expect(h1).not.toBe(h2);
    });

    it("should handle empty string", () => {
      const h = hashToken("");
      expect(h).toBeDefined();
      expect(h.length).toBeGreaterThan(0);
    });
  });

  describe("validateInput", () => {
    it("should validate required fields", () => {
      const result = validateInput(
        { name: { required: true, type: "string" } },
        { name: "" }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate string type", () => {
      const result = validateInput(
        { count: { required: true, type: "string" } },
        { count: 123 }
      );
      expect(result.valid).toBe(false);
    });

    it("should validate minLength", () => {
      const result = validateInput(
        { name: { required: true, minLength: 3 } },
        { name: "ab" }
      );
      expect(result.valid).toBe(false);
    });

    it("should validate maxLength", () => {
      const result = validateInput(
        { name: { required: true, maxLength: 5 } },
        { name: "abcdef" }
      );
      expect(result.valid).toBe(false);
    });

    it("should pass valid input", () => {
      const result = validateInput(
        { name: { required: true, type: "string", minLength: 2, maxLength: 10 } },
        { name: "test" }
      );
      expect(result.valid).toBe(true);
    });
  });
});
