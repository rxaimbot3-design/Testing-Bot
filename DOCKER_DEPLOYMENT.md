# Docker Deployment Guide

This guide covers deploying the Enterprise Discord AI Bot using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- At least 2GB of available RAM
- 5GB of available disk space

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd ultimate-discord-ai-bot
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure required environment variables in `.env`:
```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
ADMIN_SECRET=your_32_char_secure_secret
GEMINI_API_KEY=your_gemini_key
```

4. Start services:
```bash
docker compose up -d
```

5. Verify deployment:
```bash
curl http://localhost:3000/api/health
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application client ID |
| `ADMIN_SECRET` | Yes | 32+ character admin secret key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `NODE_ENV` | No | Set to `production` for production |
| `PORT` | No | Server port (default: 3000) |
| `UV_THREADPOOL_SIZE` | No | Thread pool size (default: 128) |

## Volume Mounts

The following volumes are configured:

- `./data:/app/data` - Application data
- `./backups:/app/backups` - Backup files
- `./snapshots:/app/snapshots` - Server snapshots
- `./logs:/app/logs` - Application logs
- `redis_data` (named) - Redis persistence

## Health Checks

### Application Health Check
```bash
curl -f http://localhost:3000/api/health
```

Expected response:
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

### Redis Health Check
```bash
docker compose exec redis redis-cli ping
```

## Logging

Logs are written to stdout and can be viewed with:

```bash
docker compose logs -f app
docker compose logs -f redis
```

For persistent logging, configure a log driver in `docker-compose.yml`:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Backup Strategy

### Automated Backups
Backups run automatically every 6 hours. Configure via environment variables:
```env
BACKUP_FREQUENCY=6h
BACKUP_RETENTION_DAYS=30
```

### Manual Backup
```bash
docker compose exec app npm run backup
```

### Restore from Backup
```bash
docker compose exec app npm run restore -- --backup-id=<backup-id>
```

## Scaling

### Horizontal Scaling
Scale the application service:
```bash
docker compose up -d --scale app=3
```

### Redis Cluster
For production deployments with multiple app instances, consider using Redis Cluster or Redis Sentinel for high availability.

## Troubleshooting

### Container fails to start
Check logs:
```bash
docker compose logs app
```

Common issues:
- Missing environment variables
- Port 3000 already in use
- Insufficient permissions on volume mounts

### Discord bot not connecting
Verify bot token and intents are configured in Discord Developer Portal.

### High memory usage
Adjust resource limits in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

### Performance optimization
- Use SSD storage for Redis volume
- Enable `UV_THREADPOOL_SIZE=128`
- Configure reverse proxy (Nginx) in front of application

## Security Considerations

- Never run as root (Dockerfile uses non-root `appuser`)
- Use secrets management (Docker Secrets or environment injection)
- Enable TLS termination at reverse proxy level
- Restrict container capabilities:
```yaml
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```
