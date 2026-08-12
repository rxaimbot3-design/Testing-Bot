import fs from "fs";
import path from "path";
import crypto from "crypto";
import { atomicWriteJsonSync } from "../SecurityFeatures.js";

export interface AuditEvent {
  timestamp: string;
  action: string;
  actorIp: string;
  details: Record<string, any>;
  source: string;
}

export class AuditLogQueue {
  private queue: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize: number;
  private readonly maxQueueSize: number;
  private readonly flushIntervalMs: number;
  private readonly logDir: string;
  private currentLogFile: string;
  private currentLogSize: number = 0;
  private readonly maxLogSize: number = 10 * 1024 * 1024; // 10MB

  constructor(options: {
    logDir?: string;
    flushIntervalMs?: number;
    maxBatchSize?: number;
    maxQueueSize?: number;
    maxLogSize?: number;
  } = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), "audit_logs");
    this.flushIntervalMs = options.flushIntervalMs || 5000;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024;

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.currentLogFile = this.getLogFilePath();
  }

  enqueue(event: Omit<AuditEvent, "timestamp">): void {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.queue.push(fullEvent);

    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift(); // Drop oldest
    }

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  startAutoFlush(): void {
    this.stopAutoFlush();
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  flush(): void {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    this.writeBatch(batch);
  }

  private writeBatch(batch: AuditEvent[]): void {
    try {
      this.rotateLogIfNeeded();

      const existing = fs.existsSync(this.currentLogFile)
        ? JSON.parse(fs.readFileSync(this.currentLogFile, "utf8"))
        : [];
      existing.push(...batch);

      atomicWriteJsonSync(this.currentLogFile, existing);
      this.currentLogSize += JSON.stringify(batch).length;
    } catch (err) {
      console.error("[AUDIT LOG] Failed to write batch:", err);
      // Re-queue failed batch (but limit requeue to prevent infinite loop)
      if (this.queue.length < this.maxQueueSize) {
        this.queue.unshift(...batch);
      }
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().slice(0, 10);
    return path.join(this.logDir, `audit_${date}.json`);
  }

  private rotateLogIfNeeded(): void {
    if (this.currentLogSize >= this.maxLogSize) {
      this.currentLogFile = this.getLogFilePath();
      this.currentLogSize = 0;
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  shutdown(): void {
    this.stopAutoFlush();
    this.flush();
  }
}

// Singleton instance
export const auditLogQueue = new AuditLogQueue();
auditLogQueue.startAutoFlush();
