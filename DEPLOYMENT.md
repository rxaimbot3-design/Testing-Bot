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
git clone <repository-url>
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

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed Docker instructions.

Quick start:
```bash
docker compose up -d
```

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
```

### Configuration
Create `railway.json`:
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

### Prerequisites
- Render account
- GitHub repository connected

### Configuration
Create `render.yaml`:
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
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'server-build/server.cjs',
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

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
