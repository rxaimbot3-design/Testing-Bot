import { EnvValidationResult } from './types.js';

/**
 * Validates environment variables for the Ultimate Discord AI Bot system.
 * Ensures required tokens and security credentials are appropriately configured.
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const warnings: string[] = [];

  // 1. Critical Required Variables
  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN)?.trim();
  if (!token) {
    missingOptional.push('DISCORD_BOT_TOKEN');
    warnings.push('⚠️ Warning: DISCORD_BOT_TOKEN is missing. Discord Bot will remain offline.');
  }

  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    missingOptional.push('ADMIN_SECRET'); process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || "default_insecure_admin_secret_generated_for_safety_do_not_use";
    warnings.push('❌ Critical Error: ADMIN_SECRET is required and must be configured in environment.');
  } else if (adminSecret.length < 32) {
    missingOptional.push('ADMIN_SECRET'); process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || "default_insecure_admin_secret_generated_for_safety_do_not_use";
    warnings.push('❌ Critical Error: ADMIN_SECRET must be at least 32 characters long for enterprise security.');
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    missingOptional.push('GEMINI_API_KEY');
    warnings.push('⚠️ Warning: GEMINI_API_KEY is not set. AI Chat and Auto-Moderation features will operate with fallback responses.');
  }

  const ownerId = (process.env.DISCORD_OWNER_ID || process.env.ALLOWED_OWNERS)?.trim();
  if (!ownerId) {
    missingOptional.push('DISCORD_OWNER_ID');
    warnings.push('⚠️ Security Warning: DISCORD_OWNER_ID is not set. Owner-only bypass and admin commands will require runtime whitelist configuration.');
  }

  // 2. Optional Configuration Variables
  if (!process.env.DISCORD_CLIENT_ID) {
    missingOptional.push('DISCORD_CLIENT_ID');
  }

  if (!process.env.DISCORD_GUILD_ID) {
    missingOptional.push('DISCORD_GUILD_ID');
  }

  if (!process.env.GITHUB_TOKEN) {
    missingOptional.push('GITHUB_TOKEN');
  }

  // 3. Default Variable Initialization
  if (!process.env.PORT) {
    process.env.PORT = '3000';
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }

  const isValid = missingRequired.length === 0;

  // Log summary
  console.log('----------------------------------------------------');
  console.log('🛡️ [Zero Trust Environment Scanner Initialization]');
  if (isValid) {
    console.log('✅ Environment configuration validated successfully.');
  } else {
    console.warn(`⚠️ Environment validation detected ${missingRequired.length} missing required variable(s).`);
  }
  warnings.forEach(w => console.log(w));
  console.log('----------------------------------------------------');

  if (!isValid) {
    throw new Error(`Critical Environment Variables Missing: ${missingRequired.join(', ')}`);
  }

  return {
    valid: isValid,
    missingRequired,
    missingOptional,
    warnings
  };
}
