# 🛡️ Ultimate Enterprise Discord Bot & Security Dashboard

A state-of-the-art, production-ready Discord Bot featuring **Sub-17ms Zero Trust Defense**, integrated Google Gemini AI, a Real-Time Web Dashboard, and comprehensive Audit Logistics.

## 🌟 Architecture & Features

This project leverages a hybrid architecture combining a high-performance **Node.js/Express Server**, **Discord.js v14**, and a beautiful **React / Tailwind CSS** Dashboard.

### 🛡️ Zero Trust Security Engine
- **Sub-17ms Audit Polling:** Automatically intercepts malicious actions using Smart Polling with fallback retry mechanics, ensuring latency from the Discord API does not compromise security.
- **Immediate Neutralization:** Auto-kicks rogue bots, strips malicious admin permissions, and reverts channel/role deletions instantly.
- **Panic Lockdown Mode:** Engaged automatically if multiple destructive actions occur within a 3-second time window (e.g., 100-Nuker attack vectors).
- **Verified Role Matrix:** Hardened channel permission overrides using strict explicit denylists and allowlists.

### 🧠 Gemini AI Integration
- Built-in `/ask` slash command.
- Utilizes `@google/genai` to provide fast, context-aware answers to users seamlessly within Discord.

### 🌐 Real-Time Web Dashboard
- Beautifully designed UI with real-time status widgets.
- Monitors Active Security Guards, Server Load, Audit Logs, and AI Request metrics.
- Seamless connection between the Discord Client instance and the Express Backend via shared states.

## 🚀 Deployment Guide

This repository is strictly configured for production scale and easy deployment to containerized environments (e.g., Google Cloud Run, Heroku, Docker).

### Environment Variables
Create a `.env` file in the root directory:
```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here
```

### Installation & Build
```bash
# Install all dependencies
npm install

# Build the project (Bundles React via Vite and Node Server via esbuild)
npm run build

# Start the production server
npm start
```

### Local Development
```bash
# Starts the development server using tsx
npm run dev
```

## 🧪 Testing & Validation

The codebase includes an interactive Stress Testing Drill designed to validate metric counting, memory stability, and frontend responsiveness during high-load scenarios.

1. In your Discord server, type `/test-nuke-defense`.
2. The bot will dispatch simulated malicious event signatures.
3. Verify that the Dashboard increments "Blocked Attacks" correctly without dropping WebSocket/API connections.

## 📜 Security Disclaimer
While this software employs cutting-edge **Zero Trust Architecture** and rapid-response engines, no system is entirely invincible. It is strongly recommended to conduct your own penetration testing, keep a minimal footprint of Users with `Administrator` privileges, and rely on 2FA for all server staff. 

*Designed for maximum resilience against mass-nuker tools and rogue admins.*
