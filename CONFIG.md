# Configuration Reference

Complete reference for all environment variables and configuration options.

## Discord Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | - | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | - | Application client ID |
| `DISCORD_GUILD_ID` | No | - | Default guild ID for operations |
| `DISCORD_OWNER_ID` | Yes | - | Primary bot owner Discord user ID |
| `ALLOWED_OWNERS` | No | - | Comma-separated additional owner IDs |

## Security Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_SECRET` | Yes | - | 32+ character admin secret key |
| `GITHUB_WEBHOOK_SECRET` | No | - | GitHub webhook verification secret |
| `SESSION_SECRET` | No | - | Session encryption key (auto-generated if missing) |
| `SESSION_TIMEOUT` | No | `24h` | Admin session expiration time |
| `IP_WHITELIST_ENABLED` | No | `true` | Enable IP whitelist system |
| `RATE_LIMIT_WINDOW` | No | `15m` | Rate limiting window |
| `RATE_LIMIT_MAX` | No | `150` | Max requests per window |

## AI Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model to use |
| `AI_TIMEOUT` | No | `15000` | AI request timeout in ms |
| `AI_RATE_LIMIT` | No | `10/min` | AI endpoint rate limit |

## Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server listening port |
| `NODE_ENV` | No | `production` | Environment (development/production) |
| `APP_URL` | No | - | Public application URL |
| `ALLOWED_ORIGIN` | No | - | CORS allowed origin |
| `UV_THREADPOOL_SIZE` | No | `128` | Node.js thread pool size |

## Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | No | - | MongoDB connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |

## Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_AI_CHAT` | No | `true` | Enable AI chat features |
| `ENABLE_VOICE` | No | `true` | Enable voice features |
| `ENABLE_MUSIC` | No | `true` | Enable music features |
| `ENABLE_GITHUB_SYNC` | No | `true` | Enable GitHub synchronization |
| `ENABLE_ANALYTICS` | No | `true` | Enable analytics collection |
| `ENABLE_HONEYPOT` | No | `true` | Enable honeypot traps |
| `ENABLE_CANARY_TOKENS` | No | `true` | Enable canary token system |
| `ENABLE_TOKEN_ROTATION` | No | `true` | Enable automatic token rotation |

## Performance Tuning

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_OLD_SPACE_SIZE` | No | `450` | Max Node.js heap size in MB |
| `WORKER_THREADS` | No | `4` | Number of worker threads |
| `CACHE_TTL` | No | `300` | Default cache TTL in seconds |
| `COMPRESSION_ENABLED` | No | `true` | Enable response compression |

## Backup Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKUP_FREQUENCY` | No | `6h` | Automatic backup frequency |
| `BACKUP_RETENTION_DAYS` | No | `30` | Days to retain backups |
| `BACKUP_MAX_COUNT` | No | `50` | Maximum backup files to keep |
| `BACKUP_COMPRESSION` | No | `true` | Enable backup compression |

## Logging Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logging level (debug/info/warn/error) |
| `LOG_FILE` | No | `logs/bot.log` | Log file path |
| `LOG_MAX_SIZE` | No | `10m` | Max log file size |
| `LOG_MAX_FILES` | No | `5` | Max log files to keep |

## Security Recommendations

1. **ADMIN_SECRET**: Use a 64+ character random string
2. **DISCORD_BOT_TOKEN**: Never commit to version control
3. **GEMINI_API_KEY**: Restrict to specific APIs in Google Cloud Console
4. **GITHUB_TOKEN**: Use fine-grained PAT with minimal permissions
5. **REDIS_URL**: Use Redis AUTH in production
6. **ALLOWED_ORIGIN**: Restrict to your domain in production
