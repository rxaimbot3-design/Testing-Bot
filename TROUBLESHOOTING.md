# Troubleshooting Guide

## Common Issues

### Native Build Failures

**Symptom:** `npm run build:native` fails with compilation errors

**Solutions:**

1. **Missing build dependencies**
   ```bash
   # Ubuntu/Debian
   sudo apt install -y build-essential python3 libssl-dev

   # macOS
   brew install build-essential python3 openssl
   ```

2. **Node-gyp issues**
   ```bash
   npm rebuild node-gyp
   npm run build:native
   ```

3. **Python version mismatch**
   ```bash
   # Ensure Python 3.8+ is available
   python3 --version
   npm config set python python3
   ```

4. **OpenSSL not found**
   ```bash
   # Ubuntu/Debian
   sudo apt install libssl-dev

   # macOS
   brew install openssl
   export LDFLAGS="-L/usr/local/opt/openssl/lib"
   export CPPFLAGS="-I/usr/local/opt/openssl/include"
   ```

### Bot Not Connecting

**Symptom:** Discord bot shows offline in server

**Solutions:**

1. **Invalid token**
   - Verify token in Discord Developer Portal
   - Regenerate token if needed
   - Check for extra whitespace in `.env`

2. **Missing intents**
   - Enable GUILD MEMBERS INTENT
   - Enable MESSAGE CONTENT INTENT
   - Enable PRESENCE INTENT (if needed)

3. **Rate limited by Discord**
   - Wait 5-10 minutes
   - Check bot status in Developer Portal
   - Review rate limit logs

4. **Network issues**
   ```bash
   # Test Discord API connectivity
   curl -I https://discord.com/api/v10/gateway
   ```

### Port Already in Use

**Symptom:** `EADDRINUSE: address already in use`

**Solutions:**

1. **Find process using port**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Change port in `.env`**
   ```env
   PORT=3001
   ```

3. **Use port 0 for random port**
   ```env
   PORT=0
   ```

### Redis Connection Failed

**Symptom:** Redis connection errors in logs

**Solutions:**

1. **Start Redis**
   ```bash
   redis-server --daemonize yes
   redis-cli ping
   ```

2. **Check Redis URL**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. **Docker Redis**
   ```bash
   docker compose up redis -d
   docker compose logs redis
   ```

### Out of Memory

**Symptom:** `JavaScript heap out of memory`

**Solutions:**

1. **Increase heap size**
   ```env
   NODE_OPTIONS=--max-old-space-size=450
   ```

2. **Check for memory leaks**
   ```bash
    node --inspect server-build/server.mjs
   # Take heap snapshots and compare
   ```

3. **Reduce concurrent operations**
   ```env
   UV_THREADPOOL_SIZE=64
   ```

### Permission Denied

**Symptom:** `EACCES: permission denied`

**Solutions:**

1. **Fix file permissions**
   ```bash
   chmod 755 data backups snapshots logs
   chmod 600 .env
    chmod 644 server-build/server.mjs
   ```

2. **Check directory ownership**
   ```bash
   sudo chown -R $USER:$USER data backups snapshots logs
   ```

### Admin Authentication Failing

**Symptom:** 401 Unauthorized on all requests

**Solutions:**

1. **Check ADMIN_SECRET length**
   ```bash
   # Must be 32+ characters
   echo -n "$ADMIN_SECRET" | wc -c
   ```

2. **Verify session file**
   ```bash
   cat admin_sessions.json | head -1 | jq .
   ```

3. **Clear sessions and re-login**
   ```bash
   rm admin_sessions.json
   ```

### Discord Rate Limits

**Symptom:** Discord API 429 responses

**Solutions:**

1. **Reduce request frequency**
2. **Use proper intents**
3. **Implement backoff strategy**
4. **Check for runaway loops**

### C++ Engine Not Loading

**Symptom:** Engine falls back to sync mode

**Solutions:**

1. **Check native module exists**
   ```bash
   ls -la build/Release/security_engine.node
   ```

2. **Rebuild native module**
   ```bash
   npm run clean
   npm run build:native
   ```

3. **Check Node version compatibility**
   ```bash
   node --version  # Must be 20+
   ```

### GitHub Integration Failing

**Symptom:** GitHub API errors

**Solutions:**

1. **Verify token permissions**
   - `repo` scope required
   - `workflow` scope for Actions

2. **Check token format**
   ```bash
   # Should start with ghp_ or github_pat_
   echo $GITHUB_TOKEN | head -c 10
   ```

3. **Verify webhook secret**
   ```env
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   ```

### Dashboard Not Loading

**Symptom:** Blank page or 404 on frontend

**Solutions:**

1. **Rebuild frontend**
   ```bash
   npm run build
   ```

2. **Check Vite configuration**
   ```bash
   # Development mode
   npm run dev
   ```

3. **Verify static file serving**
   ```bash
   ls -la dist/
   ```

## Performance Tuning

### High CPU Usage

1. **Reduce thread pool**
   ```env
   UV_THREADPOOL_SIZE=64
   ```

2. **Enable worker clustering**
   ```bash
    pm2 start server-build/server.mjs -i max
   ```

3. **Profile CPU usage**
   ```bash
    node --cpu-prof server-build/server.mjs
   ```

### High Memory Usage

1. **Increase GC frequency**
   ```env
   NODE_OPTIONS="--max-old-space-size=450 --gc-interval=100"
   ```

2. **Disable unnecessary features**
   ```env
   DISABLE_MUSIC=true
   DISABLE_AI=true
   ```

3. **Monitor heap**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/health | jq '.checks.cppEngine'
   ```

### Slow API Responses

1. **Enable Redis caching**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

2. **Optimize database queries**
   - Add indexes
   - Reduce result sets
   - Use projections

3. **Enable compression**
   ```env
   ENABLE_COMPRESSION=true
   ```

### Rate Limit Issues

1. **Adjust limits in `.env`**
   ```env
   RATE_LIMIT_WINDOW=900000  # 15 minutes
   RATE_LIMIT_MAX=200
   ```

2. **Use Redis for distributed limits**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

## Debug Steps

### Enable Debug Logging

```env
NODE_ENV=development
DEBUG=*
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Auth test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your_secret"}'

# C++ engine test
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/cpp-engine/stats
```

### Check Logs

```bash
# Application logs
tail -f logs/app.log

# PM2 logs
pm2 logs discord-bot

# Systemd logs
sudo journalctl -u discord-bot -f

# Docker logs
docker compose logs -f app
```

### Database Connection

```bash
# Test Redis
redis-cli ping

# Test MongoDB
mongosh --eval "db.adminCommand('ping')"
```

## Recovery Procedures

### Reset Admin Sessions

```bash
rm admin_sessions.json
# Restart application
```

### Clear IP Bans

```bash
# Via API
curl -X DELETE http://localhost:3000/api/admin/ip-bans/all \
  -H "Authorization: Bearer $TOKEN"

# Via file
echo '[]' > ip_bans.json
```

### Restore from Backup

```bash
# List backups
ls -la backups/

# Restore latest
npm run restore -- --backup-id=latest
```

### Reset Security State

```bash
# Via API
curl -X POST http://localhost:3000/api/enterprise/zero-downtime-restart \
  -H "Authorization: Bearer $TOKEN"
```

## Getting Help

1. Check existing documentation
2. Review logs for error messages
3. Search GitHub issues
4. Create a new issue with:
   - Node.js version
   - OS and version
   - Error logs
   - Steps to reproduce
