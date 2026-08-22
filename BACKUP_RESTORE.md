# Backup and Restore Guide

## Backup Types

### Full Backup
Complete snapshot of all data including:
- Database records
- Configuration files
- User data
- Security logs
- Bot state

### Incremental Backup
Changes since last backup:
- Modified files only
- New records since last backup
- Reduced storage footprint

### Snapshot
Point-in-time server state:
- Channel configurations
- Role permissions
- Bot settings
- Quick restore capability

## Automatic Backup Configuration

### Schedule
```env
BACKUP_FREQUENCY=6h
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_COUNT=50
BACKUP_COMPRESSION=true
```

### What Gets Backed Up
- `data/` - Application data
- `config/` - Configuration files
- `logs/` - Audit logs
- `security/` - Security state
- `bot_state.json` - Discord bot state

## Manual Backup Commands

### Run Backup via API
```bash
curl -X POST http://localhost:3000/api/enterprise/mongo-backup \
  -H "Authorization: Bearer <token>"
```

### Run Backup via CLI
```bash
npm run backup
```

### List Backups
```bash
curl http://localhost:3000/api/snapshots \
  -H "Authorization: Bearer <token>"
```

### Create Snapshot
```bash
curl -X POST http://localhost:3000/api/snapshots/create \
  -H "Authorization: Bearer <token>"
```

## Restore Procedures

### Full Restore
1. Stop the application:
   ```bash
   npm run stop
   # or
   docker compose down
   ```

2. Restore from backup:
   ```bash
   npm run restore -- --backup-id=<backup-id>
   ```

3. Verify integrity:
   ```bash
   npm run verify -- --backup-id=<backup-id>
   ```

4. Restart application:
   ```bash
   npm start
   ```

### Partial Restore (Specific Data)
```bash
# Restore only audit logs
npm run restore -- --type=logs --backup-id=<id>

# Restore only bot state
npm run restore -- --type=state --backup-id=<id>
```

### Snapshot Restore
```bash
curl -X POST http://localhost:3000/api/snapshots/restore \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"snapshotId": "snap_123"}'
```

## Verification Steps

### Integrity Check
```bash
# Via API
curl -X POST http://localhost:3000/api/admin/backup-integrity-test \
  -H "Authorization: Bearer <token>"

# Via CLI
npm run verify
```

### What Gets Verified
- File checksums
- Database record counts
- Configuration validity
- Encryption integrity
- Dependency checksums

## Disaster Recovery

### Recovery Time Objective (RTO)
- Full restore: < 15 minutes
- Partial restore: < 5 minutes
- Snapshot restore: < 2 minutes

### Recovery Point Objective (RPO)
- With auto-backup: 6 hours maximum data loss
- With snapshots: < 24 hours for configuration

### DR Procedure
1. Assess damage and data loss scope
2. Provision new infrastructure if needed
3. Restore latest backup
4. Verify data integrity
5. Resume services with monitoring
6. Document incident for post-mortem

## Retention Policies

### Backup Retention
```env
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_COUNT=50
```

### Log Retention
```env
LOG_RETENTION_DAYS=90
AUDIT_LOG_MAX_ENTRIES=10000
```

### Snapshot Retention
- Keep last 10 snapshots
- Weekly snapshots retained for 4 weeks
- Monthly snapshots retained for 12 months

## Backup Storage

### Local Storage
```
/backups/
  ├── 2026-08-12T10-00-00.zip
  ├── 2026-08-12T16-00-00.zip
  └── metadata.json
```

### Cloud Storage (Optional)
Configure S3-compatible storage:
```env
BACKUP_CLOUD_PROVIDER=s3
BACKUP_CLOUD_BUCKET=my-backups
BACKUP_CLOUD_REGION=us-east-1
BACKUP_CLOUD_ACCESS_KEY=<key>
BACKUP_CLOUD_SECRET=<secret>
```

## Monitoring

### Backup Status
```bash
# Check backup history
curl http://localhost:3000/api/enterprise/mongo-redis \
  -H "Authorization: Bearer <token>"
```

### Alerts
Configure alerts for:
- Failed backups
- Backup storage full
- Old backups exceeding retention
- Backup integrity failures
