import { TtlMap, LruMap } from "./MapManager.js";

export interface SecurityEvent {
  type: string;
  userId: string;
  guildId: string;
  timestamp: number;
  payload: Record<string, any>;
}

export interface PipelineResult {
  blocked: boolean;
  action: string;
  reason: string;
  score: number;
  rule: string;
  canRollback: boolean;
}

interface DecisionRecord {
  timestamp: number;
  event: SecurityEvent;
  result: PipelineResult;
}

export class SecurityPipeline {
  private static burstHistory = new TtlMap<string, number[]>({ ttlMs: 5 * 60 * 1000, maxEntries: 10000, autoCleanupMs: 60000 });
  private static trustedUsers = new LruMap<string, boolean>(5000);
  private static duplicatePayloadTracker = new TtlMap<string, number>({ ttlMs: 1000, maxEntries: 10000, autoCleanupMs: 10000 });
  private static decisionLog: DecisionRecord[] = [];
  private static readonly MAX_DECISION_LOG = 500;
  private static lockdownMode = false;
  private static recentQuarantines = new TtlMap<string, number>({ ttlMs: 60000, maxEntries: 10000, autoCleanupMs: 30000 });

  private static thresholds = {
    massChannelCreate: { count: 5, windowMs: 10000 },
    massRoleModify: { count: 3, windowMs: 10000 },
    permissionEscalation: { count: 1, windowMs: 60000 },
    massBanKick: { count: 5, windowMs: 10000 },
    burst: { count: 10, windowMs: 5000 },
  };

  static setLockdownMode(enabled: boolean): void {
    this.lockdownMode = enabled;
    console.log(`🛡️ [PIPELINE] Lockdown mode ${enabled ? "ENABLED" : "DISABLED"}`);
  }

  static isLockdownMode(): boolean {
    return this.lockdownMode;
  }

  static addTrustedUser(userId: string): void {
    this.trustedUsers.set(userId, true);
  }

  static removeTrustedUser(userId: string): void {
    this.trustedUsers.delete(userId);
  }

  static isTrusted(userId: string): boolean {
    return this.trustedUsers.has(userId);
  }

  static processEvent(event: SecurityEvent): PipelineResult {
    if (!event.type || !event.userId || !event.guildId) {
      const result: PipelineResult = {
        blocked: false,
        action: "monitor",
        reason: "Invalid event: missing required fields",
        score: 25,
        rule: "invalid_input",
        canRollback: false
      };
      this.logDecision(event, result);
      return result;
    }

    if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
      event.timestamp = Date.now();
    }

    // Reject events with timestamps far in the future (>5 min clock skew)
    if (event.timestamp > Date.now() + 300000) {
      const result: PipelineResult = {
        blocked: true,
        action: "quarantine",
        reason: "Invalid event: timestamp too far in future",
        score: 80,
        rule: "invalid_timestamp",
        canRollback: false
      };
      this.logDecision(event, result);
      return result;
    }

    // Emergency lockdown blocks all non-owner actions
    if (this.lockdownMode && !this.isTrusted(event.userId)) {
      const result: PipelineResult = {
        blocked: true,
        action: "lockdown",
        reason: "Emergency lockdown active",
        score: 100,
        rule: "emergency_lockdown",
        canRollback: true
      };
      this.logDecision(event, result);
      return result;
    }

    const now = event.timestamp || Date.now();
    const { score, rule } = this.evaluateEvent(event, now);

    const action = this.decideAction(score);

    const adjustedScore = this.adjustForFalsePositive(event.userId, score);

    const result: PipelineResult = {
      blocked: adjustedScore >= 50,
      action,
      reason: this.getReason(adjustedScore, rule),
      score: adjustedScore,
      rule,
      canRollback: adjustedScore >= 50
    };

    // Track quarantine for future false-positive damping
    if (result.action === "quarantine" || result.action === "lockdown") {
      this.recentQuarantines.set(event.userId, Date.now());
    }

