import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import { createRequire } from "module";
import { createHash } from "crypto";
import { SecurityPipeline, SecurityEvent } from "./security/Pipeline.js";

const __filename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : process.argv[1] || ".";
const __dirname = path.dirname(__filename);

const requireNative = (() => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url && import.meta.url !== "{}") {
      return createRequire(import.meta.url);
    }
  } catch {
    // ignore
  }
  return require;
})();

export interface CppEngineMetrics {
  engineName: string;
  architecture: string;
  status: "ACTIVE_MICROSECOND" | "STANDBY" | "OFFLINE";
  memoryAllocatedBytes: number;
  memoryUsedMB: number;
  averageLatencyMicroseconds: number;
  throughputPerSecond: number;
  simdAcceleration: boolean;
  activeThreads: number;
  totalAuditsProcessed: number;
}

interface ScanRequest {
  packetId: number;
  riskWeight: number;
  userId?: number;
  guildId?: number;
  channelCount?: number;
  roleCount?: number;
  banCount?: number;
  kickCount?: number;
  webhookCount?: number;
  botCount?: number;
  permsAdded?: number;
  permsRemoved?: number;
  eventCount1s?: number;
  eventCount10s?: number;
  eventType?: number;
}

interface HashRequest {
  data: string;
  algorithm: "sha256" | "sha512" | "crc32";
}

interface ScanEvent {
  eventType: number;
  userId: number;
  guildId: number;
  channelCount: number;
  roleCount: number;
  banCount: number;
  kickCount: number;
  webhookCount: number;
  botCount: number;
  permsAdded: number;
  permsRemoved: number;
  eventCount1s: number;
  eventCount10s: number;
  timestamp: number;
  riskWeight?: number;
}

type WorkerRequestType = "scan_batch" | "compute_hashes" | "get_metrics" | "reset_metrics" | "shutdown";
type WorkerResponseType = "scan_batch_result" | "compute_hashes_result" | "metrics_result" | "reset_metrics_result" | "shutdown_result";

interface WorkerRequest {
  type: WorkerRequestType;
  id: number;
  payload?: any;
}

interface WorkerResponse {
  type: WorkerResponseType;
  id: number;
  payload?: any;
}

// ========== Native C++ Addon Layer (Optional) ==========
let nativeModule: any = null;
let nativeInstance: any = null;
let nativeAvailable = false;

function tryLoadNativeModule(): any {
  if (nativeInstance) return nativeInstance;

  try {
    const possiblePaths = [
      path.join(process.cwd(), "build", "Release", "security_engine.node"),
      path.join(process.cwd(), "build", "Debug", "security_engine.node"),
      path.join(__dirname, "security_engine.node"),
      path.join(__dirname, "..", "build", "Release", "security_engine.node"),
      path.join(__dirname, "..", "build", "Debug", "security_engine.node"),
    ];

    for (const modPath of possiblePaths) {
      try {
        nativeModule = requireNative(modPath);
        if (nativeModule && nativeModule.SecurityEngine) {
          nativeInstance = new nativeModule.SecurityEngine();
          nativeAvailable = true;
          console.log(`⚡ [ENGINE] Native C++ module loaded from: ${modPath}`);
          return nativeInstance;
        }
      } catch {
        // try next path
      }
    }
  } catch {
    // Native module not available
  }
  return null;
}

function buildScanEvent(request: Partial<ScanRequest> = {}): ScanEvent {
  return {
    eventType: request.eventType ?? 0,
    userId: Number.isFinite(request.userId) ? request.userId! : 0,
    guildId: Number.isFinite(request.guildId) ? request.guildId! : 0,
    channelCount: Number.isFinite(request.channelCount) ? request.channelCount! : 0,
    roleCount: Number.isFinite(request.roleCount) ? request.roleCount! : 0,
    banCount: Number.isFinite(request.banCount) ? request.banCount! : 0,
    kickCount: Number.isFinite(request.kickCount) ? request.kickCount! : 0,
    webhookCount: Number.isFinite(request.webhookCount) ? request.webhookCount! : 0,
    botCount: Number.isFinite(request.botCount) ? request.botCount! : 0,
    permsAdded: Number.isFinite(request.permsAdded) ? request.permsAdded! : 0,
    permsRemoved: Number.isFinite(request.permsRemoved) ? request.permsRemoved! : 0,
    eventCount1s: Number.isFinite(request.eventCount1s) ? request.eventCount1s! : 0,
    eventCount10s: Number.isFinite(request.eventCount10s) ? request.eventCount10s! : 0,
    timestamp: Date.now(),
    riskWeight: Number.isFinite(request.riskWeight) ? request.riskWeight! : undefined
  };
}

