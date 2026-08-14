import { describe, it, expect, beforeEach } from "vitest";
import { SecurityPipeline } from "../../src/security/Pipeline.js";

/**
 * Discord Attack Simulation Tests
 * 
 * These tests simulate real Discord server attack scenarios to verify
 * the security pipeline correctly detects and blocks malicious actions.
 * 
 * Simulated attacks:
 * 1. Mass channel deletion (nuke)
 * 2. Mass role creation/deletion
 * 3. Permission escalation
 * 4. Mass ban/kick
 * 5. Webhook abuse
 * 6. Bot addition spam
 * 7. Suspicious burst activity
 */

describe("Discord Attack Simulations", () => {
  beforeEach(() => {
    SecurityPipeline.reset();
  });

  describe("Mass Channel Deletion (Nuke)", () => {
    it("detects and blocks mass channel deletion", () => {
      const now = Date.now();
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: "channel_delete" as const,
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { channelCount: 5, massAction: true }
      }));

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
      expect(blocked[0].rule).toBe("mass_channel_delete");
    });

    it("allows normal channel deletion by trusted user", () => {
      SecurityPipeline.addTrustedUser("trusted_admin");
      const event = {
        type: "channel_delete" as const,
        userId: "trusted_admin",
        guildId: "guild_1",
        timestamp: Date.now(),
        payload: { channelCount: 1 }
      };
      const result = SecurityPipeline.processEvent(event);
      expect(result.blocked).toBe(false);
    });
  });

  describe("Mass Role Manipulation", () => {
    it("detects mass role creation", () => {
      const now = Date.now();
      const events = Array.from({ length: 3 }, (_, i) => ({
        type: "role_create" as const,
        userId: "raider_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { roleCount: 3, massAction: true }
      }));

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });

    it("detects mass role update", () => {
      const now = Date.now();
      const events = Array.from({ length: 3 }, (_, i) => ({
        type: "role_update" as const,
        userId: "raider_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { roleCount: 3, massAction: true }
      }));

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Permission Escalation", () => {
    it("detects mass permission grants", () => {
      const now = Date.now();
      const events = Array.from({ length: 3 }, (_, i) => ({
        type: "permission_update" as const,
        userId: "escalator_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { permsAdded: 50, permsRemoved: 0, massAction: true }
      }));

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });

    it("detects admin permission grant", () => {
      const event = {
        type: "permission_update" as const,
        userId: "escalator_1",
        guildId: "guild_1",
        timestamp: Date.now(),
        payload: { permsAdded: 8, permsRemoved: 0 }
      };
      const result = SecurityPipeline.processEvent(event);
      // Admin grant alone doesn't trigger block without burst threshold
      expect(result.rule).toBe("permission_escalation");
      expect(result.score).toBeGreaterThanOrEqual(40);
    });
  });

  describe("Mass Ban/Kick", () => {
    it("detects mass ban", () => {
      const now = Date.now();
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: "guild_ban" as const,
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { banCount: 5 }
      }));
      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });

    it("detects mass kick", () => {
      const now = Date.now();
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: "guild_kick" as const,
        userId: "nuker_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { kickCount: 5 }
      }));
      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Webhook Abuse", () => {
    it("detects mass webhook creation", () => {
      const now = Date.now();
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: "webhook_create" as const,
        userId: "spammer_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { webhookCount: 5, massAction: true }
      }));

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });

    it("detects webhook with suspicious name", () => {
      const now = Date.now();
      const events = Array.from({ length: 2 }, (_, i) => ({
        type: "webhook_create" as const,
        userId: "spammer_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { webhookCount: 2, webhookName: "nuke-bot" }
      }));
      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Bot Addition Spam", () => {
    it("detects rapid bot additions", () => {
      const now = Date.now();
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: "guild_member_add" as const,
        userId: "bot_adder_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: { botCount: 5, massAction: true }
      }));

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Suspicious Burst Activity", () => {
    it("detects rapid sequential actions", () => {
      const now = Date.now();
      const events = Array.from({ length: 15 }, (_, i) => ({
        type: "message_create" as const,
        userId: "spammer_1",
        guildId: "guild_1",
        timestamp: now + i * 100,
        payload: {}
      }));

      const results = SecurityPipeline.processBatch(events);
      const flagged = results.filter(r => r.rule === "suspicious_burst");
      expect(flagged.length).toBeGreaterThanOrEqual(1);
      expect(flagged[0].score).toBeGreaterThanOrEqual(30);
    });
  });
  });

  describe("Emergency Lockdown", () => {
    it("blocks all actions during lockdown", () => {
      SecurityPipeline.setLockdownMode(true);
      const event = {
        type: "message_create" as const,
        userId: "random_user",
        guildId: "guild_1",
        timestamp: Date.now(),
        payload: {}
      };
      const result = SecurityPipeline.processEvent(event);
      expect(result.blocked).toBe(true);
      expect(result.action).toBe("lockdown");
      expect(result.score).toBe(100);
    });
  });

  describe("Mixed Raid Scenario", () => {
    it("handles coordinated multi-vector attack", () => {
      const now = Date.now();
      const events: any[] = [];
      
      // Mass channel deletion
      for (let i = 0; i < 5; i++) {
        events.push({
          type: "channel_delete",
          userId: "raider_1",
          guildId: "guild_1",
          timestamp: now + i * 100,
          payload: { channelCount: 5 }
        });
      }
      
      // Mass role creation
      for (let i = 0; i < 5; i++) {
        events.push({
          type: "role_create",
          userId: "raider_1",
          guildId: "guild_1",
          timestamp: now + i * 100,
          payload: { roleCount: 5 }
        });
      }
      
      // Permission escalation
      for (let i = 0; i < 3; i++) {
        events.push({
          type: "permission_update",
          userId: "raider_1",
          guildId: "guild_1",
          timestamp: now + i * 100,
          payload: { permsAdded: 50 }
        });
      }
      
      // Webhook spam
      for (let i = 0; i < 5; i++) {
        events.push({
          type: "webhook_create",
          userId: "raider_1",
          guildId: "guild_1",
          timestamp: now + i * 100,
          payload: { webhookCount: 5 }
        });
      }

      const results = SecurityPipeline.processBatch(events);
      const blocked = results.filter(r => r.blocked);
      expect(blocked.length).toBeGreaterThanOrEqual(5);
    });
});
