import fs from 'fs';
import path from 'path';

export interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migrationsDir = path.join(process.cwd(), 'migrations');

export class Migrator {
  private static stateFile = path.join(process.cwd(), 'data', 'migration_state.json');

  private static ensureDataDir() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private static loadState(): string[] {
    this.ensureDataDir();
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        return Array.isArray(data) ? data : [];
      }
    } catch {
      // ignore
    }
    return [];
  }

  private static saveState(applied: string[]) {
    this.ensureDataDir();
    fs.writeFileSync(this.stateFile, JSON.stringify(applied, null, 2));
  }

  static async runPending(migrations: Migration[]): Promise<void> {
    const applied = this.loadState();
    const pending = migrations.filter(m => !applied.includes(m.id));

    console.log(`[MIGRATION] Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      try {
        console.log(`[MIGRATION] Running ${migration.id}: ${migration.name}`);
        await migration.up();
        applied.push(migration.id);
        this.saveState(applied);
        console.log(`[MIGRATION] Completed ${migration.id}`);
      } catch (err) {
        console.error(`[MIGRATION] Failed ${migration.id}:`, err);
        throw err;
      }
    }

    if (pending.length === 0) {
      console.log('[MIGRATION] No pending migrations');
    }
  }

  static async rollback(migrations: Migration[], targetId?: string): Promise<void> {
    const applied = this.loadState();
    const toRollback = targetId 
      ? migrations.filter(m => m.id === targetId && applied.includes(m.id))
      : migrations.filter(m => applied.includes(m.id)).reverse();

    for (const migration of toRollback) {
      try {
        console.log(`[MIGRATION] Rolling back ${migration.id}: ${migration.name}`);
        await migration.down();
        const idx = applied.indexOf(migration.id);
        if (idx >= 0) applied.splice(idx, 1);
        this.saveState(applied);
        console.log(`[MIGRATION] Rolled back ${migration.id}`);
      } catch (err) {
        console.error(`[MIGRATION] Rollback failed ${migration.id}:`, err);
        throw err;
      }
    }
  }

  static getStatus(migrations: Migration[]): { applied: string[]; pending: string[]; total: number } {
    const applied = this.loadState();
    const pending = migrations.filter(m => !applied.includes(m.id)).map(m => m.id);
    return { applied, pending, total: migrations.length };
  }
}
