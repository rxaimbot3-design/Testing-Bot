import crypto from "crypto";

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
}

export class SecurityPipeline {
  private static burstHistory = new Map<string, number[]>();
  private static trustedUsers = new Set<string>();
  private static thresholds = {
    massChannelCreate: { count: 5, windowMs: 10000 },
    massRoleModify: { count: 3, windowMs: 10000 },
    permissionEscalation: { count: 1, windowMs: 60000 },
    burst: { count: 10, windowMs: 5000 },
  };

  static addTrustedUser(userId: string): void {
    this.trustedUsers.add(userId);
  }

  static removeTrustedUser(userId: string): void {
    this.trustedUsers.delete(userId);
  }

  static isTrusted(userId: string): boolean {
    return this.trustedUsers.has(userId);
  }

  static processEvent(event: SecurityEvent): PipelineResult {
    if (this.isTrusted(event.userId)) {
      return { blocked: false, action: "allow_trusted", reason: "User is trusted", score: 0 };
    }

    const now = event.timestamp || Date.now();
    const score = this.evaluateEvent(event, now);

    if (score >= 80) {
      return { blocked: true, action: "block", reason: "High risk score", score };
    }
    if (score >= 50) {
      return { blocked: true, action: "quarantine", reason: "Medium risk score", score };
    }
    return { blocked: false, action: "monitor", reason: "Low risk", score };
  }

  private static evaluateEvent(event: SecurityEvent, now: number): number {
    let score = 0;
    const key = `${event.guildId}:${event.userId}`;
    const history = this.burstHistory.get(key) || [];
    history.push(now);
    this.burstHistory.set(key, history.filter((t) => now - t < 60000));

    switch (event.type) {
      case "channel_create":
        score += this.checkBurst(key, history, now, this.thresholds.massChannelCreate) * 40;
        break;
      case "role_create":
      case "role_update":
        score += this.checkBurst(key, history, now, this.thresholds.massRoleModify) * 50;
        break;
      case "permission_update":
        score += this.checkBurst(key, history, now, this.thresholds.permissionEscalation) * 40;
        break;
      case "message_bulk_delete":
        score += 30;
        break;
      case "guild_kick":
      case "guild_ban":
        score += 20;
        break;
      default:
        score += this.checkBurst(key, history, now, this.thresholds.burst) * 30;
    }

    if (event.payload && event.payload.massAction) {
      score += 15;
    }

    return Math.min(100, score);
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
  }
}
