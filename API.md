# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via one of:
- `Authorization: Bearer <token>` header
- `x-admin-key: <secret>` header
- `admin_session_token` cookie

## Endpoints

### Health & Status

#### GET /api/health
Public health check endpoint.

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

#### GET /api/config/public
Public configuration data.

**Response:**
```json
{
  "discordClientId": "123456789"
}
```

### Authentication

#### POST /api/auth/login
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

#### POST /api/auth/discord/login
Discord OAuth login.

**Request:**
```json
{
  "accessToken": "discord_access_token"
}
```

#### POST /api/auth/logout
Logout and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

#### GET /api/auth/session
Check current session status.

**Response:**
```json
{
  "authenticated": true,
  "username": "Admin",
  "mode": "session-token",
  "clientIp": "127.0.0.1"
}
```

### Discord Bot

#### GET /api/discord/status
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

#### POST /api/discord/connect
Connect Discord bot (requires auth).

**Request:**
```json
{
  "token": "bot_token",
  "clientId": "client_id"
}
```

#### POST /api/bot/lockdown
Toggle server lockdown (requires auth).

**Response:**
```json
{
  "success": true,
  "status": "lockdown"
}
```

### Enterprise & Analytics

#### GET /api/enterprise/status
Get cluster status (requires auth).

**Response:**
```json
{
  "highAvailability": true,
  "clusterCount": 1,
  "totalShards": 4,
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
  ]
}
```

#### GET /api/analytics/overview
Get analytics overview (requires auth).

**Response:**
```json
{
  "securityGraph": [...],
  "modPerformance": [...],
  "raidHistory": [...],
  "memberHeatmap": [...],
  "threatIntelFeed": [...]
}
```

### AI Services

#### POST /api/gemini/chat
Send message to Gemini AI (requires auth, rate limited).

**Request:**
```json
{
  "message": "Analyze server security",
  "history": []
}
```

**Response:**
```json
{
  "reply": "Analysis complete...",
  "sources": []
}
```

### GitHub Integration

#### GET /api/github/status
Get GitHub sync status (requires auth).

#### POST /api/github/push
Push code to GitHub (requires auth).

### Security

#### GET /api/bot/security-status
Get security statistics (requires auth).

#### POST /api/bot/simulate-100-nukers
Run nuke defense drill (requires auth).

#### GET /api/security/ultra-stats
Get advanced security stats (requires auth).

### C++ Engine

#### GET /api/cpp-engine/stats
Get C++ engine metrics (requires auth).

#### POST /api/cpp-engine/scan
Scan security packet (requires auth).

**Request:**
```json
{
  "packetId": 12345,
  "riskWeight": 1.2
}
```

### Admin & Whitelist

#### GET /api/admin/whitelist
Get whitelist (requires auth).

#### POST /api/admin/whitelist
Add to whitelist (requires auth).

**Request:**
```json
{
  "type": "ip",
  "value": "192.168.1.1",
  "note": "Admin home IP"
}
```

#### DELETE /api/admin/whitelist/:id
Remove from whitelist (requires auth).

#### GET /api/admin/audit-logs
Get audit logs (requires auth).

### Economy

#### GET /api/economy/leaderboard
Get leaderboard (requires auth).

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    { "rank": 1, "username": "user1", "level": 99, "xp": 142500, "coins": 45000 }
  ]
}
```

### Snapshots

#### GET /api/snapshots
List snapshots (requires auth).

#### POST /api/snapshots/create
Create snapshot (requires auth).

#### POST /api/snapshots/restore
Restore snapshot (requires auth).

### Downloads

#### GET /api/download/source
Download source code archive (requires auth).

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Rate Limits

- Global API: 150 requests per 15 minutes per IP
- AI endpoints: 10 requests per minute
- Heavy operations: 5 requests per 5 minutes

## Webhooks

### GitHub Webhook
- Path: `/api/github/webhook`
- Method: POST
- Signature: `X-Hub-Signature-256` header required
- Events: push, star, issues, pull_request

## WebSocket Events

The dashboard supports real-time updates via polling. WebSocket support is planned for future releases.
