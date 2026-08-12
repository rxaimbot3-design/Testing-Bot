# Installation Guide

## Prerequisites

### System Requirements

- **Node.js** 20.0.0 or higher
- **npm** 9.0.0 or higher
- **RAM** 512MB minimum, 2GB recommended
- **Disk** 1GB minimum for application and dependencies
- **Network** Stable internet connection for Discord/API access

### Build Dependencies

- **build-essential** or **Visual Studio Build Tools** - C++ compiler
- **python3** - For node-gyp builds
- **libssl-dev** - OpenSSL development libraries
- **ffmpeg** - For voice features (optional)

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y build-essential python3 libssl-dev ffmpeg curl git
```

### macOS

```bash
brew install build-essential python3 openssl ffmpeg git
```

### Windows (WSL2)

```bash
wsl --install
# Then follow Ubuntu instructions inside WSL2
```

### Docker Alternative

If you prefer containerized deployment, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md).

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/rxaimbot3-design/ultimate-discord-ai-bot.git
cd ultimate-discord-ai-bot
```

### 2. Install Dependencies

```bash
npm ci --no-audit --no-fund --legacy-peer-deps
```

### 3. Build Native Addon

```bash
npm run build:native
```

This compiles the C++ native engine for maximum performance. The output will be at `build/Release/security_engine.node`.

**Note:** If the native build fails, the engine will automatically fall back to the worker thread or sync mode.

### 4. Build Worker Bundle

```bash
npm run build:worker
```

### 5. Build Frontend

```bash
npm run build
```

This builds the React dashboard for production.

### 6. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration. See [CONFIG.md](./CONFIG.md) for all options.

### 7. First Run

```bash
npm start
```

Or for development with hot reload:
```bash
npm run dev
```

## Verification Steps

### 1. Check Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "api": { "status": "up" },
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "cppEngine": { "status": "up" },
    "discordBot": { "status": "up" }
  }
}
```

### 2. Verify Discord Bot Connection

Check that the bot appears online in your Discord server.

### 3. Test Admin Dashboard

Navigate to `http://localhost:3000` and log in with your `ADMIN_SECRET`.

### 4. Verify C++ Engine

```bash
curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/cpp-engine/stats
```

## Configuration

### Required Environment Variables

```env
# Discord Bot Credentials
DISCORD_BOT_TOKEN="your_discord_bot_token_here"
DISCORD_CLIENT_ID="your_discord_client_id_here"

# Server Owner
DISCORD_OWNER_ID="your_discord_user_id_here"

# Admin Secret (32+ characters)
ADMIN_SECRET="minimum_32_character_ultra_secure_admin_secret_key"

# Google Gemini AI
GEMINI_API_KEY="your_gemini_api_key_here"
```

### Optional Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV="production"
APP_URL="https://your-domain.com"

# GitHub Integration
GITHUB_TOKEN=""
GITHUB_WEBHOOK_SECRET=""

# Redis (if using external Redis)
REDIS_URL="redis://localhost:6379"

# Performance Tuning
UV_THREADPOOL_SIZE=128
NODE_OPTIONS="--max-old-space-size=450"
```

## Discord Developer Portal Setup

### Required Intents

Under the "Bot" section in Discord Developer Portal, enable:
1. **GUILD MEMBERS INTENT** - Required for verification, role auto-reverts, and member events
2. **MESSAGE CONTENT INTENT** - Required for scanning messages, AI moderation, and prefix commands

### Privileged Gateway Intents

1. Go to https://discord.com/developers/applications
2. Select your application
3. Navigate to "Bot" section
4. Enable "Presence Intent", "Server Members Intent", and "Message Content Intent"

## Troubleshooting

### Native Build Fails

Ensure you have all build dependencies:

```bash
# Ubuntu/Debian
sudo apt install -y build-essential python3 libssl-dev

# macOS
brew install build-essential python3 openssl

# Rebuild
npm run build:native
```

### Bot Token Invalid

- Verify token in Discord Developer Portal
- Ensure privileged intents are enabled
- Check token hasn't been regenerated

### Port Already in Use

Change port in `.env`:
```env
PORT=3001
```

### Redis Connection Failed

Start Redis server:
```bash
redis-server --daemonize yes
```

Or configure Redis connection in `.env`:
```env
REDIS_URL=redis://localhost:6379
```

### Permission Denied Errors

Ensure proper file permissions:
```bash
chmod 755 data backups snapshots logs
chmod 600 .env
```

### Out of Memory

Increase Node.js heap:
```env
NODE_OPTIONS=--max-old-space-size=450
```

## Systemd Service (Production)

Create `/etc/systemd/system/discord-bot.service`:

```ini
[Unit]
Description=Enterprise Discord AI Bot
After=network.target redis.service

[Service]
Type=simple
User=botuser
WorkingDirectory=/opt/discord-bot
ExecStart=/usr/bin/node server-build/server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/discord-bot/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
sudo systemctl status discord-bot
```

## PM2 Deployment

```bash
npm install -g pm2
pm2 start server-build/server.cjs --name discord-bot
pm2 save
pm2 startup
```

## Docker Deployment

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for containerized deployment.

Quick start:
```bash
docker compose up -d
```

## Environment Variables Reference

See [CONFIG.md](./CONFIG.md) for complete configuration reference.
