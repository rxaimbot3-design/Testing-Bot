import { MongoRedisEngine } from "../SecurityFeatures.js";

const LOCAL_FALLBACK_MAX_ENTRIES = 10000;
const LOCAL_FALLBACK_CLEANUP_MS = 5 * 60 * 1000;

export class RedisRateLimiter {
  private static redisAvailable: boolean = false;
  private static localRequests = new Map<string, number[]>();
  private static localCleanupTimer: NodeJS.Timeout | null = null;

  static async init(): Promise<void> {
    try {
      await MongoRedisEngine.initRedis();
      this.redisAvailable = MongoRedisEngine.isRedisConnected;
    } catch {
      this.redisAvailable = false;
    }
    this.startLocalCleanup();
  }

  private static startLocalCleanup(): void {
    if (this.localCleanupTimer) return;
    this.localCleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.localRequests.entries()) {
        const valid = timestamps.filter(t => now - t < 24 * 60 * 60 * 1000);
        if (valid.length === 0) {
          this.localRequests.delete(key);
        } else {
          this.localRequests.set(key, valid);
        }
      }
    }, LOCAL_FALLBACK_CLEANUP_MS);
  }

  static async check(key: string, windowMs: number, maxRequests: number): Promise<boolean> {
    if (this.redisAvailable) {
      try {
        const client = MongoRedisEngine['redisClient'];
        if (!client) {
          this.redisAvailable = false;
          return this.checkLocal(key, windowMs, maxRequests);
        }

        const now = Date.now();
        const windowStart = now - windowMs;
        const redisKey = `ratelimit:${key}`;

        await client.zRemRangeByScore(redisKey, 0, windowStart);
        await client.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
        await client.expire(redisKey, Math.ceil(windowMs / 1000));

        const count = await client.zCard(redisKey);
        return count < maxRequests;
      } catch {
        this.redisAvailable = false;
        return this.checkLocal(key, windowMs, maxRequests);
      }
    }

    return this.checkLocal(key, windowMs, maxRequests);
  }

  private static checkLocal(key: string, windowMs: number, maxRequests: number): boolean {
    const now = Date.now();
    const timestamps = this.localRequests.get(key) || [];

    if (this.localRequests.size > LOCAL_FALLBACK_MAX_ENTRIES) {
      const oldestKey = this.localRequests.keys().next().value;
      if (oldestKey) {
        this.localRequests.delete(oldestKey);
      }
    }

    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.localRequests.set(key, validTimestamps);
    return true;
  }

  static isAvailable(): boolean {
    return this.redisAvailable;
  }
}
