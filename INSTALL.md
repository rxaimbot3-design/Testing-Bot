# Installation Guide

This guide covers installing the Enterprise Discord AI Bot on your system.

## Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** 9.0.0 or higher
- **libssl-dev** - OpenSSL development libraries
- **build-essential** - C++ compiler toolchain
- **python3** - For node-gyp builds
- **Redis** 7.0+ (optional, for caching)
- **ffmpeg** - For voice features

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y build-essential python3 libssl-dev ffmpeg curl
```

### macOS
```bash
brew install build-essential python3 openssl ffmpeg
```

### Windows (WSL2)
```bash
wsl --install
# Then follow Ubuntu instructions inside WSL2
```

## Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
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

This compiles the C++ native engine for maximum performance.

### 4. Build Worker Bundle
```bash
npm run build:worker
```

### 5. Build Frontend
```bash
npm run build
```

### 6. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your configuration (see CONFIG.md for all options).

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

## Troubleshooting

### Native Build Fails
Ensure you have all build dependencies:
```bash
# Ubuntu/Debian
sudo apt install -y build-essential python3 libssl-dev

# Rebuild
npm run build:native
```

### Bot Token Invalid
- Verify token in Discord Developer Portal
- Ensure privileged intents are enabled:
  - GUILD MEMBERS INTENT
  - MESSAGE CONTENT INTENT

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
