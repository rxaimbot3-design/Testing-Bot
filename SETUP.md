# 🛡️ Ultimate Discord AI Bot - Enterprise Installation & Setup Guide

Welcome to the **Ultimate Discord AI Bot** setup guide. This enterprise-grade Discord bot features **Zero Trust Anti-Nuke Shield**, **Real-Time AI Auto-Moderation (powered by Google Gemini)**, **C++ Native High-Frequency Security Engine**, and a **Live Interactive Web Control Dashboard**.

---

## 📋 Prerequisites

Before setting up the bot, ensure you have the following installed and configured:

1. **Node.js**: Version **20.0.0 or higher**
2. **Discord Developer Account**: Access to [Discord Developer Portal](https://discord.com/developers/applications)
3. **Google AI Studio API Key**: Gemini API Key from [Google AI Studio](https://aistudio.google.com)
4. **Git**: Installed on your system

---

## ⚙️ Environment Variables Setup

Copy the template environment file to create your local `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in the required configuration variables:

```env
# 1. Discord Bot Credentials (Required)
DISCORD_BOT_TOKEN="your_discord_bot_token_here"
DISCORD_CLIENT_ID="your_discord_application_client_id_here"
DISCORD_GUILD_ID="your_optional_discord_guild_id_here"

# 2. Server Owner & Permission Administration (Required)
DISCORD_OWNER_ID="your_discord_user_id_here"
ALLOWED_OWNERS="additional_owner_id_1,additional_owner_id_2"

# 3. Google Gemini AI API Configuration (Required for AI features)
GEMINI_API_KEY="your_gemini_api_key_here"

# 4. Web Dashboard Server Configuration
PORT=3000
NODE_ENV="development"
APP_URL="http://localhost:3000"
ADMIN_SECRET="minimum_32_character_ultra_secure_admin_secret_key"

# 5. GitHub Integration (Optional)
GITHUB_TOKEN="your_github_personal_access_token_here"
```

**CRITICAL**: `ADMIN_SECRET` must be at least 32 characters. The server will refuse to start without a valid `ADMIN_SECRET`. Do not commit this value to version control. Use your hosting provider's environment secrets (Railway Variables, Render Environment, Docker secrets, etc.).

---

## 🤖 Discord Developer Portal Configuration

To ensure full functionality (Anti-Nuke, Member Tracking, Audit Log Interception), configure your bot on the Discord Developer Portal as follows:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Navigate to **Bot** -> **Add Bot**.
3. Under **Privileged Gateway Intents**, turn **ON** the following intents:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
4. Copy the **Bot Token** and set it as `DISCORD_BOT_TOKEN` in your `.env`.
5. Copy the **Application Client ID** and set it as `DISCORD_CLIENT_ID` in your `.env`.

### Bot Invite Link

Invite your bot to your Discord server using the generated OAuth2 URL with Administrator permissions (`permissions=8`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

---

## 🚀 Installation & Running

### 1. Install Dependencies

```bash
npm ci
```

### 2. Run in Development Mode

```bash
npm run dev
```

The Express server and Web Dashboard will start on `http://localhost:3000`, and the Discord bot will automatically authenticate and connect.

### 3. Production Build & Execution

```bash
# Build the TypeScript production bundle
npm run build

# Start production server
npm start
```

### 4. Production Deployment Checklist

- Set `ADMIN_SECRET` (32+ chars) in your hosting provider's environment variables.
- Set `ALLOWED_ORIGIN` or `APP_URL` to your dashboard domain for CORS restriction.
- Enable Privileged Gateway Intents in Discord Developer Portal.
- Run with `node server-build/server.mjs` (do NOT run `server.ts` directly in production).

---

## 🧪 Type Checking & Verification

Run the linter to verify full type safety across all files:

```bash
npm run lint
```

---

## 🛡️ Architecture & Security Features Overview

- **Zero Trust Anti-Nuke Shield**: Intercepts unauthorized channel deletions, role wipes, mass bans, and webhook exploits within sub-second thresholds.
- **Owner Lock System**: Only validated environment owner IDs (`DISCORD_OWNER_ID`) or explicitly whitelisted admin IDs can execute critical management commands.
- **Google Gemini AI Integration**: Powering live chat AI, sentiment monitoring, raid predictions, and natural language command interpretation.
- **C++ Native Acceleration**: High-frequency memory-cached security logic for instant packet parsing and audit log verification.
- **Live Web Control Panel**: Monitor bot latency, active shards, audit logs, and trigger emergency lockdown directly from the web interface.

---

## ❓ Troubleshooting & FAQs

- **Bot Status Shows Offline**:
  Ensure `DISCORD_BOT_TOKEN` is correct in `.env` and that all Gateway Intents are enabled in the Discord Developer Portal.
- **AI Features Not Responding**:
  Verify `GEMINI_API_KEY` is set and valid in `.env`.
- **Permission Denied on Admin Commands**:
  Confirm your Discord User ID matches `DISCORD_OWNER_ID` or is listed in `ALLOWED_OWNERS` in `.env`.
