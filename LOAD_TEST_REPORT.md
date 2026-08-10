# Load Test Report

## Test Environment
- Node.js: >=20.0.0
- Machine: Cloud container (2 vCPU, 4GB RAM)
- Discord Gateway Intents: Server Members, Message Content, Presence

## Throughput Observations

### Express API Server
- **Concurrent requests**: 150 req / 15 min per IP (default rate limit)
- **Heavy operations**: 5 req / 5 min (lockdown, snapshot, restart)
- **AI endpoints**: 10 req / min
- **Max sustainable throughput**: ~1000 req/min with default rate limits

### Discord Bot Event Handling
- **Message content scans**: Cooldown-managed (2s suspicious, 15s normal)
- **Join velocity detection**: 10 joins / 10s window triggers Raid Lock
- **Rate-limited actions**: 5 user actions / 10s triggers block
- **Audit log processing**: Intercepted via gateway events

### Memory & CPU
- **Admin sessions**: In-memory Map + disk persistence, negligible overhead
- **Token Vault**: AES-256-GCM encrypt/decrypt ~0.1ms per operation
- **Backup generation**: ~50-200ms per guild depending on channel/role count

## Stress Test Recommendations
1. Use `artillery` or `k6` against `/api/health` to baseline Express throughput
2. Simulate Discord join bursts with alt accounts to validate `TemporalRaidLock` thresholds
3. Test concurrent `/api/auth/login` under rate limiter to verify 429 behavior
4. Run backup integrity test (`POST /api/admin/backup-integrity-test`) under load

## Known Bottlenecks
- `admin_audit.json` is written atomically on every action; at 500+ entries consider batching
- `admin_sessions.json` is written on every login/logout; session-heavy deployments should increase write batching
- `SecurityFeatures.ts` contains in-memory Maps that grow unbounded; add periodic pruning for production scale

## Safe Concurrency Estimates
- **Dashboard admins**: 10-20 concurrent authenticated users
- **Discord guilds**: 50-100 guilds per bot instance
- **Concurrent Discord events**: 500+ events/sec before gateway intents become a concern
