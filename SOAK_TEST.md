# Soak Test Guide

This document describes how to run a long-duration soak test for the Discord bot to validate stability under sustained load.

## Prerequisites

- A dedicated test Discord server (do not use a production server)
- Bot token with administrator permissions in the test server
- `REDIS_URL` configured (optional but recommended)
- Node.js 20+ and npm installed

## Test Scenarios

### 1. Sustained Message Volume

Simulate normal to high message traffic for 2-4 hours.

```bash
# In a separate terminal, send messages at a controlled rate
for i in $(seq 1 1000); do
  curl -X POST "https://discord.com/api/v10/channels/{TEST_CHANNEL_ID}/messages" \
    -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content": "soak test message '$i'"}' &
  sleep 0.5
done
```

**Monitor:**
- Process memory usage (`process.memoryUsage()`)
- Event loop lag
- Native engine fallback triggers
- Audit log queue depth

### 2. Rapid Join/Leave Simulation

Trigger mass join events to test anti-raid heuristics.

```bash
# Create test invites and simulate joins
# Note: Actual join simulation requires external tools or Discord API access
# Monitor the bot's join velocity tracking and quarantine actions
```

**Monitor:**
- Join velocity calculations
- Quarantine trigger thresholds
- False positive rate

### 3. Permission Stress Test

Rapidly create/delete channels and roles to test anti-nuke hooks.

```bash
# Using Discord API or a test script
for i in $(seq 1 50); do
  curl -X POST "https://discord.com/api/v10/guilds/{TEST_GUILD_ID}/channels" \
    -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name": "soak-test-channel-'$i'", "type": 0}' &
  sleep 0.2
done
```

**Monitor:**
- Anti-nuke module response times
- Auto-heal trigger count
- Permission overwrite reconciliation

### 4. Redis Failover Test

If using Redis, test behavior when Redis becomes unavailable.

1. Start bot with Redis connected
2. Stop Redis service mid-test
3. Verify bot continues operating with in-memory fallback
4. Restart Redis
5. Verify bot reconnects and syncs state

**Monitor:**
- `MongoRedisEngine.isRedisConnected` status
- Rate limiter fallback activation
- Session cache coherence

### 5. C++ Native Engine Stress

Run repeated native engine scans to test worker thread stability.

```bash
# Use the built-in drill endpoint
curl -X POST "http://localhost:3000/api/bot/simulate-100-nukers" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Run this in a loop for 30-60 minutes.

**Monitor:**
- Native engine crash/recovery count
- Worker thread restarts
- Memory leaks in native addon

## Metrics to Collect

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Uptime | > 99.5% over test period | `/api/health` polling |
| Memory growth | < 50 MB/hour | `process.memoryUsage()` |
| Event loop lag | < 100ms p95 | `monitorEventLoopDelay()` |
| Native engine stability | 0 crashes | Worker restart count |
| Audit log persistence | 0 lost events | Queue depth vs flushed count |

## Passing Criteria

- No unhandled exceptions or crashes
- Memory usage stabilizes (no unbounded growth)
- All security modules remain operational
- Native engine runs without fallback to sync mode (if Redis available)
- Audit log queue never saturates

## Reporting

After soak test completion, save results to `SOAK_TEST_REPORT.md` with:
- Test duration
- Server/guild ID used
- Peak memory usage
- Any modules that triggered fallback
- Native engine mode at end of test
- Recommendations for production deployment
