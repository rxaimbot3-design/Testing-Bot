/**
 * TTL-aware Map wrapper with max entry limit and periodic cleanup.
 * Prevents unbounded memory growth in long-running production bots.
 */
export class TtlMap<K, V> {
  private map = new Map<K, { value: V; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: { ttlMs?: number; maxEntries?: number; autoCleanupMs?: number } = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
    this.maxEntries = options.maxEntries ?? 10000;
    if (options.autoCleanupMs && options.autoCleanupMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanup(), options.autoCleanupMs);
    }
  }

  set(key: K, value: V): void {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    this.enforceLimit();
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  get usage(): number {
    return this.map.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
      }
    }
  }

  private enforceLimit(): void {
    if (this.map.size <= this.maxEntries) return;
    // Remove oldest entries (FIFO eviction)
    const excess = this.map.size - this.maxEntries;
    const keys = Array.from(this.map.keys());
    for (let i = 0; i < excess && i < keys.length; i++) {
      this.map.delete(keys[i]);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.map.clear();
  }

  forEach(callbackfn: (value: V, key: K, map: TtlMap<K, V>) => void): void {
    this.map.forEach((entry, key) => callbackfn(entry.value, key, this));
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const [key, entry] of this.map) {
      if (Date.now() <= entry.expiresAt) {
        yield [key, entry.value];
      }
    }
  }

  entries(): IterableIterator<[K, V]> {
    const self = this;
    return (function* () {
      for (const [key, entry] of self.map) {
        if (Date.now() <= entry.expiresAt) {
          yield [key, entry.value];
        }
      }
    })();
  }

  keys(): IterableIterator<K> {
    const self = this;
    return (function* () {
      for (const [key, entry] of self.map) {
        if (Date.now() <= entry.expiresAt) {
          yield key;
        }
      }
    })();
  }

  values(): IterableIterator<V> {
    const self = this;
    return (function* () {
      for (const [, entry] of self.map) {
        if (Date.now() <= entry.expiresAt) {
          yield entry.value;
        }
      }
    })();
  }
}

/**
 * LRU Map wrapper with max entry limit.
 */
export class LruMap<K, V> {
  private map = new Map<K, V>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
