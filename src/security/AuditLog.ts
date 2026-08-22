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
  private currentSize: number = 0;
  private readonly maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private rotationCounter: number = 0;
  private emergencyFallbackPath: string;
  private overflowDroppedCount: number = 0;

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

    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.warn(`[AUDIT LOG] Cannot create log directory '${this.logDir}':`, (err as Error).message);
      this.logDir = "";
    }
    this.emergencyFallbackPath = this.logDir ? path.join(this.logDir, "audit_overflow.json") : "";
    this.currentLogFile = this.getLogFilePath();
    this.currentSize = this.getActualFileSize(this.currentLogFile);
    this.rotationCounter = this.detectExistingRotations();
  }

  private detectExistingRotations(): number {
    if (!this.logDir) return 0;
    try {
      const entries = fs.readdirSync(this.logDir);
      const baseName = path.basename(this.currentLogFile, ".json");
      const regex = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:_(\\d+))?\\.json$`);
      let maxCounter = 0;
      for (const entry of entries) {
        const match = entry.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxCounter) maxCounter = num;
        }
      }
      return maxCounter;
    } catch {
      return 0;
    }
  }

  private getActualFileSize(filePath: string): number {
    if (!this.logDir || !filePath) return 0;
    try {
      if (fs.existsSync(filePath)) {
        return fs.statSync(filePath).size;
      }
    } catch {
      // ignore stat errors
    }
    return 0;
  }

  enqueue(event: Omit<AuditEvent, "timestamp">): void {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.queue.push(fullEvent);

    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
      this.overflowDroppedCount++;
      this.writeOverflowMetric();
    }

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private writeOverflowMetric(): void {
    if (!this.emergencyFallbackPath) return;
    try {
      const metric = {
        timestamp: new Date().toISOString(),
        type: "overflow",
        totalDropped: this.overflowDroppedCount,
        currentQueueSize: this.queue.length
      };
      const existing = fs.existsSync(this.emergencyFallbackPath)
        ? JSON.parse(fs.readFileSync(this.emergencyFallbackPath, "utf8"))
        : [];
      existing.push(metric);
      if (existing.length > 1000) existing.splice(0, existing.length - 1000);
      atomicWriteJsonSync(this.emergencyFallbackPath, existing);
    } catch {
      // ignore overflow metric errors
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
    if (!this.logDir) return;
    try {
      this.rotateLogIfNeeded();

      const existing = fs.existsSync(this.currentLogFile)
        ? JSON.parse(fs.readFileSync(this.currentLogFile, "utf8"))
        : [];
      existing.push(...batch);

      atomicWriteJsonSync(this.currentLogFile, existing);
      this.currentSize += JSON.stringify(batch).length;
    } catch (err) {
      console.error("[AUDIT LOG] Failed to write batch:", err);
      if (this.queue.length < this.maxQueueSize) {
        this.queue.unshift(...batch);
      }
    }
  }

  private getLogFilePath(): string {
    if (!this.logDir) return "";
    const date = new Date().toISOString().slice(0, 10);
    return path.join(this.logDir, `audit_${date}.json`);
  }

  private getRotatedLogFilePath(): string {
    if (!this.logDir) return "";
    const date = new Date().toISOString().slice(0, 10);
    this.rotationCounter++;
    return path.join(this.logDir, `audit_${date}_${this.rotationCounter}.json`);
  }

  private rotateLogIfNeeded(): void {
    if (!this.logDir) return;
    const currentSize = this.getActualFileSize(this.currentLogFile);
    if (currentSize >= this.maxLogSize) {
      this.currentLogFile = this.getRotatedLogFilePath();
      this.currentSize = 0;
    } else {
      this.currentSize = currentSize;
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
