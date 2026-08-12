import fs from "fs";
import path from "path";

const SECRET_PATTERNS = [
  { name: "Discord Bot Token", pattern: /(M[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,38})/g },
  { name: "GitHub Personal Access Token", pattern: /(ghp_[a-zA-Z0-9]{36,38})/g },
  { name: "Google API Key", pattern: /(AIzaSy[a-zA-Z0-9_-]{33})/g },
  { name: "Slack Token", pattern: /(xox[baprs]-[0-9a-zA-Z-]+)/g },
  { name: "Stripe Live Key", pattern: /(sk_live_[0-9a-zA-Z]{24,})/g },
  { name: "Generic Secret", pattern: /(secret|password|api_key|token|credential)\s*[:=]\s*["']?[a-zA-Z0-9_\-]{16,}["']?/gi },
  { name: "Webhook URL", pattern: /(https?:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[a-zA-Z0-9_-]+)/g },
  { name: "Database URL", pattern: /(mongodb(\+srv)?:\/\/[^\s]+)/gi },
  { name: "JWT Secret", pattern: /(jwt_secret|JWT_SECRET)\s*[:=]\s*["']?[a-zA-Z0-9_\-]{16,}["']?/gi },
];

export interface SecretFinding {
  file: string;
  line: number;
  pattern: string;
  match: string;
  severity: "high" | "medium" | "low";
}

export function scanFile(filePath: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  try {
    if (!fs.existsSync(filePath)) return findings;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (const { name, pattern } of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const matches = lines[i].match(pattern);
        if (matches) {
          for (const match of matches) {
            findings.push({
              file: filePath,
              line: i + 1,
              pattern: name,
              match: maskSecret(match),
              severity: name.includes("Token") || name.includes("Key") || name.includes("Secret") ? "high" : "medium"
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`[SECRETS AUDIT] Failed to scan ${filePath}:`, err);
  }
  return findings;
}

export function auditSecrets(rootDir: string = process.cwd()): { clean: boolean; findings: SecretFinding[] } {
  const findings: SecretFinding[] = [];
  const ignoreDirs = new Set(["node_modules", ".git", "dist", "build", "server-build", "coverage"]);
  const ignoreFiles = new Set([".env", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
  const skipExtensions = new Set([".md", ".map"]);
  const skipPrefixes = ["tests/", "test/", "__tests__/"];

  function isGitignored(filePath: string): boolean {
    try {
      const { execSync } = require("child_process");
      execSync(`git check-ignore -q "${filePath}"`, { cwd: rootDir, encoding: "utf8" });
      return true;
    } catch {
      return false;
    }
  }

  function shouldSkip(filePath: string): boolean {
    const relative = path.relative(rootDir, filePath);
    if (skipPrefixes.some(p => relative.startsWith(p))) return true;
    if (skipExtensions.has(path.extname(relative))) return true;
    if (path.basename(relative) === ".env.example") return true;
    return false;
  }

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (ignoreDirs.has(entry.name)) continue;
      if (ignoreFiles.has(entry.name)) continue;
      if (shouldSkip(fullPath)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (isGitignored(fullPath)) continue;
        const fileFindings = scanFile(fullPath);
        findings.push(...fileFindings);
      }
    }
  }

  walk(rootDir);

  // Also check for .env file presence
  const envPath = path.join(rootDir, ".env");
  if (fs.existsSync(envPath)) {
    findings.push({
      file: envPath,
      line: 0,
      pattern: "Environment File",
      match: ".env file exists in repository",
      severity: "high"
    });
  }

  return {
    clean: findings.length === 0,
    findings
  };
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "***";
  return secret.slice(0, 4) + "***" + secret.slice(-4);
}
