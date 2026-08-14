import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter } from "../src/SecurityFeatures.js";
import { SecurityPipeline } from "../src/security/Pipeline.js";

describe("SecurityFeatures: RateLimiter", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("allows requests under limit", () => {
    for (let i = 0; i < 4; i++) {
      expect(RateLimiter.check("user_1")).toBe(false);
    }
  });

  it("blocks requests over limit", () => {
    for (let i = 0; i < 5; i++) {
      RateLimiter.check("user_1");
    }
    expect(RateLimiter.check("user_1")).toBe(true);
  });

  it("tracks separate limits per key", () => {
    for (let i = 0; i < 5; i++) {
      RateLimiter.check("user_1");
    }
    expect(RateLimiter.check("user_1")).toBe(true);
    expect(RateLimiter.check("user_2")).toBe(false);
  });
});

describe("SecurityFeatures: SecurityPipeline Edge Cases", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  it("handles empty batch without errors", () => {
    const results = SecurityPipeline.processBatch([]);
    expect(results).toEqual([]);
  });

  it("handles events with missing payload", () => {
    const event = {
      type: "message_create" as const,
      userId: "user_1",
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: undefined
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("rule");
    expect(result).toHaveProperty("blocked");
    expect(result).toHaveProperty("action");
  });

  it("handles events with null userId", () => {
    const event = {
      type: "message_create" as const,
      userId: null as any,
      guildId: "guild_1",
      timestamp: Date.now(),
      payload: {}
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result).toHaveProperty("score");
  });

  it("handles events with null guildId", () => {
    const event = {
      type: "message_create" as const,
      userId: "user_1",
      guildId: null as any,
      timestamp: Date.now(),
      payload: {}
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result).toHaveProperty("score");
  });

  it("clamps invalid timestamps to Date.now()", () => {
    const event = {
      type: "message_create" as const,
      userId: "user_1",
      guildId: "guild_1",
      timestamp: -1,
      payload: {}
    };
    const result = SecurityPipeline.processEvent(event);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.blocked).toBeDefined();
  });
});
