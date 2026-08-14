# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via one of:
- `Authorization: Bearer <token>` header
- `x-admin-key: <secret>` header
- `admin_session_token` cookie

**Authentication Methods:**
1. **Direct Secret**: Provide `ADMIN_SECRET` (32+ chars) as token
2. **Session Token**: Login to obtain a session token (24h expiry)
3. **Discord OAuth**: Discord access token for owner accounts

## Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Global API | 150 requests | 15 minutes per IP |
| AI endpoints | 10 requests | 1 minute |
| Heavy operations | 5 requests | 5 minutes |
| Login endpoints | 10 requests | 1 minute |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Health & Configuration

### GET /api/health
Public health check endpoint. Returns status of all subsystems.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-12T13:37:54.000Z",
  "uptime": 12345,
  "checks": {
    "api": { "status": "up", "latencyMs": 1 },
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "cppEngine": { "status": "up", "mode": "native" },
    "discordBot": { "status": "up" }
  },
  "version": "1.0.0"
}
```

### GET /api/health/detailed
Detailed health check with system metrics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-12T13:37:54.000Z",
  "uptime": 12345,
  "bot": {
    "connected": true,
    "latency": 18,
    "guilds": 10,
    "users": 5000
  },
  "gateway": {
    "latency": 18,
    "heartbeat": 18,
    "sessionId": "abc123"
  },
  "events": {
    "ratePerSecond": 25000,
    "lastEventTimestamp": "2026-08-12T13:37:54.000Z"
  },
  "system": {
    "cpu": 0.5,
    "ram": 256,
    "uptime": 12345,
    "nodeVersion": "v20.0.0"
  },
  "engine": {
    "status": "ACTIVE_MICROSECOND",
    "latencyMicros": 0.5,
    "throughput": 25000,
    "simd": false,
    "nativeLoaded": true
  },
  "workers": {
    "active": 4,
    "crashed": 0,
    "restarts": 0
  },
  "errorRate": {
    "last5min": 0,
    "last1hour": 0
  },
  "auditQueue": {
    "size": 100,
    "flushed": 100,
    "pending": 0
  }
}
```

### GET /api/config/public
Public configuration data.

**Response:**
```json
{
  "discordClientId": "123456789"
}
```

---

## Authentication Endpoints

### POST /api/auth/login
Admin authentication with secret key.

**Request:**
```json
{
  "adminKey": "your_admin_secret"
}
```

**Response:**
```json
{
  "success": true,
  "token": "session_abc123...",
  "username": "Admin",
  "mode": "admin-secret",
  "clientIp": "127.0.0.1",
  "expiresAt": 1234567890000
}
```

### POST /api/auth/discord/login
Discord OAuth login for server owners.

**Request:**
```json
{
  "accessToken": "discord_access_token"
}
```

**Response:**
```json
{
  "success": true,
  "token": "session_abc123...",
  "user": {
    "id": "123456789",
    "username": "owner",
    "discriminator": "0"
  }
}
```

### POST /api/auth/logout
Logout and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

### GET /api/auth/session
Check current session status.

**Response:**
```json
{
  "authenticated": true,
  "username": "Admin",
  "mode": "session-token",
  "clientIp": "127.0.0.1",
  "expiresAt": 1234567890000
}
```

### POST /api/auth/revoke-all
Revoke all active admin sessions (requires auth).

**Response:**
```json
{
  "success": true,
  "message": "All admin sessions have been revoked."
}
```

---

## Discord Bot Endpoints

### GET /api/discord/status
Get Discord bot status (requires auth).

**Response:**
```json
{
  "status": "online",
  "guilds": [{ "id": "...", "name": "Server", "memberCount": 1000 }],
  "latency": 18,
  "logs": []
}
```

### POST /api/discord/connect
Connect Discord bot with new credentials (requires auth).

**Request:**
```json
{
  "token": "bot_token",
  "clientId": "client_id"
}
```

### POST /api/discord/disconnect
Disconnect Discord bot and clear credentials (requires auth).

**Response:**
```json
{
  "success": true,
  "message": "Discord bot disconnected and reset."
}
```

### POST /api/bot/lockdown
Toggle server lockdown mode (requires auth, heavy rate limited).

