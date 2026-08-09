import fs from "fs";

// 1. VoiceService.ts
let voiceContent = fs.readFileSync("src/services/VoiceService.ts", "utf-8");
voiceContent = voiceContent.replace(/export async function stopAudioInGuild([\s\S]*?)export async function pauseAudioInGuild/m, `export async function stopAudioInGuild(guildId: string) {
  try {
    const client = getClient();
    const targetGuildId = (client && client.guilds.cache.get(guildId)) ? guildId : (client?.guilds.cache.first()?.id || guildId);
    const player = guildPlayers.get(targetGuildId);
    if (player) {
      player.stop();
    }
    guildResources.delete(targetGuildId);
    const connection = getVoiceConnection(targetGuildId);
    if (connection) {
      connection.destroy();
    }
  } catch (err) {
    console.error("Error in stopAudioInGuild:", err);
  }
}

export async function pauseAudioInGuild`);

voiceContent = voiceContent.replace(/export async function pauseAudioInGuild([\s\S]*?)export async function resumeAudioInGuild/m, `export async function pauseAudioInGuild(guildId: string) {
  try {
    const client = getClient();
    const targetGuildId = (client && client.guilds.cache.get(guildId)) ? guildId : (client?.guilds.cache.first()?.id || guildId);
    const player = guildPlayers.get(targetGuildId);
    if (player) {
      player.pause();
    }
  } catch (err) {
    console.error("Error in pauseAudioInGuild:", err);
  }
}

export async function resumeAudioInGuild`);

voiceContent = voiceContent.replace(/export async function resumeAudioInGuild([\s\S]*?)export function setVolumeInGuild/m, `export async function resumeAudioInGuild(guildId: string) {
  try {
    const client = getClient();
    const targetGuildId = (client && client.guilds.cache.get(guildId)) ? guildId : (client?.guilds.cache.first()?.id || guildId);
    const player = guildPlayers.get(targetGuildId);
    if (player) {
      player.unpause();
    }
  } catch (err) {
    console.error("Error in resumeAudioInGuild:", err);
  }
}

export function setVolumeInGuild`);

fs.writeFileSync("src/services/VoiceService.ts", voiceContent);


// 2. Memory Cleanup in discord-bot.ts
let botContent = fs.readFileSync("discord-bot.ts", "utf-8");
if (!botContent.includes("Memory Leak Prevention Cleanup")) {
  botContent = botContent.replace("export async function startDiscordBot() {", `
// Memory Leak Prevention Cleanup Interval
safeSetInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of userSpamTracker.entries()) {
    const valid = timestamps.filter(t => now - t < 10000);
    if (valid.length === 0) userSpamTracker.delete(key);
    else userSpamTracker.set(key, valid);
  }
  for (const [key, data] of userViolations.entries()) {
    if (now - data.timestamp > 3600000) userViolations.delete(key);
  }
  for (const [key, timestamps] of guildBurstActions.entries()) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) guildBurstActions.delete(key);
    else guildBurstActions.set(key, valid);
  }
  for (const [key, timestamps] of guildPanicBurstActions.entries()) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) guildPanicBurstActions.delete(key);
    else guildPanicBurstActions.set(key, valid);
  }
  for (const [key, timestamps] of userActionTimestamps.entries()) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) userActionTimestamps.delete(key);
    else userActionTimestamps.set(key, valid);
  }
}, 300000); // Every 5 minutes

export async function startDiscordBot() {`);
  fs.writeFileSync("discord-bot.ts", botContent);
}


// 3. Memory Cleanup in src/SecurityFeatures.ts
let secContent = fs.readFileSync("src/SecurityFeatures.ts", "utf-8");
if (!secContent.includes("startMemoryCleanup")) {
  secContent = secContent.replace("export class SecurityEngine {", `
// Memory Leak Prevention Global Interval
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of TokenVault['deletionTimestamps']?.entries() || []) {
    const valid = timestamps.filter((t: number) => now - t < 60000);
    if (valid.length === 0) TokenVault['deletionTimestamps'].delete(key);
    else TokenVault['deletionTimestamps'].set(key, valid);
  }
}, 300000);

export class SecurityEngine {`);
  fs.writeFileSync("src/SecurityFeatures.ts", secContent);
}
