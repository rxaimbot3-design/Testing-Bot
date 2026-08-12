import fs from 'fs';
import path from 'path';
import { Migration } from '../src/db/Migrator';

const dataDir = path.join(process.cwd(), 'data');

async function run() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const migrations: Migration[] = [
    {
      id: '001_initial_schema',
      name: 'Initial database schema',
      up: async () => {
        const schema = {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          collections: ['security_events', 'audit_logs', 'bot_state', 'user_profiles'],
          settings: {
            retentionDays: 30,
            compressionEnabled: true,
            encryptionEnabled: true
          }
        };
        fs.writeFileSync(path.join(dataDir, 'schema.json'), JSON.stringify(schema, null, 2));
        console.log('  Created schema.json');
      },
      down: async () => {
        const schemaPath = path.join(dataDir, 'schema.json');
        if (fs.existsSync(schemaPath)) {
          fs.unlinkSync(schemaPath);
          console.log('  Removed schema.json');
        }
      }
    },
    {
      id: '002_add_audit_logs',
      name: 'Add audit logs structure',
      up: async () => {
        const auditStructure = {
          version: '2.0.0',
          createdAt: new Date().toISOString(),
          auditLogs: [],
          retention: {
            maxEntries: 10000,
            autoPurge: true,
            purgeAfterDays: 90
          },
          indexing: {
            timestamp: true,
            userId: true,
            action: true,
            severity: true
          }
        };
        fs.writeFileSync(path.join(dataDir, 'audit_structure.json'), JSON.stringify(auditStructure, null, 2));
        console.log('  Created audit_structure.json');
      },
      down: async () => {
        const auditPath = path.join(dataDir, 'audit_structure.json');
        if (fs.existsSync(auditPath)) {
          fs.unlinkSync(auditPath);
          console.log('  Removed audit_structure.json');
        }
      }
    },
    {
      id: '003_add_backup_metadata',
      name: 'Add backup metadata tracking',
      up: async () => {
        const backupMeta = {
          version: '3.0.0',
          createdAt: new Date().toISOString(),
          backups: [],
          schedule: {
            frequency: '6h',
            retentionDays: 30,
            maxBackups: 50
          },
          verification: {
            autoVerify: true,
            testRestoreFrequency: 'weekly'
          }
        };
        fs.writeFileSync(path.join(dataDir, 'backup_metadata.json'), JSON.stringify(backupMeta, null, 2));
        console.log('  Created backup_metadata.json');
      },
      down: async () => {
        const backupPath = path.join(dataDir, 'backup_metadata.json');
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
          console.log('  Removed backup_metadata.json');
        }
      }
    }
  ];

  console.log('Running migrations...');
  for (const migration of migrations) {
    console.log(`Running ${migration.id}...`);
    await migration.up();
    console.log(`Completed ${migration.id}`);
  }
  console.log('All migrations completed successfully');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