**Response:**
```json
{
  "success": true,
  "status": "lockdown"
}
```

### POST /api/system/restart
Restart Discord bot subsystems gracefully (requires auth, heavy rate limited).

**Response:**
```json
{
  "success": true,
  "message": "Remote restart sequence completed."
}
```

---

## Security Endpoints

### GET /api/bot/security-status
Get security statistics (requires auth).

**Response:**
```json
{
  "blockedAttacksCount": 42,
  "securityScore": 95,
  "activeProtections": ["anti-raid", "anti-scam", "honeypot"]
}
```

### POST /api/bot/verify-audit
Execute manual channel permission audit (requires auth).

**Response:**
```json
{
  "success": true,
  "message": "Channel permission audit executed successfully.",
  "stats": { "blockedAttacksCount": 42, "securityScore": 95 }
}
```

### POST /api/bot/simulate-100-nukers
Run 100-nuker stress test drill (requires auth).

**Response:**
```json
{
  "success": true,
  "message": "Run 100 simultaneous advanced nukers stress test drill. 100% neutralized!",
  "stats": { "neutralized": 100, "bypasses": 0 }
}
```

### GET /api/security/ultra-stats
Get advanced security statistics (requires auth).

**Response:**
```json
{
  "behaviorHighRiskUsers": [],
  "honeypotTrapsActive": true,
  "sessionHijackMonitoring": true,
  "tokenRotationLastTime": 1234567890000,
  "hardwareFingerprint": "abc123...",
  "isPremiumActive": false
}
```

### POST /api/security/rotate-token
Rotate Discord bot token (requires auth, heavy rate limited).

**Request:**
```json
{
  "newToken": "new_bot_token"
}
```

### POST /api/security/oauth-scan
Scan guild OAuth integrations for malicious apps (requires auth, heavy rate limited).

**Response:**
```json
{
  "success": true,
  "scannedCount": 15,
  "threatsFound": 0,
  "status": "Clean - No malicious OAuth applications detected."
}
```

### GET /api/security/ai-raid-prediction
Get AI raid prediction (requires auth).

**Response:**
```json
{
  "riskPercentage": 15,
  "predictedTime": "2026-08-12T20:00:00.000Z",
  "factors": ["unusual join rate", "new accounts"],
  "recommendedAction": "enable verification"
}
```

### GET /api/security/ai-report
Generate AI security report (requires auth, AI rate limited).

**Response:**
```json
{
  "report": "Security analysis complete...",
  "generatedAt": "2026-08-12T13:37:54.000Z"
}
```

### POST /api/security/ai-assistant
Process natural language security command (requires auth, AI rate limited).

**Request:**
```json
{
  "prompt": "Block all new members joining in the next hour"
}
```

**Response:**
```json
{
  "reply": "Action executed: Enabled join lock for 1 hour."
}
```

### POST /api/security/ai-optimize
Optimize configuration via AI (requires auth, AI rate limited).

**Response:**
```json
{
  "optimizations": ["Increased rate limit", "Enabled strict mode"],
  "applied": true
}
```

---

## Admin & Whitelist Endpoints

### GET /api/admin/whitelist
Get admin whitelist (requires auth).

**Response:**
```json
{
  "success": true,
  "clientIp": "127.0.0.1",
  "isCurrentIpWhitelisted": true,
  "whitelist": [
    { "id": "1", "type": "ip", "value": "192.168.1.1", "note": "Admin home", "addedBy": "Admin" }
  ]
}
```

### POST /api/admin/whitelist
Add whitelist entry (requires auth).

**Request:**
```json
{
  "type": "ip",
  "value": "192.168.1.1",
  "note": "Admin home IP"
}
```

### DELETE /api/admin/whitelist/:id
Remove whitelist entry (requires auth).

**Response:**
```json
{
  "success": true,
  "message": "Whitelist entry removed successfully.",
  "whitelist": []
}
```