// ========== Worker Thread Layer ==========
class WorkerEngine {
  private worker: Worker | null = null;
  private workerReady = false;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (err: Error) => void }>();
  private requestId = 0;
  private metrics: CppEngineMetrics;
  private scanFailureCount = 0;
  private hashFailureCount = 0;
  private fallbackBuffer: { view32: Uint32Array } | null = null;
  private restartAttempts = 0;
  private maxRestartAttempts = 5;
  private restartBackoffMs = 1000;
  private restartTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = {
      engineName: "Main-Thread Fallback Security Core",
      architecture: `${os.arch()} Single-Threaded`,
      status: "STANDBY",
      memoryAllocatedBytes: 0,
      memoryUsedMB: 0,
      averageLatencyMicroseconds: 12,
      throughputPerSecond: 0,
      simdAcceleration: false,
      activeThreads: 1,
      totalAuditsProcessed: 0
    };
    try {
      const buf = new ArrayBuffer(16 * 1024 * 1024);
      this.fallbackBuffer = { view32: new Uint32Array(buf) };
      this.metrics.memoryAllocatedBytes = buf.byteLength;
    } catch {
      const buf = new ArrayBuffer(8 * 1024 * 1024);
      this.fallbackBuffer = { view32: new Uint32Array(buf) };
      this.metrics.memoryAllocatedBytes = buf.byteLength;
    }
  }

  private scheduleRestart() {
    if (this.restartAttempts >= this.maxRestartAttempts) {
      console.warn("⚠️ [ENGINE WORKER] Max restart attempts reached. Falling back to sync engine.");
      return;
    }
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartAttempts++;
      console.log(`🔄 [ENGINE WORKER] Restarting worker (attempt ${this.restartAttempts}/${this.maxRestartAttempts})...`);
      this.initialize().then(() => {
        console.log("✅ [ENGINE WORKER] Worker restarted successfully.");
      }).catch((err) => {
        console.warn("⚠️ [ENGINE WORKER] Restart failed:", err.message);
      });
    }, this.restartBackoffMs * Math.pow(2, this.restartAttempts));
  }

  async initialize() {
    if (this.workerReady) return;

    try {
      const isDev = process.env.NODE_ENV !== "production";
      let workerPath: string;

      if (isDev) {
        workerPath = new URL("./EngineWorker.ts", import.meta.url).pathname;
      } else {
        workerPath = path.join(__dirname, "EngineWorker.cjs");
      }

      this.worker = new Worker(workerPath, { type: "worker" } as any);

      this.worker.on("error", (err) => {
        console.warn("⚠️ [ENGINE WORKER] Worker error:", err.message);
        this.workerReady = false;
        this.worker = null;
        this.scheduleRestart();
      });

      this.worker.on("exit", (code) => {
        if (code !== 0) {
          console.warn(`⚠️ [ENGINE WORKER] Worker exited with code ${code}`);
          this.workerReady = false;
          this.worker = null;
          this.scheduleRestart();
        }
      });

      this.worker.on("message", (msg: WorkerResponse) => {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          this.pendingRequests.delete(msg.id);
          if (msg.type === "shutdown_result") {
            pending.resolve(undefined);
          } else {
            pending.resolve(msg.payload);
          }
        }
      });

      this.workerReady = true;
      this.metrics.status = "ACTIVE_MICROSECOND";
      this.metrics.engineName = "Worker-Thread High-Performance Security Core";
      this.metrics.architecture = `${os.arch()} Parallel Worker Engine`;
      this.metrics.simdAcceleration = false;
      this.metrics.activeThreads = os.cpus().length || 1;
      console.log("⚡ [ENGINE] Worker-thread security engine initialized.");
    } catch (err: any) {
      console.warn("⚠️ [ENGINE] Worker initialization failed, using main-thread fallback:", err.message);
      this.workerReady = false;
      this.worker = null;
    }
  }

  private sendRequest(type: WorkerRequestType, payload?: any, timeoutMs = 5000): Promise<any> {
    if (!this.workerReady || !this.worker) {
      return Promise.reject(new Error("Worker not available"));
    }

    const id = ++this.requestId;
    const promise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Worker request ${type} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });
    });

    this.worker.postMessage({ type, id, payload } as WorkerRequest);
    return promise;
  }

  async batchScanPackets(requests: ScanRequest[]): Promise<Array<{ passed: boolean; latencyMicros: number; score: number }>> {
    if (!this.workerReady || !this.worker || requests.length === 0) {
      return this.fallbackScanBatch(requests);
    }

    try {
      const results = await this.sendRequest("scan_batch", requests);
      this.scanFailureCount = 0;
      return results;
    } catch {
      this.scanFailureCount++;
      if (this.scanFailureCount > 5) {
        console.warn("⚠️ [ENGINE] Too many scan worker failures, disabling worker for this session.");
        this.workerReady = false;
      }
      return this.fallbackScanBatch(requests);
    }
  }

  async batchComputeHashes(requests: HashRequest[]): Promise<Array<{ hash: string; latencyMicros: number }>> {
    if (!this.workerReady || !this.worker || requests.length === 0) {
      return this.fallbackComputeHashes(requests);
    }

    try {
      const results = await this.sendRequest("compute_hashes", requests);
      this.hashFailureCount = 0;
      return results;
    } catch {
      this.hashFailureCount++;
      return this.fallbackComputeHashes(requests);
    }
  }

  async getMetrics(): Promise<CppEngineMetrics> {
    if (this.workerReady && this.worker) {
      try {
        const workerMetrics = await this.sendRequest("get_metrics");
        this.metrics = { ...this.metrics, ...workerMetrics };
      } catch {
        // fallback to cached metrics
      }
    }

    const memUsage = process.memoryUsage();
    this.metrics.memoryUsedMB = parseFloat(((memUsage.heapUsed + (memUsage.arrayBuffers || 0)) / 1024 / 1024).toFixed(2));
    return { ...this.metrics };
  }

  async resetMetrics() {
    if (this.workerReady && this.worker) {
      try {
        await this.sendRequest("reset_metrics");
      } catch {
        // ignore
      }
    }
    this.metrics.totalAuditsProcessed = 0;
    this.metrics.throughputPerSecond = 0;
    this.metrics.averageLatencyMicroseconds = 12;
  }

  async shutdown() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.workerReady && this.worker) {
      try {
        await this.sendRequest("shutdown", undefined, 2000);
      } catch {
        // ignore
      }
      this.worker.removeAllListeners();
      this.worker = null;
      this.workerReady = false;
    }
  }

  reset() {
    this.workerReady = false;
    if (this.worker) {
      try {
        this.worker.removeAllListeners();
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.requestId = 0;
    this.scanFailureCount = 0;
    this.hashFailureCount = 0;
    this.restartAttempts = 0;
    this.restartBackoffMs = 1000;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

   private fallbackScanBatch(requests: ScanRequest[]): Array<{ passed: boolean; latencyMicros: number; score: number }> {
    const view32 = this.fallbackBuffer?.view32;
    return requests.map((req) => {
      const startTime = process.hrtime.bigint();
      let score = 0;
      let passed = true;
      
      if (req.riskWeight > 0) {
        try {
          const pipelineEvent: SecurityEvent = {
            type: SyncEngine.mapRiskWeightToEventType(req.riskWeight),
            userId: String(req.packetId),
            guildId: "default",
            timestamp: Date.now(),
            payload: { riskWeight: req.riskWeight, packetId: req.packetId }
          };
          const result = SecurityPipeline.processEvent(pipelineEvent);
          score = result.score;
          passed = !result.blocked;
        } catch {
          // Fail-closed: block packet when security pipeline errors
          score = 100;
          passed = false;
        }
      }
      
      if (view32) {
        const slot = (req.packetId % 1000) * 4;
        view32[slot] = req.packetId;
        view32[slot + 1] = Math.floor(req.riskWeight * 1000);
        let checksum = 0xABCD1234;
        checksum = (checksum ^ req.packetId) << 3;
        view32[slot + 2] = checksum;
      }
      const endTime = process.hrtime.bigint();
      const latencyMicros = Math.max(1, Math.round(Number(endTime - startTime) / 1000));
      return { passed, latencyMicros, score };
    });
  }

  private fallbackComputeHashes(requests: HashRequest[]): Array<{ hash: string; latencyMicros: number }> {
    return requests.map((req) => {
      const startTime = process.hrtime.bigint();
      const dataStr = typeof req.data === "string" ? req.data : String(req.data ?? "");
      const buf = Buffer.from(dataStr, "utf8");
      let hash: string;
      switch (req.algorithm) {
        case "sha256":
          hash = createHash("sha256").update(buf).digest("hex");
          break;
        case "sha512":
          hash = createHash("sha512").update(buf).digest("hex");
          break;
        case "crc32": {
          let crc = 0xffffffff;
          for (let i = 0; i < buf.length; i++) {
            const byte = buf[i];
            crc ^= byte;
            for (let j = 0; j < 8; j++) {
              crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
            }
          }
          hash = ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
          break;
        }
        default:
          hash = createHash("sha256").update(buf).digest("hex");
      }
      const endTime = process.hrtime.bigint();
      const latencyMicros = Math.max(1, Math.round(Number(endTime - startTime) / 1000));
      return { hash, latencyMicros };
    });
  }
}

// ========== Sync Fallback Engine ==========
class SyncEngine {
  private memoryBuffer: ArrayBuffer;
  private view32: Uint32Array;
  private floatView: Float64Array;
  private auditCounter = 0;
  private lastLatencyMicros = 12;
  private startTimeMs = Date.now();
  private metrics: CppEngineMetrics;

  constructor() {
    try {
      this.memoryBuffer = new ArrayBuffer(16 * 1024 * 1024);
      this.view32 = new Uint32Array(this.memoryBuffer);
      this.floatView = new Float64Array(this.memoryBuffer, 1024);
    } catch {
      this.memoryBuffer = new ArrayBuffer(8 * 1024 * 1024);
      this.view32 = new Uint32Array(this.memoryBuffer);
      this.floatView = new Float64Array(this.memoryBuffer, 512);
    }

    this.metrics = {
      engineName: "High-Performance ArrayBuffer Security Fallback",
      architecture: `${os.arch()} Optimized Memory Engine`,
      status: "ACTIVE_MICROSECOND",
      memoryAllocatedBytes: this.memoryBuffer.byteLength,
      memoryUsedMB: 0,
      averageLatencyMicroseconds: 12,
      throughputPerSecond: 0,
      simdAcceleration: false,
      activeThreads: os.cpus().length || 1,
      totalAuditsProcessed: 0
    };
  }

  scanSecurityPacket(packetId: number, riskWeight: number): { passed: boolean; latencyMicros: number; score: number } {
    const startTime = process.hrtime.bigint();
    try {
      const pipelineEvent: SecurityEvent = {
        type: SyncEngine.mapRiskWeightToEventType(riskWeight),
        userId: String(packetId),
        guildId: "default",
        timestamp: Date.now(),
        payload: { riskWeight, packetId }
      };
      const pipelineResult = SecurityPipeline.processEvent(pipelineEvent);
      const latencyMicros = Math.max(1, Math.round(Number(process.hrtime.bigint() - startTime) / 1000));
      return {
        passed: !pipelineResult.blocked,
        latencyMicros,
        score: pipelineResult.score
      };
    } catch {
      const latencyMicros = Math.max(1, Math.round(Number(process.hrtime.bigint() - startTime) / 1000));
      // Fail-closed: block packet when security pipeline errors
      return { passed: false, latencyMicros, score: 100 };
    }
  }

  static mapRiskWeightToEventType(riskWeight: number): string {
    if (riskWeight >= 80) return "permission_update";
    if (riskWeight >= 60) return "webhook_update";
    if (riskWeight >= 40) return "role_update";
    if (riskWeight >= 20) return "channel_delete";
    return "guild_kick";
  }

  getMetrics(): CppEngineMetrics {
    const elapsedSec = Math.max(1, (Date.now() - this.startTimeMs) / 1000);
    const calculatedThroughput = Math.round(this.auditCounter / elapsedSec);
    const memUsage = process.memoryUsage();
    return {
      ...this.metrics,
      memoryAllocatedBytes: this.memoryBuffer.byteLength,
      memoryUsedMB: parseFloat(((memUsage.heapUsed + (memUsage.arrayBuffers || 0)) / 1024 / 1024).toFixed(2)),
      averageLatencyMicroseconds: this.lastLatencyMicros,
      throughputPerSecond: calculatedThroughput,
      totalAuditsProcessed: this.auditCounter
    };
  }

  resetMetrics() {
    this.auditCounter = 0;
    this.startTimeMs = Date.now();
    this.lastLatencyMicros = 12;
  }
}

const syncEngine = new SyncEngine();
const workerEngine = new WorkerEngine();

// Try loading native C++ module at import time (non-blocking)
tryLoadNativeModule();

export class CppNativeEngine {
  private static initialized = false;
  private static engineMode: "native" | "worker" | "sync" = "sync";

  static getEngineMode(): "native" | "worker" | "sync" {
    return this.engineMode;
  }

  static reset(): void {
    this.initialized = false;
    this.engineMode = "sync";
    workerEngine.reset();
    syncEngine.resetMetrics();
    nativeInstance = null;
    nativeAvailable = false;
    nativeModule = null;
    try {
      const { SecurityPipeline } = require('./security/Pipeline.js');
      SecurityPipeline.reset();
    } catch {
      // ignore
    }
  }

  static async initEngine() {
    if (this.initialized) return;

    // Priority 1: Native C++ module
    if (!nativeInstance) {
      try {
        nativeInstance = tryLoadNativeModule();
      } catch {
        // ignore
      }
    }

    if (nativeInstance) {
      this.engineMode = "native";
      console.log("⚡ [ENGINE] Initialized with Native C++ (N-API) module.");
      this.initialized = true;
      return;
    }

    // Priority 2: Worker Threads
    await workerEngine.initialize();
    if (workerEngine['workerReady']) {
      this.engineMode = "worker";
      console.log("⚡ [ENGINE] Initialized with Worker-Thread engine.");
    } else {
      this.engineMode = "sync";
      console.log("⚡ [ENGINE] Initialized with Sync fallback engine.");
    }

    this.initialized = true;
  }

  static scanSecurityPacket(packetId: number, riskWeight: number): { passed: boolean; latencyMicros: number; score: number } {
    const safePacketId = Number.isFinite(packetId) ? Math.floor(packetId) : 0;
    const safeRiskWeight = Number.isFinite(riskWeight) ? Math.max(0, Math.min(1000, riskWeight)) : 0;
    const startTime = process.hrtime.bigint();

    try {
      const pipelineEvent: SecurityEvent = {
        type: SyncEngine.mapRiskWeightToEventType(safeRiskWeight),
        userId: String(safePacketId),
        guildId: "default",
        timestamp: Date.now(),
        payload: { riskWeight: safeRiskWeight, packetId: safePacketId }
      };
      const pipelineResult = SecurityPipeline.processEvent(pipelineEvent);
      const latencyMicros = Math.max(1, Math.round(Number(process.hrtime.bigint() - startTime) / 1000));
      return {
        passed: !pipelineResult.blocked,
        latencyMicros,
        score: pipelineResult.score
      };
    } catch (err) {
      const latencyMicros = Math.max(1, Math.round(Number(process.hrtime.bigint() - startTime) / 1000));
      return syncEngine.scanSecurityPacket(safePacketId, safeRiskWeight);
    }
  }

  static async batchScanPackets(requests: ScanRequest[]): Promise<Array<{ passed: boolean; latencyMicros: number; score: number }>> {
    if (this.engineMode === "native" && nativeInstance) {
      try {
        const payload = requests.map(r => ({ packetId: r.packetId, event: buildScanEvent(r) }));
        const result = nativeInstance.scanBatch(payload);
        const arr: Array<{ passed: boolean; latencyMicros: number; score: number }> = [];
        for (let i = 0; i < result.length; i++) {
          const item = result[i];
          arr.push({
            passed: Boolean(item.passed),
            latencyMicros: typeof item.latencyMicros === 'number' ? item.latencyMicros : Number(item.latencyMicros),
            score: typeof item.score === 'number' ? item.score : Number(item.score)
          });
        }
        return arr;
      } catch {
        // fallback to worker
      }
    }
    return workerEngine.batchScanPackets(requests);
  }

  static async batchComputeHashes(requests: HashRequest[]): Promise<Array<{ hash: string; latencyMicros: number }>> {
    if (this.engineMode === "native" && nativeInstance) {
      try {
        const arr: Array<{ hash: string; latencyMicros: number }> = [];
        for (const r of requests) {
          const item = nativeInstance.computeHash(r.data, r.algorithm);
          arr.push({
            hash: String(item.hash),
            latencyMicros: typeof item.latencyMicros === 'number' ? item.latencyMicros : Number(item.latencyMicros)
          });
        }
        return arr;
      } catch {
        // fallback to worker
      }
    }
    return workerEngine.batchComputeHashes(requests);
  }

  static resetMetrics() {
    syncEngine.resetMetrics();
    workerEngine.resetMetrics().catch(() => {});
    if (nativeInstance) {
      try { nativeInstance.resetMetrics(); } catch {}
    }
  }

  static getMetrics(): CppEngineMetrics {
    if (this.engineMode === "native" && nativeInstance) {
      try {
        const m = nativeInstance.getMetrics();
        return {
          engineName: String(m.engineName || 'C++ Native Security Core'),
          architecture: String(m.architecture || 'Native'),
          status: String(m.status || 'ACTIVE_MICROSECOND') as any,
          memoryAllocatedBytes: typeof m.memoryAllocatedBytes === 'number' ? m.memoryAllocatedBytes : Number(m.memoryAllocatedBytes || 0),
          memoryUsedMB: typeof m.memoryUsedMB === 'number' ? m.memoryUsedMB : Number(m.memoryUsedMB || 0),
          averageLatencyMicroseconds: typeof m.averageLatencyMicroseconds === 'number' ? m.averageLatencyMicroseconds : Number(m.averageLatencyMicroseconds || 12),
          throughputPerSecond: typeof m.throughputPerSecond === 'number' ? m.throughputPerSecond : Number(m.throughputPerSecond || 0),
          simdAcceleration: Boolean(m.simdAcceleration),
          activeThreads: typeof m.activeThreads === 'number' ? m.activeThreads : Number(m.activeThreads || 1),
          totalAuditsProcessed: typeof m.totalAuditsProcessed === 'number' ? m.totalAuditsProcessed : Number(m.totalAuditsProcessed || 0)
        };
      } catch {
        // fallback
      }
    }
    const mainMetrics = syncEngine.getMetrics();
    return mainMetrics;
  }

  static async getWorkerMetrics(): Promise<CppEngineMetrics> {
    return workerEngine.getMetrics();
  }

  static async shutdown() {
    await workerEngine.shutdown();
  }
}
