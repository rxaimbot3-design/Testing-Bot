# Concise Discord Security Platform Prompt

You are auditing a Discord security platform. Fix weaknesses, harden security, improve architecture, and make it production-grade. Do not add features, rewrite unnecessarily, break working functionality, fake tests, or add unsupported marketing claims.

## 1. Codebase Audit
Inspect entire repo; verify docs against implementation. Find: duplicate/dead code, race conditions, memory leaks, unsafe validation, error handling gaps, performance bottlenecks. Do not remove working features or create fake implementations.

## 2. C++ Native Engine
- Crypto: Real OpenSSL EVP SHA-256/SHA-512 with test vectors. CRC-32 only as non-crypto fallback.
- Safety: strict validation, bounds checking, overflow protection, safe strings, RAII, deterministic cleanup, N-API safety, malformed input handling.
- Concurrency: audit shared state; use atomics/mutexes where justified; thread-safe metrics, deterministic shutdown.
- Memory: audit allocators/caches/queues; add limits, TTL, backpressure; prevent leaks and unbounded growth.

## 3. Security Pipeline
Event → Validate → Normalize → Feature Extract → Rule Evaluate → Risk Score → Decision → Action
Decisions: PASS, FLAG, BLOCK. Never auto-block on AI alone.
Deterministic rules for: mass channel/role changes, permission escalation, mass ban/kick, unauthorized bots, webhook abuse, rapid destructive bursts, suspicious automation.
Prevent false positives: trusted users, whitelist, role hierarchy, cooldowns, deduplication, configurable thresholds.

## 4. AI Layer
AI = analysis only, never sole authority for destructive actions. Deterministic rules first. AI cannot bypass permission checks, whitelist, rate limits, or safety checks. Fallback to deterministic if AI unavailable.

## 5. Performance
Reproducible benchmarks: events/sec, batch/sec, p50/p95/p99 latency, CPU, memory, sustained throughput. Test 1K–500K events. Warmup runs, monotonic timing. Distinguish native engine throughput from Discord gateway throughput. No fake metrics.

## 6. Stability
30–60 min stress test. Monitor memory growth, CPU, throughput degradation, queue depth, crashes, recovery. Zero uncontrolled memory growth.

## 7. Simulation
Safe local simulations for: mass channel/role changes, permission escalation, bans/kicks, webhook abuse, unauthorized bots, raid bursts. Verify: detection, risk score, decision, mitigation, logging, recovery, no unintended damage. No destructive tests against real servers.

## 8. Backup/DR
Versioned backups, integrity verification, corruption detection, retention, atomic writes, selective/full restore, restore validation, rollback on failure. Test corrupted/incomplete backups.

## 9. I/O
Avoid write-per-event. Use event queue → batch → persistence. Bounded queues, backpressure, retry with exponential backoff, corruption handling. No unbounded logs/caches.

## 10. API/Web Security
Strict auth, secure OAuth, session security, CSRF/XSS protection, input validation, rate limiting, secure headers, CORS, request size limits, timeouts, SSRF protection, secure cookies, secret management. Never expose stack traces or secrets.

## 11. Dependencies
Audit for vulnerabilities, unnecessary/outdated packages, dangerous transitive deps. Add CI security scanning. Test all upgrades.

## 12. Testing
Real behavior tests, not coverage theater: C++ unit/integration, TS unit, API, dashboard, security rules, attack simulations, concurrency, fuzz, boundary, backup/restore, worker/native failure, regression.

## 13. Failure/Recovery
Every subsystem fails gracefully. Test: native addon unavailable, worker crash, DB down, corrupted data, API timeout, Discord error, rate limit, network failure, bad config, missing env vars, partial backup, unexpected shutdown.

## 14. Observability
Structured logs for: security events, detection latency, decisions, blocked/flagged counts, worker/native status, queue depth, memory, CPU, API/db errors, recovery events. Never log tokens, keys, passwords, or secrets.

## 15. Shutdown
SIGINT/SIGTERM: stop accepting work, flush queues, persist state, close DB, stop workers, release native resources, exit cleanly. Test it.

## 16. Code Quality
Strict TypeScript, proper types, naming, module boundaries, error classes, logging. Remove dead/duplicate code. Small, reviewable changes only.

## 17. CI/CD
lint → typecheck → unit → integration → C++ build → native tests → security scan → benchmark smoke → production build. Fail on critical test failures.

## 18. Documentation
Match real implementation. Include: architecture, security model, API docs, install, Docker, production deploy, config, troubleshooting, backup/restore, benchmark methodology/results, threat model, known limitations. No claims of "military-grade", "unbreakable", "zero bugs", "guaranteed latency/throughput" unless independently proven.

## 19. Threat Model
Cover: malicious/compromised admin, compromised bot, OAuth abuse, mass automation, webhook abuse, permission escalation, API abuse, malformed input, replay/duplicates, rate-limit exhaustion, DB corruption, worker/native failure. For each: Threat → Detection → Mitigation → Recovery → Logging.

## 20. Final Verification
Run: full build, native build, all tests, fuzz, stress, benchmark, secret audit, dependency audit, TS compilation, Docker build.
Verify: no secrets, no fake crypto/metrics, no placeholder security, no misleading docs, no broken features, no unbounded memory, no benchmark anomalies.
Generate final report: changes made, bugs fixed, security/performance improvements, test count, benchmark results, known limitations, remaining risks, overall quality score, production-readiness assessment.
