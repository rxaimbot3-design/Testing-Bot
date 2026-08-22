# Upgrade Guide

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-08-12 | Initial release with full feature set |

## Upgrade Procedure

### Pre-Upgrade Checklist
- [ ] Review CHANGELOG.md for breaking changes
- [ ] Backup current data
- [ ] Test upgrade in staging environment
- [ ] Notify users of maintenance window
- [ ] Prepare rollback plan

### Standard Upgrade

1. **Pull latest code**
```bash
git pull origin main
```

2. **Install dependencies**
```bash
npm ci --no-audit --no-fund --legacy-peer-deps
```

3. **Run migrations**
```bash
npm run migrate
```

4. **Build native addon**
```bash
npm run build:native
```

5. **Build application**
```bash
npm run build
```

6. **Restart service**
```bash
# Systemd
sudo systemctl restart discord-bot

# PM2
pm2 restart discord-bot

# Docker
docker compose up -d --force-recreate
```

7. **Verify deployment**
```bash
curl -f http://localhost:3000/api/health
```

## Breaking Changes

### v1.0.0
- Initial release, no breaking changes

## Migration Steps

### Environment Variables
New environment variables may be added in each version. Check CONFIG.md for the latest list.

### Database Schema
Automatic migrations handle schema changes. Run `npm run migrate` after upgrading.

### API Compatibility
- All API endpoints maintain backward compatibility within major versions
- Deprecated endpoints are removed in major versions only
- Check API.md for endpoint changes

## Rollback Procedures

### Immediate Rollback
```bash
# Git-based rollback
git checkout v0.9.0
npm ci
npm run build:native
npm run build
npm start

# Docker rollback
docker compose down
docker compose up -d --force-recreate image=app:v0.9.0
```

### Database Rollback
```bash
npm run migrate:rollback -- --to=v0.9.0
```

### Verify Rollback
```bash
curl -f http://localhost:3000/api/health
```

## Post-Upgrade Verification

1. Health check endpoint returns `healthy`
2. Discord bot connects successfully
3. Dashboard loads without errors
4. All tabs function correctly
5. API endpoints respond correctly
6. Logs show no errors
7. Performance metrics within expected range

## Troubleshooting Upgrades

### Migration Failures
```bash
# Check migration status
npm run migrate:status

# Rollback failed migration
npm run migrate:rollback
```

### Build Failures
```bash
# Clean and rebuild
npm run clean
npm ci
npm run build:native
npm run build
```

### Runtime Issues
```bash
# Check logs
tail -f logs/bot.log

# Verify configuration
npm run config:validate

# Run diagnostics
npm run doctor
```

## Support

For upgrade issues:
1. Check GitHub Issues
2. Review documentation
3. Contact support team
