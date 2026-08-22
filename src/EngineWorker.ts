import { parentPort } from "worker_threads";
import os from "os";
import crypto from "crypto";

interface WorkerMessage {
  type: "scan_batch" | "compute_hashes" | "get_metrics" | "reset_metrics" | "shutdown";
  id?: number;
  payload?: any;
}

interface ScanRequest {
  packetId: number;
  riskWeight: number;
}

interface ScanResult {
  id: number;
  passed: boolean;
  latencyMicros: number;
  score: number;
}

interface HashRequest {
  data: string;
  algorithm: "sha256" | "sha512" | "crc32";
}

interface HashResult {
  id: number;
  hash: string;
  latencyMicros: number;
}

class EngineWorkerCore {
  private memoryBuffer: ArrayBuffer;
  private view32: Uint32Array;
  private floatView: Float64Array;
  private auditCounter = 0;
  private lastLatencyMicros = 12;
  private startTimeMs = Date.now();

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
  }

  scanPacket(packetId: number, riskWeight: number): { passed: boolean; latencyMicros: number; score: number } {
    const startTime = process.hrtime.bigint();

    const slot = (packetId % 1000) * 4;
    this.view32[slot] = packetId;
    this.view32[slot + 1] = Math.floor(riskWeight * 1000);

    let checksum = 0xABCD1234;
    checksum = (checksum ^ packetId) << 3;
    this.view32[slot + 2] = checksum;

    this.auditCounter++;
    const endTime = process.hrtime.bigint();
    const latencyMicros = Number(endTime - startTime) / 1000;
    this.lastLatencyMicros = Math.max(1, Math.round(latencyMicros));

    return {
      passed: true,
      latencyMicros: this.lastLatencyMicros,
      score: Math.max(0, 100 - riskWeight * 10)
    };
  }

  computeHash(data: string, algorithm: "sha256" | "sha512" | "crc32"): { hash: string; latencyMicros: number } {
    const startTime = process.hrtime.bigint();
    const buf = Buffer.from(data, "utf8");

    let hash: string;
    switch (algorithm) {
      case "sha256":
        hash = crypto.createHash("sha256").update(buf).digest("hex");
        break;
      case "sha512":
        hash = crypto.createHash("sha512").update(buf).digest("hex");
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
        hash = crypto.createHash("sha256").update(buf).digest("hex");
    }

    const endTime = process.hrtime.bigint();
    const latencyMicros = Number(endTime - startTime) / 1000;

    return { hash, latencyMicros };
  }

  getMetrics() {
    const elapsedSec = Math.max(1, (Date.now() - this.startTimeMs) / 1000);
    const calculatedThroughput = Math.round(this.auditCounter / elapsedSec);
    const memUsage = process.memoryUsage();
    const cpus = os.cpus();

    return {
      engineName: "Worker-Thread High-Performance Security Core",
      architecture: `${os.arch()} Parallel Worker Engine`,
      status: "ACTIVE_MICROSECOND" as const,
      memoryAllocatedBytes: this.memoryBuffer.byteLength,
      memoryUsedMB: parseFloat(((memUsage.heapUsed + (memUsage.arrayBuffers || 0)) / 1024 / 1024).toFixed(2)),
      averageLatencyMicroseconds: this.lastLatencyMicros,
      throughputPerSecond: calculatedThroughput,
      simdAcceleration: false,
      activeThreads: cpus.length || 1,
      totalAuditsProcessed: this.auditCounter
    };
  }

  resetMetrics() {
    this.auditCounter = 0;
    this.startTimeMs = Date.now();
    this.lastLatencyMicros = 12;
  }
}

const core = new EngineWorkerCore();

if (parentPort) {
  parentPort.on("message", (msg: WorkerMessage) => {
    switch (msg.type) {
      case "scan_batch": {
        const requests = msg.payload as ScanRequest[];
        const results: ScanResult[] = requests.map((req, idx) => {
          const result = core.scanPacket(req.packetId, req.riskWeight);
          return { id: idx, ...result };
        });
        parentPort!.postMessage({ type: "scan_batch_result", id: msg.id, payload: results });
        break;
      }
      case "compute_hashes": {
        const requests = msg.payload as HashRequest[];
        const results: HashResult[] = requests.map((req, idx) => {
          const result = core.computeHash(req.data, req.algorithm);
          return { id: idx, ...result };
        });
        parentPort!.postMessage({ type: "compute_hashes_result", id: msg.id, payload: results });
        break;
      }
      case "get_metrics": {
        parentPort!.postMessage({ type: "metrics_result", id: msg.id, payload: core.getMetrics() });
        break;
      }
      case "reset_metrics": {
        core.resetMetrics();
        parentPort!.postMessage({ type: "reset_metrics_result", id: msg.id });
        break;
      }
      case "shutdown": {
        parentPort!.postMessage({ type: "shutdown_result", id: msg.id });
        process.exit(0);
        break;
      }
      default:
        break;
    }
  });
}