### GET /api/admin/audit-logs
Get admin audit logs (requires auth).

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2026-08-12T13:37:54.000Z",
      "action": "ADMIN_LOGIN",
      "actorIp": "127.0.0.1",
      "details": { "username": "Admin", "authMode": "admin-secret" }
    }
  ]
}
```

### POST /api/admin/backup-integrity-test
Run backup integrity test (requires auth).

**Response:**
```json
{
  "success": true,
  "passed": true,
  "message": "All backups verified successfully."
}
```

### POST /api/admin/secrets-scan
Scan target path for exposed secrets (requires auth).

**Request:**
```json
{
  "targetPath": "/app"
}
```

**Response:**
```json
{
  "success": true,
  "findingsCount": 0,
  "findings": []
}
```

---

## C++ Engine Endpoints

### GET /api/cpp-engine/stats
Get C++ engine metrics (requires auth).

**Response:**
```json
{
  "engineName": "Native High-Performance Security Core (N-API + OpenSSL EVP + CRC32)",
  "architecture": "x86_64 Native",
  "status": "ACTIVE_MICROSECOND",
  "memoryAllocatedBytes": 16777216,
  "memoryUsedMB": 2.45,
  "averageLatencyMicroseconds": 0.5,
  "p50LatencyMicroseconds": 0.4,
  "p95LatencyMicroseconds": 0.8,
  "p99LatencyMicroseconds": 1.2,
  "throughputPerSecond": 25000,
  "simdAcceleration": false,
  "activeThreads": 4,
  "totalAuditsProcessed": 150000,
  "latencySampleCount": 150000
}
```

### POST /api/cpp-engine/scan
Scan security packet (requires auth).

**Request:**
```json
{
  "packetId": 12345,
  "riskWeight": 1.2
}
```

**Response:**
```json
{
  "success": true,
  "engine": "C++ WASM Native Memory Core",
  "result": {
    "passed": true,
    "latencyMicros": 0.5,
    "score": 88
  }
}
```

---

## Enterprise Endpoints

### GET /api/enterprise/status
Get cluster and shard status (requires auth).

**Response:**
```json
{
  "highAvailability": true,
  "clusterCount": 1,
  "totalShards": 1,
  "shards": [
    {
      "clusterId": "Cluster-01",
      "shardId": 0,
      "status": "healthy",
      "guildCount": 10,
      "ping": 18,
      "memoryUsageMB": 256,
      "cpuUsagePct": 2.4,
      "uptimeMinutes": 1440
    }
  ],
  "zeroDowntimeRestartAvailable": true,
  "hotReloadAvailable": true,
  "dbReplicationLagMs": 0,
  "lastBackupTime": "13:37:54"
}
```

### POST /api/enterprise/zero-downtime-restart
Execute zero-downtime restart (requires auth, heavy rate limited).

**Response:**
```json
{
  "success": true,
  "message": "Zero-Downtime cluster restart executed in 200ms. Active HTTP sessions preserved.",
  "reloadedModules": ["EnvScanner", "IPBanSystem", "CppNativeEngine", "DiscordBotClient"]
}
```

### POST /api/enterprise/hot-reload
Hot reload security modules (requires auth, heavy rate limited).

**Request:**
```json
{
  "moduleName": "RateLimiter"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Modules [RateLimiter] hot-reloaded successfully.",
  "timestamp": "2026-08-12T13:37:54.000Z",
  "activeLicense": "Standard"
}
```

### GET /api/enterprise/mongo-redis
Get MongoDB and Redis statistics (requires auth).

**Response:**
```json
{
  "redisStats": { "connected": true, "usedMemory": "2.5M" },
  "mongoBackupStatus": {
    "connected": true,
    "lastBackup": "2026-08-12T12:37:54.000Z",
    "backupSizeMB": 14.8
  }
}
```

### POST /api/enterprise/mongo-backup
Create MongoDB backup (requires auth, heavy rate limited).

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-08-12T13:37:54.000Z",
  "sizeMB": 14.8,
  "location": "/app/backups/..."
}
```

---

## Analytics Endpoints

### GET /api/analytics/overview
Get analytics overview (requires auth).

