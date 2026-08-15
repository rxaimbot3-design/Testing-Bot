# Deployment Guide

## Table of Contents

1. [Local Development](#local-development)
2. [Docker](#docker)
3. [Railway](#railway)
4. [Render](#render)
5. [PM2](#pm2)
6. [Systemd](#systemd)
7. [Nginx Reverse Proxy](#nginx-reverse-proxy)
8. [SSL/TLS Setup](#ssltls-setup)
9. [Monitoring](#monitoring)

## Local Development

### Setup

```bash
git clone https://github.com/rxaimbot3-design/ultimate-discord-ai-bot.git
cd ultimate-discord-ai-bot
npm ci
npm run build:native
npm run dev
```

### Environment

```env
NODE_ENV=development
PORT=3000
ADMIN_SECRET=dev_secret_minimum_32_chars
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
GEMINI_API_KEY=your_key
```

### Access

- Dashboard: `http://localhost:3000`
- API: `http://localhost:3000/api`

## Docker

### Quick Start

```bash
docker compose up -d
```

### Build Image

```bash
docker build -t discord-ai-bot .
```

### Run Container

```bash
docker run -d \
  --name discord-bot \
  -p 3000:3000 \
  --env-file .env \
  -v ./data:/app/data \
  -v ./backups:/app/backups \
  -v ./snapshots:/app/snapshots \
  -v ./logs:/app/logs \
  discord-ai-bot
```

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed instructions.

## Railway

### Prerequisites

- Railway CLI installed
- Railway account linked

### Deploy

```bash
railway init
railway link
railway up
```

### Environment Variables

Set via Railway dashboard or CLI:

```bash
railway variables set DISCORD_BOT_TOKEN=xxx
railway variables set ADMIN_SECRET=xxx
railway variables set GEMINI_API_KEY=xxx
railway variables set NODE_ENV=production
```

### Configuration

`railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Render

### Configuration

`render.yaml`:
```yaml
services:
  - type: web
    name: discord-bot
    env: node
    plan: starter
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: ADMIN_SECRET
        generateValue: true
      - key: DISCORD_BOT_TOKEN
        sync: false
      - key: GEMINI_API_KEY
        sync: false
    disk:
      name: data
      mountPath: /app/data
      sizeGB: 1
```

### Deploy

1. Connect repository in Render dashboard
2. Select `render.yaml` configuration
3. Set environment variables
4. Deploy

## PM2

### Installation

```bash
npm install -g pm2
```

### Configuration

`ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'server-build/server.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### Commands

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
pm2 logs discord-bot
pm2 restart discord-bot
pm2 stop discord-bot
pm2 monit
```

## Systemd

### Service File

Create `/etc/systemd/system/discord-bot.service`:

```ini
[Unit]
Description=Enterprise Discord AI Bot
After=network.target redis.service

[Service]
Type=simple
User=botuser
WorkingDirectory=/opt/discord-bot
ExecStart=/usr/bin/node server-build/server.mjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/discord-bot/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Commands

```bash
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
sudo systemctl status discord-bot
sudo journalctl -u discord-bot -f
```

## Nginx Reverse Proxy

### Configuration

Create `/etc/nginx/sites-available/discord-bot`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client body size limit
    client_max_body_size 10M;

    # Proxy to application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable

```bash
sudo ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/TLS Setup

### Let's Encrypt (Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

### Self-Signed (Development)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout private.key \
  -out certificate.crt
```

## Monitoring

### Health Monitoring

```bash
# Check health endpoint
curl -f https://your-domain.com/api/health

# Monitor with cron
*/5 * * * * curl -f https://your-domain.com/api/health || echo "DOWN" | mail -s "Bot Down" admin@example.com
```

### Uptime Monitoring

- UptimeRobot
- Pingdom
- Datadog
- New Relic

### Log Aggregation

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana + Loki
- Datadog Logs
- CloudWatch (AWS)

### Metrics Collection

The application exposes metrics at:
- `/api/health` - System health
- `/api/cpp-engine/stats` - C++ engine metrics
- `/api/bot/security-status` - Security statistics
- `/api/enterprise/status` - Cluster status

## Secrets Management

### Environment Variables

All secrets should be stored in environment variables:

```env
DISCORD_BOT_TOKEN=xxx
ADMIN_SECRET=xxx
GEMINI_API_KEY=xxx
```

### Docker Secrets

For Docker deployments:

```yaml
services:
  app:
    secrets:
      - discord_token
      - admin_secret

secrets:
  discord_token:
    file: ./secrets/discord_token.txt
  admin_secret:
    file: ./secrets/admin_secret.txt
```

### Cloud Provider Secrets

- **Railway**: Use Railway Variables
- **Render**: Use Render Environment Variables
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **GCP**: Use Secret Manager

## Backup Strategy

### Automated Backups

Backups run automatically every 6 hours. Configure via:

```env
BACKUP_FREQUENCY=6h
BACKUP_RETENTION_DAYS=30
```

### Manual Backup

```bash
npm run backup
```

### Restore from Backup

```bash
npm run restore -- --backup-id=<backup-id>
```

## Scaling

### Horizontal Scaling

Scale the application service:

```bash
# Docker Compose
docker compose up -d --scale app=3

# PM2
pm2 scale discord-bot 4
```

### Redis Cluster

For production deployments with multiple app instances, consider using Redis Cluster or Redis Sentinel for high availability.

### Database

MongoDB can be scaled with:
- Replica sets for read scaling
- Sharding for large datasets
- Connection pooling

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

- Regular security audits via `npm audit`
- Automated vulnerability scanning
