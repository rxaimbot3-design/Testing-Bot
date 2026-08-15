import { MongoRedisEngine } from "../SecurityFeatures.js";

export class RedisRateLimiter {
  private static redisAvailable: boolean = false;

  static async init(): Promise<void> {
    try {
      await MongoRedisEngine.initRedis();
      this.redisAvailable = MongoRedisEngine.isRedisAvailable();
    } catch {
      this.redisAvailable = false;
    }
  }

  static async check(key: string, windowMs: number, maxRequests: number): Promise<boolean> {
    if (!this.redisAvailable) {
      return true; // Fallback to allow if Redis unavailable
    }

    try {
      const client = MongoRedisEngine['redisClient'];
      if (!client) return true;

      const now = Date.now();
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;

      // Remove old entries and add new one
      await client.zRemRangeByScore(redisKey, 0, windowStart);
      await client.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
      await client.expire(redisKey, Math.ceil(windowMs / 1000));

      const count = await client.zCard(redisKey);
      return count < maxRequests;
    } catch {
      return true; // Fallback to allow on error
    }
  }

  static isAvailable(): boolean {
    return this.redisAvailable;
  }
}
