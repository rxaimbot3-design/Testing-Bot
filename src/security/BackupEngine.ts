import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface BackupMetadata {
  id: string;
  timestamp: string;
  version: number;
  size: number;
  encrypted: boolean;
  checksum: string;
  label?: string;
}

export class BackupEngine {
  private static backupDir = path.join(process.cwd(), "backups");
  private static encryptionKey: Buffer | null = null;
  private static retentionDays = 30;

  static init(encryptionKeyHex?: string): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (encryptionKeyHex) {
      this.encryptionKey = Buffer.from(encryptionKeyHex, "hex");
    }
  }

  static setRetentionDays(days: number): void {
    this.retentionDays = days;
  }

  static encrypt(data: string): string {
    if (!this.encryptionKey) return data;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return JSON.stringify({ encrypted, iv: iv.toString("hex"), authTag });
  }

  static decrypt(encryptedData: string): string {
    if (!this.encryptionKey) return encryptedData;
    try {
      const parsed = JSON.parse(encryptedData);
      const iv = Buffer.from(parsed.iv, "hex");
      const authTag = Buffer.from(parsed.authTag, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(parsed.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      throw new Error(`Decryption failed: ${(err as Error).message}`);
    }
  }

  static createBackup(data: any, label?: string): BackupMetadata {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    const id = `backup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify(data);
    const checksum = crypto.createHash("sha256").update(payload).digest("hex");
    const encrypted = this.encryptionKey ? this.encrypt(payload) : payload;
    const version = this.getNextVersion();

    const record = {
      id,
      timestamp,
      label,
      version,
      size: Buffer.byteLength(encrypted, "utf8"),
      encrypted: !!this.encryptionKey,
      checksum,
      data: encrypted,
    };

    fs.writeFileSync(path.join(this.backupDir, `${id}.json`), JSON.stringify(record, null, 2));
    this.enforceRetention();

    return {
      id,
      timestamp,
      version,
      size: record.size,
      encrypted: !!this.encryptionKey,
      checksum,
      label,
    };
  }

  static createIncrementalBackup(baseId: string, changes: any): BackupMetadata | null {
    const basePath = path.join(this.backupDir, `${baseId}.json`);
    if (!fs.existsSync(basePath)) return null;
    const base = JSON.parse(fs.readFileSync(basePath, "utf8"));
    const payload = JSON.stringify({ baseChecksum: base.checksum, changes });
    const checksum = crypto.createHash("sha256").update(payload).digest("hex");
    const id = `incr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const encrypted = this.encryptionKey ? this.encrypt(payload) : payload;

    const record = {
      id,
      baseId,
      timestamp: new Date().toISOString(),
      version: (base.version || 0) + 1,
      size: Buffer.byteLength(encrypted, "utf8"),
      encrypted: !!this.encryptionKey,
      checksum,
      data: encrypted,
    };

    fs.writeFileSync(path.join(this.backupDir, `${id}.json`), JSON.stringify(record, null, 2));
    return {
      id,
      timestamp: record.timestamp,
      version: record.version,
      size: record.size,
      encrypted: !!this.encryptionKey,
      checksum,
    };
  }

  static verifyBackup(backupId: string): boolean {
    const filePath = path.join(this.backupDir, `${backupId}.json`);
    if (!fs.existsSync(filePath)) return false;
    const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let payload: string;
    try {
      payload = record.encrypted ? this.decrypt(record.data) : record.data;
    } catch {
      return false;
    }
    const computed = crypto.createHash("sha256").update(payload).digest("hex");
    return computed === record.checksum;
  }

  static restoreBackup(backupId: string, verify = true): any {
    const filePath = path.join(this.backupDir, `${backupId}.json`);
    if (!fs.existsSync(filePath)) throw new Error("Backup not found");
    const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (verify && record.checksum) {
      let payload: string;
      try {
        payload = record.encrypted ? this.decrypt(record.data) : record.data;
      } catch {
        throw new Error("Backup integrity check failed: decryption error");
      }
      const computed = crypto.createHash("sha256").update(payload).digest("hex");
      if (computed !== record.checksum) {
        throw new Error("Backup checksum mismatch");
      }
      return JSON.parse(payload);
    }
    const payload = record.encrypted ? this.decrypt(record.data) : record.data;
    return JSON.parse(payload);
  }

  static listBackups(): BackupMetadata[] {
    if (!fs.existsSync(this.backupDir)) return [];
    const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith(".json"));
    const backups: BackupMetadata[] = [];
    for (const file of files) {
      try {
        const record = JSON.parse(fs.readFileSync(path.join(this.backupDir, file), "utf8"));
        backups.push({
          id: record.id,
          timestamp: record.timestamp,
          version: record.version,
          size: record.size,
          encrypted: record.encrypted,
          checksum: record.checksum,
          label: record.label,
        });
      } catch {
        // skip corrupted files
      }
    }
    return backups.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  static deleteBackup(backupId: string): boolean {
    const filePath = path.join(this.backupDir, `${backupId}.json`);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  static testRestore(backupId: string): { success: boolean; message: string } {
    try {
      const data = this.restoreBackup(backupId, true);
      return { success: true, message: `Backup ${backupId} restored successfully`, data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  static cleanupCorrupted(): string[] {
    if (!fs.existsSync(this.backupDir)) return [];
    const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith(".json"));
    const removed: string[] = [];
    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      try {
        const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!record.checksum || !record.data) {
          fs.unlinkSync(filePath);
          removed.push(file);
        }
      } catch {
        fs.unlinkSync(filePath);
        removed.push(file);
      }
    }
    return removed;
  }

  private static getNextVersion(): number {
    const existing = this.listBackups();
    return existing.length + 1;
  }

  private static enforceRetention(): void {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    const backups = this.listBackups();
    for (const backup of backups) {
      if (new Date(backup.timestamp).getTime() < cutoff) {
        this.deleteBackup(backup.id);
      }
    }
  }
}
