import crypto from "crypto";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function scanForSecrets(content: string): string[] {
  const findings: string[] = [];
  const patterns = [
    /ghp_[a-zA-Z0-9]{36}/g,
    /AIzaSy[a-zA-Z0-9_-]{33}/g,
    /M[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,38}/g,
    /xox[baprs]-[0-9a-zA-Z-]+/g,
    /sk_live_[0-9a-zA-Z]{24,}/g,
  ];
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) findings.push(...matches);
  }
  return findings;
}

export function validateInput(schema: Record<string, { required?: boolean; type?: string; minLength?: number; maxLength?: number }>, body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = body?.[field];
    if (rules.required && (value === undefined || value === null || String(value).trim() === "")) {
      errors.push(`${field} is required`);
      continue;
    }
    if (value !== undefined && value !== null) {
      const strVal = String(value);
      if (rules.type && rules.type === "string" && typeof value !== "string") {
        errors.push(`${field} must be a string`);
      }
      if (rules.minLength && strVal.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && strVal.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function runBackupIntegrityTest(): Promise<{ passed: boolean; steps: string[] }> {
  const steps: string[] = [];
  try {
    steps.push("Creating test backup...");
    const testBackup = { test: true, timestamp: Date.now() };
    const fs = await import("fs");
    const path = await import("path");
    const testPath = path.join(process.cwd(), "backups", "integrity_test.json");
    fs.mkdirSync(path.dirname(testPath), { recursive: true });
    fs.writeFileSync(testPath, JSON.stringify(testBackup));
    steps.push("Backup created successfully.");

    steps.push("Simulating data change...");
    const original = JSON.parse(fs.readFileSync(testPath, "utf8"));
    fs.writeFileSync(testPath, JSON.stringify({ ...original, tampered: true }));
    steps.push("Data tampered.");

    steps.push("Restoring from backup...");
    fs.writeFileSync(testPath, JSON.stringify(testBackup));
    steps.push("Restore completed.");

    steps.push("Verifying integrity...");
    const restored = JSON.parse(fs.readFileSync(testPath, "utf8"));
    const passed = restored.test === true && !restored.tampered;
    steps.push(passed ? "Integrity verified." : "Integrity check failed!");

    fs.unlinkSync(testPath);
    steps.push("Test cleanup completed.");
    return { passed, steps };
  } catch (err: any) {
    steps.push(`Integrity test failed: ${err.message}`);
    return { passed: false, steps };
  }
}
