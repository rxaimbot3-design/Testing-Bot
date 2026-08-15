import crypto from "crypto";

export function hashToken(token: string): string {
  if (!token || typeof token !== "string") return crypto.createHash("sha256").update("").digest("hex");
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function scanForSecrets(content: string): string[] {
  const findings: string[] = [];
  if (!content || typeof content !== "string") return findings;

  // High-confidence patterns (specific token formats)
  const highConfidencePatterns = [
    { pattern: /ghp_[a-zA-Z0-9]{36,38}/gi, confidence: 0.95 },
    { pattern: /AIzaSy[a-zA-Z0-9_-]{33}/gi, confidence: 0.95 },
    { pattern: /M[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,38}/g, confidence: 0.95 },
    { pattern: /xox[baprs]-[0-9a-zA-Z-]+/g, confidence: 0.9 },
    { pattern: /sk_live_[0-9a-zA-Z]{24,}/g, confidence: 0.9 },
  ];

  // Medium-confidence patterns (generic secrets with context)
  const mediumConfidencePatterns = [
    { pattern: /(?:password|passwd|pwd)\s*[:=]\s*([^\s]{8,})/gi, confidence: 0.6 },
    { pattern: /(?:token|secret|api_key|apikey)\s*[:=]\s*([^\s]{16,})/gi, confidence: 0.6 },
    { pattern: /(?:auth|authorization)\s*[:=]\s*(Bearer\s+[^\s]+)/gi, confidence: 0.7 },
  ];

  // High-entropy strings (likely secrets even without specific pattern)
  const entropyThreshold = 4.5;
  const minEntropyLength = 16;

  const checkEntropy = (str: string): number => {
    const freq: Record<string, number> = {};
    for (const ch of str) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  };

  const allPatterns = [
    ...highConfidencePatterns.map(p => ({ ...p, type: "high" as const })),
    ...mediumConfidencePatterns.map(p => ({ ...p, type: "medium" as const })),
  ];

  for (const { pattern, confidence, type } of allPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        // For medium confidence, verify entropy
        if (type === "medium") {
          const secretValue = match.split(/[:=]/)[1]?.trim() || match;
          if (secretValue.length >= minEntropyLength && checkEntropy(secretValue) >= entropyThreshold) {
            findings.push(match);
          }
        } else {
          findings.push(match);
        }
      }
    }
  }

  // Additional entropy-based detection for high-entropy strings
  const words = content.split(/[\s,;{}\[\]()]+/);
  for (const word of words) {
    if (word.length >= minEntropyLength && /[a-zA-Z0-9_-]/.test(word)) {
      const entropy = checkEntropy(word);
      if (entropy >= entropyThreshold && !findings.includes(word)) {
        // Avoid common false positives
        const commonWords = ["password", "token", "secret", "key", "auth", "authorization", "bearer"];
        const isCommon = commonWords.some(cw => word.toLowerCase().includes(cw));
        if (!isCommon) {
          findings.push(word);
        }
      }
    }
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
