type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  consecutiveFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private consecutiveFailures = 0;
  private halfOpenCalls = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeoutMs: options.resetTimeoutMs || 30000,
      halfOpenMaxCalls: options.halfOpenMaxCalls || 3,
    };
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeoutMs) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
      } else {
        if (fallback) return fallback();
        throw new Error("Circuit breaker is open");
      }
    }

    if (this.state === "half-open" && this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
      if (fallback) return fallback();
      throw new Error("Circuit breaker is half-open and max calls reached");
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) {
        try {
          return await fallback();
        } catch {}
      }
      throw err;
    }
  }

  private onSuccess() {
    this.successes++;
    if (this.state === "half-open") {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        this.state = "closed";
        this.failures = 0;
        this.consecutiveFailures = 0;
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = "open";
    }
  }

  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  reset() {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.consecutiveFailures = 0;
    this.halfOpenCalls = 0;
  }
}

export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  static get(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(options));
    }
    return this.breakers.get(name)!;
  }

  static reset(name: string) {
    const breaker = this.breakers.get(name);
    if (breaker) breaker.reset();
  }

  static getStats(name: string): CircuitStats | undefined {
    return this.breakers.get(name)?.getStats();
  }
}
