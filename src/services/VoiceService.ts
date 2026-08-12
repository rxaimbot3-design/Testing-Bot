import { Readable } from "stream";
import { 
  joinVoiceChannel, 
  getVoiceConnection,
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus, 
  StreamType 
} from '@discordjs/voice';
import { getClient, addBotLog } from '../../discord-bot';
import { getOrCreateGuildMusicState } from './MusicManager.js';

const guildPlayers = new Map<string, ReturnType<typeof createAudioPlayer>>();
const guildResources = new Map<string, any>();

export async function playAudioInGuild(guildId: string, audioUrl: string | Readable | ReadableStream<any>, targetChannelId?: string): Promise<boolean> {
  let logFunc = addBotLog || ((msg: string) => console.log(msg));
  try {
    const client = getClient();
    if (!client) {
      console.warn("Discord client not initialized for voice playback.");
      return false;
    }

    // Resolve target guild - fallback to first available guild ONLY if default_guild is passed
    let guild = client.guilds.cache.get(guildId);
    if (!guild) {
      if (guildId === "default_guild" && client.guilds.cache.size > 0) {
        guild = client.guilds.cache.first();
      } else {
        console.warn(`Guild ${guildId} not found in client cache.`);
        logFunc(`❌ Cannot play music: Specified Guild ID '${guildId}' is invalid or unavailable.`, "error");
        return false;
      }
    }
    
    // Validate or find a voice channel
    let targetChannel = targetChannelId ? guild.channels.cache.get(targetChannelId) : null;
    if (!targetChannel || !targetChannel.isVoiceBased()) {
      targetChannel = guild.channels.cache.find((c: any) => c.isVoiceBased() && c.members.size > 0);
      if (!targetChannel) {
        targetChannel = guild.channels.cache.find((c: any) => c.isVoiceBased());
      }
    }
    
    if (!targetChannel) {
      logFunc(`🎵 Cannot play music in ${guild.name} - no voice channels found.`, "warning");
      return false;
    }

    let connection = getVoiceConnection(guild.id);
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });
      connection.on(VoiceConnectionStatus.Disconnected, () => {
        logFunc(`🎵 Disconnected from Voice Channel '${targetChannel.name}' in ${guild.name}.`, "warning");
        guildPlayers.delete(guild.id);
        guildResources.delete(guild.id);
      });

      connection.on('error', (error: any) => {
        logFunc(`❌ Voice Connection Error in ${guild.name}: ${error.message}`, "error");
        guildPlayers.delete(guild.id);
        guildResources.delete(guild.id);
      });

      // Wait for voice connection to be ready before playing
      await new Promise((resolve, reject) => {
        if (connection.state.status === VoiceConnectionStatus.Ready) {
          resolve(true);
          return;
        }
        const timeout = setTimeout(() => {
          reject(new Error("Voice connection timeout"));
        }, 10000);

        connection.on(VoiceConnectionStatus.Ready, () => {
          clearTimeout(timeout);
          resolve(true);
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
          clearTimeout(timeout);
          reject(new Error("Voice connection disconnected"));
        });
      }).catch((err) => {
        logFunc(`❌ Voice connection failed in ${guild.name}: ${err.message}`, "error");
        return false;
      });
    }

    let player = guildPlayers.get(guild.id);
    if (!player) {
      player = createAudioPlayer();
      guildPlayers.set(guild.id, player);

      player.on(AudioPlayerStatus.Idle, () => {
         logFunc(`🎵 Audio finished playing in ${guild.name}.`, "info");
      });
      
      player.on('error', (error: any) => {
         console.error('Audio Player Error:', error);
         logFunc(`❌ Audio playback error: ${error.message}`, "error");
      });
    }

    let resource;
    try {
      const isStream = typeof audioUrl !== 'string';
      const resourceOptions: any = {
        inlineVolume: true,
      };

      if (isStream) {
        // play-dl returned a readable stream
        resourceOptions.inputType = StreamType.Arbitrary;
        console.log(`[VoiceService] Creating audio resource from play-dl stream in ${guild.name}`);
      } else {
        console.log(`[VoiceService] Creating audio resource from URL: ${audioUrl.substring(0, 100)}... in ${guild.name}`);
      }

      resource = createAudioResource(audioUrl as any, resourceOptions);
      console.log(`[VoiceService] Audio resource created successfully in ${guild.name}`);
    } catch (resourceErr: any) {
      console.error("Failed to create audio resource:", resourceErr);
      logFunc(`❌ Failed to load audio stream: ${resourceErr.message}. The stream may be invalid or incompatible.`, "error");
      return false;
    }

    const state = getOrCreateGuildMusicState(guild.id);
    if (resource.volume) {
      resource.volume.setVolume(state.volume / 100);
    }
    guildResources.set(guild.id, resource);

    player.play(resource);
    connection.subscribe(player);
    
    logFunc(`🎵 Connected to Voice Channel '${targetChannel.name}' and playing audio stream.`, "success");
    return true;

  } catch (err: any) {
    console.error("Failed to play audio:", err);
    logFunc(`❌ Failed to connect to Voice Channel: ${err.message}`, "error");
    return false;
  }
}

export async function stopAudioInGuild(guildId: string) {
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

export async function pauseAudioInGuild(guildId: string) {
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

export async function resumeAudioInGuild(guildId: string) {
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

export function setVolumeInGuild(guildId: string, volume: number) {
  const client = getClient();
  const targetGuildId = (client && client.guilds.cache.get(guildId)) ? guildId : (client?.guilds.cache.first()?.id || guildId);
  const resource = guildResources.get(targetGuildId);
  if (resource && resource.volume) {
    resource.volume.setVolume(volume / 100);
  }
}