**Response:**
```json
{
  "securityGraph": [
    { "time": "00:00", "attacksBlocked": 5, "riskScore": 12 },
    { "time": "04:00", "attacksBlocked": 3, "riskScore": 8 }
  ],
  "modPerformance": [
    { "name": "ASHTRON-AI (Bot)", "actionsCount": 42, "avgResponseMs": 12, "rating": "100/100" }
  ],
  "raidHistory": [
    { "id": "raid_live", "timestamp": "...", "type": "Mass Velocity Protection", "attackerCount": 42, "status": "Intercepted & Banned" }
  ],
  "memberHeatmap": [
    { "hour": "12:00", "joins": 80, "leaves": 1, "riskSpike": 5 }
  ],
  "threatIntelFeed": [
    { "id": "intel_1", "domainOrUser": "IP/User 1.2.3.4", "threatType": "Malicious Bot Attack", "status": "Global Zero-Trust IP Ban Enforced" }
  ]
}
```

---

## Music Endpoints

### GET /api/bot/music/state
Get music player state (requires auth).

**Query Parameters:**
- `guild_id` (optional): Guild ID (default: first available)

**Response:**
```json
{
  "success": true,
  "guildId": "123456789",
  "activeGuilds": [{ "id": "123", "name": "Server" }],
  "state": {
    "currentTrack": { "id": "track_123", "title": "Song", "url": "..." },
    "isPlaying": true,
    "isPaused": false,
    "positionSeconds": 30,
    "volume": 80,
    "queue": []
  }
}
```

### POST /api/bot/music/play
Play or queue a track (requires auth).

**Request:**
```json
{
  "guildId": "default_guild",
  "query": "Never Gonna Give You Up",
  "track": {
    "id": "track_123",
    "title": "Never Gonna Give You Up",
    "url": "https://..."
  }
}
```

### POST /api/bot/music/pause
Pause playback (requires auth).

**Request:**
```json
{
  "guildId": "default_guild"
}
```

### POST /api/bot/music/resume
Resume playback (requires auth).

### POST /api/bot/music/skip
Skip current track (requires auth).

### POST /api/bot/music/stop
Stop playback and clear queue (requires auth).

### POST /api/bot/music/volume
Set volume (requires auth).

**Request:**
```json
{
  "guildId": "default_guild",
  "volume": 80
}
```

### POST /api/bot/music/seek
Seek to position (requires auth).

**Request:**
```json
{
  "guildId": "default_guild",
  "positionSeconds": 120
}
```

### POST /api/bot/music/queue/clear
Clear queue (requires auth).

### POST /api/bot/music/setup-channel
Create music request channel (requires auth).

**Request:**
```json
{
  "guildId": "123456789"
}
```

### POST /api/bot/music/control
Unified music control endpoint (requires auth).

**Request:**
```json
{
  "guildId": "default_guild",
  "action": "play|pause|resume|skip|stop|volume|seek|shuffle|equalizer|retry|remove|queue/clear",
  "payload": {
    "query": "song name",
    "volume": 80,
    "index": 0,
    "equalizer": "bass"
  }
}
```

---

## Snapshot Endpoints

### GET /api/snapshots
List server snapshots (requires auth).

**Response:**
```json
{
  "snapshots": [
    {
      "id": "snap_123",
      "timestamp": "2026-08-12T13:37:54.000Z",
      "guildName": "My Server",
      "channelCount": 24,
      "roleCount": 12
    }
  ]
}
```

### POST /api/snapshots/create
Create server snapshot (requires auth, heavy rate limited).

**Response:**
```json
{
  "success": true,
  "snapshot": {
    "id": "snap_123",
    "timestamp": "2026-08-12T13:37:54.000Z",
    "guildName": "My Server",
    "channelCount": 24,
    "roleCount": 12
  }
}
```

### POST /api/snapshots/restore
Restore from snapshot (requires auth, heavy rate limited).

**Request:**
```json
{
  "snapshotId": "snap_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Server snapshot restore completed successfully! Channels and roles synchronized."
}
```

---

## Economy Endpoints

