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

    if (this.isTrusted(event.userId)) {
      const result: PipelineResult = { blocked: false, action: "allow_trusted", reason: "User is trusted", score: 0, rule: "trusted", canRollback: false };
      this.logDecision(event, result);
      return result;
    }

    const now = event.timestamp || Date.now();
    const { score, rule } = this.evaluateEvent(event, now);

    // Duplicate detection (log only, does not block)
    const payloadHash = JSON.stringify(event.payload || {});
    const duplicateKey = `${event.guildId}:${event.userId}:${event.type}:${payloadHash}`;
    const lastDuplicate = this.duplicatePayloadTracker.get(duplicateKey);
    if (lastDuplicate && Date.now() - lastDuplicate < 50) {
      // Log duplicate for audit trail but continue processing
    }
    this.duplicatePayloadTracker.set(duplicateKey, Date.now());

    const action = this.decideAction(score);

    // False-positive protection: if quarantined and released within 60s, reduce score
    const adjustedScore = this.adjustForFalsePositive(event.userId, score);

    const result: PipelineResult = {
      blocked: adjustedScore >= 50,
      action,
      reason: this.getReason(adjustedScore, rule),
      score: adjustedScore,
      rule,
      canRollback: adjustedScore >= 50
    };

    this.logDecision(event, result);
    return result;
  }

  private static evaluateEvent(event: SecurityEvent, now: number): { score: number; rule: string } {
    let score = 0;
    let rule = "none";
    const key = `${event.guildId}:${event.userId}`;
    const history = this.burstHistory.get(key) || [];
    history.push(now);
    this.burstHistory.set(key, history);

    switch (event.type) {
      case "channel_create":
        score += this.checkBurst(key, history, now, this.thresholds.massChannelCreate) * 40;
        if (score > 0) rule = "mass_channel_create";
        break;
      case "channel_delete":
        score += this.checkBurst(key, history, now, { count: 3, windowMs: 10000 }) * 40;
        if (score > 0) rule = "mass_channel_delete";
        break;
      case "role_create":
      case "role_update":
        score += this.checkBurst(key, history, now, this.thresholds.massRoleModify) * 50;
        if (score > 0) rule = "mass_role_update";
        break;
      case "permission_update":
        score += this.checkBurst(key, history, now, this.thresholds.permissionEscalation) * 40;
        if (score > 0) rule = "permission_escalation";
        break;
      case "message_bulk_delete":
        score += 30;
        rule = "mass_channel_delete";
        break;
      case "guild_kick":
      case "guild_ban":
        score += this.checkBurst(key, history, now, this.thresholds.massBanKick) * 50;
        if (score > 0) rule = "mass_ban_kick";
        break;
      case "webhook_create":
      case "webhook_update":
        score += this.checkBurst(key, history, now, { count: 2, windowMs: 10000 }) * 55;
        if (score > 0) rule = "webhook_abuse";
        break;
      case "guild_member_add":
        score += this.checkBurst(key, history, now, { count: 5, windowMs: 10000 }) * 40;
        if (score > 0) rule = "bot_addition";
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
    // If user was recently quarantined and released, apply false-positive damping
    const recent = this.decisionLog
      .filter(d => d.event.userId === userId && d.result.action === "quarantine")
      .filter(d => Date.now() - d.timestamp < 60000);
    if (recent.length > 0) {
      return Math.max(0, score - 20);
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
        const undone = this.decisionLog.splice(i, 1)[0];
        return { ...undone.result, action: "rollback", reason: `Rolled back: ${undone.result.reason}` };
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
    this.burstHistory.clear();
    this.trustedUsers.clear();
    this.duplicatePayloadTracker.clear();
    this.decisionLog.length = 0;
    this.lockdownMode = false;
  }
}
