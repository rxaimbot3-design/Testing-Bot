export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  url?: string;
  thumbnail?: string;
  requestedBy?: string;
}

export interface GuildMusicState {
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
  currentTrack: MusicTrack | null;
  positionSeconds: number;
  queue: MusicTrack[];
  voiceChannelId: string | null;
  voiceChannelName: string | null;
}

const guildMusicStates = new Map<string, GuildMusicState>();

export function getOrCreateGuildMusicState(guildId: string): GuildMusicState {
  const id = guildId || "default_guild";
  if (!guildMusicStates.has(id)) {
    guildMusicStates.set(id, {
      isPlaying: false,
      isPaused: false,
      volume: 80,
      currentTrack: null,
      positionSeconds: 0,
      queue: [],
      voiceChannelId: null,
      voiceChannelName: null
    });
  }
  return guildMusicStates.get(id)!;
}

export async function getAudioStreamDetails(query: string) {
  let songUrl = "https://stream.zeno.fm/n732m8420e8uv"; // Default Phonk fallback
  let title = query || "High Energy Lo-Fi Study Beats";
  let artist = "AI Music Generator";
  let durationSeconds = 210;
  let thumbnail = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500";

  const cleanQuery = query ? query.trim() : "";
  if (cleanQuery) {
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
          const firstResult = data.results[0];
          songUrl = firstResult.previewUrl || songUrl;
          title = firstResult.trackName || title;
          artist = firstResult.artistName || artist;
          durationSeconds = Math.round((firstResult.trackTimeMillis || 210000) / 1000);
          thumbnail = firstResult.artworkUrl100 || thumbnail;
          return { songUrl, title, artist, durationSeconds, thumbnail };
        }
      }
    } catch (err) {
      console.error("iTunes Search API error:", err);
    }

    // Fallback to query-based hardcoded radio streams
    const lowerQuery = cleanQuery.toLowerCase();
    if (lowerQuery.includes("phonk") || lowerQuery.includes("drift") || lowerQuery.includes("rave")) {
      title = "Drift Phonk - 666 RAVE (Aggressive Bass Boost)";
      artist = "Kordhell x DVRST";
      songUrl = "https://stream.zeno.fm/n732m8420e8uv";
    } else if (lowerQuery.includes("lofi") || lowerQuery.includes("chill") || lowerQuery.includes("beats") || lowerQuery.includes("coffee") || lowerQuery.includes("study")) {
      title = "Midnight Coffee Lo-Fi Beats";
      artist = "Lofi Records";
      songUrl = "https://stream.zeno.fm/60s0p297vfeuv";
    } else if (lowerQuery.includes("synthwave") || lowerQuery.includes("cyber") || lowerQuery.includes("retro")) {
      title = "Cyberpunk Synthwave 2077 Mix";
      artist = "Neon Horizon";
      songUrl = "https://stream.zeno.fm/5y48y697vfeuv";
    } else if (lowerQuery.includes("edm") || lowerQuery.includes("club") || lowerQuery.includes("festival")) {
      title = "EDM Club & Festival (Live Mix)";
      artist = "Electronic Legends";
      songUrl = "https://stream.zeno.fm/n0un4h8y1feuv";
    } else if (lowerQuery.includes("bass") || lowerQuery.includes("trap") || lowerQuery.includes("boost")) {
      title = "Ultra Bass Boost Trap";
      artist = "Sub-Bass Masters";
      songUrl = "https://stream.zeno.fm/7qep7h8y1feuv";
    }
  }

  return { songUrl, title, artist, durationSeconds, thumbnail };
}