### GET /api/economy/leaderboard
Get economy leaderboard (requires auth).

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    { "rank": 1, "username": "rxaimbot3", "level": 99, "xp": 142500, "coins": 45000 }
  ]
}
```

---

## GitHub Endpoints

### GET /api/github/status
Get GitHub integration status (requires auth).

**Response:**
```json
{
  "configured": true,
  "webhookUrl": "https://your-domain.com/api/github/webhook",
  "linkedRepo": "rxaimbot3-design/ultimate-discord-ai-bot",
  "githubTokenConfigured": true
}
```

### GET /api/github/repos
List GitHub repositories (requires auth).

### POST /api/github/link-repo
Link a GitHub repository (requires auth).

**Request:**
```json
{
  "repo": "owner/repo-name"
}
```

### POST /api/github/save-token
Save GitHub personal access token (requires auth).

**Request:**
```json
{
  "token": "ghp_..."
}
```

### POST /api/github/create-repo
Create a new GitHub repository (requires auth).

**Request:**
```json
{
  "name": "new-repo",
  "description": "Repository description",
  "isPrivate": false
}
```

### POST /api/github/push
Push codebase to GitHub (requires auth).

**Request:**
```json
{
  "repo": "owner/repo",
  "commitMessage": "Update from dashboard",
  "branch": "main"
}
```

### POST /api/github/webhook
GitHub webhook receiver (no auth required, HMAC verification).

**Headers:**
- `X-Hub-Signature-256`: HMAC-SHA256 signature
- `X-GitHub-Delivery`: Unique delivery ID
- `X-GitHub-Event`: Event type

### POST /api/github/simulate
Simulate GitHub webhook event (requires auth).

**Request:**
```json
{
  "event": "push|star|issues"
}
```

---

## AI Endpoints

### POST /api/gemini/chat
Send message to Gemini AI (requires auth, AI rate limited).

**Request:**
```json
{
  "message": "Analyze server security",
  "history": [
    { "sender": "user", "text": "Hello" },
    { "sender": "assistant", "text": "Hi there!" }
  ]
}
```

**Response:**
```json
{
  "reply": "Analysis complete...",
  "sources": [
    { "title": "Source", "uri": "https://..." }
  ]
}
```

---

## Honeypot Endpoints

### ALL /api/honeypot-trap, /trap, /trap/:guildId, /trap/:guildId/:userId
Honeypot trap endpoints (no auth, requires valid canary token).

**Query Parameters:**
- `token`: Signed canary token
- `trap`: Trap name
- `guildId`: Guild ID
- `userId`: User ID

**Response (HTML):**
```html
<!DOCTYPE html>
<html>
<head><title>ACCESS DENIED</title></head>
<body>
  <div class="card">
    <h1>HONEYPOT TRAP TRIGGERED</h1>
    <p>IP BLACKLISTED: 1.2.3.4</p>
  </div>
</body>
</html>
```

---

## Download Endpoints

### GET /api/download/source
Download source code archive (requires auth).

**Response:** ZIP file containing all source code (excluding sensitive files).

### GET /eldenring.sk
Download Elden Ring Skript file.

### GET /server.properties
Download Minecraft server properties.

---

## GraphQL Endpoint

### POST /api/graphql
Dynamic GraphQL-style resolver (requires auth).

**Request:**
```json
{
  "query": "{ bot { status version } securityStats { blockedAttacksCount } }",
  "variables": {}
}
```

**Supported Queries:**
- `guild` / `server` - Guild information
- `bot` / `status` - Bot status
- `security` / `stats` - Security statistics
- `log` - Recent logs
- `cpp` / `wasm` / `engine` - C++ engine metrics
- `ban` / `ip` - IP ban data

---

## Premium Endpoints

### GET /api/premium/info
Get premium license information (requires auth).

**Response:**
```json
{
  "isPremium": false,
  "licenseKey": "PREMIUM-****-****",
  "hardwareFingerprint": "abc123...",
  "updateChecker": {
    "currentVersion": "v4.8.2-ULTRA",
    "latestVersion": "v4.8.2-ULTRA",
    "status": "Up to Date"
  }
}
```

### POST /api/premium/activate
Activate premium license (requires auth).

**Request:**
```json
{
  "licenseKey": "PREMIUM-ENT-XXXX-XXXX-XXXX"
}
```

---

## WebSocket Events

The dashboard supports real-time updates via HTTP polling (5-second intervals). Native WebSocket support is planned for future releases.

## Pagination

Most list endpoints return all data. For large datasets, use filtering parameters where available.

## Filtering

### Audit Logs
- Filter by action type
- Search by IP address
- Date range filtering

### Security Events
- Severity level filtering
- Time-based filtering
- User/IP filtering