    this.logDecision(event, result);
    return result;
  }

  private static evaluateEvent(event: SecurityEvent, now: number): { score: number; rule: string } {
    let score = 0;
    let rule = "none";
    const key = `${event.guildId}:${event.userId}`;
    const history = [...(this.burstHistory.get(key) || [])];
    history.push(now);
    this.burstHistory.set(key, history);

    switch (event.type) {
      case "channel_create":
        // Primary: payload count
        if ((event.payload?.channelCount || 0) >= 5) {
          score += 40;
          rule = "mass_channel_create";
        }
        // Amplification: event velocity
        if (score === 0) {
          score += this.checkBurst(key, history, now, this.thresholds.massChannelCreate) * 40;
          if (score > 0) rule = "mass_channel_create";
        }
        break;
      case "channel_delete":
        score += this.checkBurst(key, history, now, { count: 3, windowMs: 10000 }) * 40;
        if (score > 0) rule = "mass_channel_delete";
        break;
      case "role_create":
      case "role_update":
        // Primary: payload count (matches C++ engine threshold of 3)
        if ((event.payload?.roleCount || 0) >= 3) {
          score += 50;
          rule = "mass_role_update";
        }
        // Amplification: event velocity
        if (score === 0) {
          score += this.checkBurst(key, history, now, this.thresholds.massRoleModify) * 50;
          if (score > 0) rule = "mass_role_update";
        }
        break;
      case "permission_update":
        // Primary: payload-based permission escalation
        const permsAdded = event.payload?.permsAdded || 0;
        const permsRemoved = event.payload?.permsRemoved || 0;
        if (permsAdded > 0 && permsRemoved === 0 && permsAdded >= 50) {
          score += 40;
          rule = "permission_escalation";
        }
        // Amplification: event velocity
        if (score === 0) {
          score += this.checkBurst(key, history, now, this.thresholds.permissionEscalation) * 40;
          if (score > 0) rule = "permission_escalation";
        }
        break;
      case "message_bulk_delete":
        score += 30;
        rule = "mass_channel_delete";
        break;
      case "guild_kick":
      case "guild_ban":
        // Primary: payload count (matches C++ engine behavior)
        const totalBanKick = (event.payload?.banCount || 0) + (event.payload?.kickCount || 0);
        if (totalBanKick >= 5) {
          score += 50;
          rule = "mass_ban_kick";
        }
        // Amplification: event velocity
        if (score === 0) {
          score += this.checkBurst(key, history, now, this.thresholds.massBanKick) * 50;
          if (score > 0) rule = "mass_ban_kick";
        }
        break;
      case "webhook_create":
      case "webhook_update":
        // Primary: payload count
        if ((event.payload?.webhookCount || 0) >= 2) {
          score += 55;
          rule = "webhook_abuse";
        }
        // Amplification: event velocity
        if (score === 0) {
          score += this.checkBurst(key, history, now, { count: 2, windowMs: 10000 }) * 55;
          if (score > 0) rule = "webhook_abuse";
        }
        break;
      case "guild_member_add":
        // Primary: payload count
        if ((event.payload?.botCount || 0) >= 3) {
          score += 40;
          rule = "bot_addition";
        }
        // Amplification: event velocity
        if (score === 0) {
          score += this.checkBurst(key, history, now, { count: 5, windowMs: 10000 }) * 40;
          if (score > 0) rule = "bot_addition";
        }
        break;
      default:
        score += this.checkBurst(key, history, now, this.thresholds.burst) * 30;
        if (score > 0) rule = "suspicious_burst";
    }

    if (event.payload && event.payload.massAction) {
      score += 15;
      if (rule === "none") rule = "mass_action";
    }

    return { score: Math.min(100, score), rule };
  }

  private static checkBurst(
    key: string,
    history: number[],
    now: number,
    threshold: { count: number; windowMs: number }
  ): number {
    const recent = history.filter((t) => now - t < threshold.windowMs).length;
    return recent >= threshold.count ? 1 : 0;
  }

  private static adjustForFalsePositive(userId: string, score: number): number {
    if (this.recentQuarantines.has(userId) && score < 50) {
      return Math.max(0, score - 10);
    }
    return score;
  }

  private static decideAction(score: number): string {
    if (score >= 80) return "lockdown";
    if (score >= 50) return "quarantine";
    return "monitor";
  }

  private static getReason(score: number, rule: string): string {
    if (rule === "emergency_lockdown") return "Emergency lockdown active";
    if (rule === "trusted") return "User is trusted";
    if (rule === "duplicate_detection") return "Duplicate event detected";
    if (rule === "cooldown") return "User is in cooldown";
    if (score >= 80) return "Critical risk score";
    if (score >= 50) return "High risk score";
    if (score >= 25) return "Medium risk score";
    return "Low risk";
  }

  private static logDecision(event: SecurityEvent, result: PipelineResult): void {
    this.decisionLog.push({ timestamp: Date.now(), event, result });
    if (this.decisionLog.length > this.MAX_DECISION_LOG) {
      this.decisionLog.shift();
    }
  }

  static rollbackLast(userId: string, guildId: string): PipelineResult | null {
    for (let i = this.decisionLog.length - 1; i >= 0; i--) {
      const record = this.decisionLog[i];
      if (record.event.userId === userId && record.event.guildId === guildId && record.result.canRollback) {
        this.decisionLog.splice(i, 1);
        return { ...record.result, action: "rollback", reason: `Rolled back: ${record.result.reason}` };
      }
    }
    return null;
  }

  static escalate(result: PipelineResult): string {
    if (result.score >= 90) return "lockdown";
    if (result.score >= 70) return "ban";
    if (result.score >= 50) return "quarantine";
    return "monitor";
  }

  static processBatch(events: SecurityEvent[]): PipelineResult[] {
    return events.map((event) => this.processEvent(event));
  }

  static reset(): void {
    this.burstHistory.destroy();
    this.trustedUsers.clear();
    this.duplicatePayloadTracker.destroy();
    this.decisionLog.length = 0;
    this.lockdownMode = false;
    this.recentQuarantines.destroy();
  }
}
