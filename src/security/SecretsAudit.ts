import fs from "fs";
import path from "path";
import crypto from "crypto";

const SECRET_PATTERNS = [
  { name: "Discord Bot Token", pattern: /(M[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,38})/g, confidence: 0.99 },
  { name: "GitHub Personal Access Token", pattern: /(ghp_[a-zA-Z0-9]{36,38})/g, confidence: 0.99 },
  { name: "Google API Key", pattern: /(AIzaSy[a-zA-Z0-9_-]{33})/g, confidence: 0.99 },
  { name: "Slack Token", pattern: /(xox[baprs]-[0-9a-zA-Z-]+)/g, confidence: 0.95 },
  { name: "Stripe Live Key", pattern: /(sk_live_[0-9a-zA-Z]{24,})/g, confidence: 0.99 },
  { name: "Generic Secret", pattern: /(secret|password|api_key|token|credential)\s*[:=]\s*["']?[a-zA-Z0-9_\-]{16,}["']?/gi, confidence: 0.4 },
  { name: "Webhook URL", pattern: /(https?:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[a-zA-Z0-9_-]+)/g, confidence: 0.9 },
  { name: "Database URL", pattern: /(mongodb(\+srv)?:\/\/[^\s]+)/gi, confidence: 0.85 },
  { name: "JWT Secret", pattern: /(jwt_secret|JWT_SECRET)\s*[:=]\s*["']?[a-zA-Z0-9_\-]{16,}["']?/gi, confidence: 0.7 },
];

function shannonEntropy(data: string): number {
  if (data.length === 0) return 0;
  const frequencies = new Map<string, number>();
  for (const char of data) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / data.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isLikelyFalsePositive(match: string, confidence: number, line: string): boolean {
  const lowerLine = line.toLowerCase();
  if (confidence < 0.6) {
    const falsePositiveIndicators = [
      "example", "sample", "test", "demo", "placeholder", "dummy", "fake",
      "your_", "replace", "change_me", "xxx", "TODO", "FIXME", "const",
      "let ", "var ", "function", "export", "import ", "require("
    ];
    for (const indicator of falsePositiveIndicators) {
      if (lowerLine.includes(indicator)) return true;
    }
  }
  if (confidence < 0.8 && match.length < 24) return true;
  if (shannonEntropy(match) < 3.0 && confidence < 0.9) return true;
  return false;
}

export interface SecretFinding {
  file: string;
  line: number;
  pattern: string;
  match: string;
  severity: "high" | "medium" | "low";
  confidence: number;
}

export function scanFile(filePath: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  try {
    if (!fs.existsSync(filePath)) return findings;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (const { name, pattern, confidence } of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const matches = lines[i].match(pattern);
        if (matches) {
          for (const match of matches) {
            if (isLikelyFalsePositive(match, confidence, lines[i])) continue;
            findings.push({
              file: filePath,
              line: i + 1,
              pattern: name,
              match: maskSecret(match),
              severity: confidence >= 0.9 ? "high" : confidence >= 0.7 ? "medium" : "low",
              confidence
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
      severity: "high",
      confidence: 1.0
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
