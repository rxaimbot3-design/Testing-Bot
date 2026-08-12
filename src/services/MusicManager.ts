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
  equalizer: string;
  loopMode: 'off' | 'track' | 'queue';
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
      voiceChannelName: null,
      equalizer: 'flat',
      loopMode: 'off'
    });
  }
  return guildMusicStates.get(id)!;
}

export async function getAudioStreamDetails(query: string) {
  let songUrl = "https://stream.zeno.fm/n732m8420e8uv";
  let title = query || "High Energy Lo-Fi Study Beats";
  let artist = "AI Music Generator";
  let durationSeconds = 210;
  let thumbnail = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500";

  const cleanQuery = query ? query.trim() : "";
  if (cleanQuery) {
    const lowerQuery = cleanQuery.toLowerCase();

    // Only attempt play-dl for actual URLs to avoid YouTube rate-limiting on keyword searches
    const isUrl = lowerQuery.includes("youtube.com") || lowerQuery.includes("youtu.be") ||
                  lowerQuery.includes("spotify.com") || lowerQuery.includes("soundcloud.com");

    if (isUrl) {
      try {
        const play = await import("play-dl");
        let youtubeId = "";
        let searchQuery = cleanQuery;

        if (lowerQuery.includes("youtube.com") || lowerQuery.includes("youtu.be")) {
          const urlMatch = cleanQuery.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (urlMatch) youtubeId = urlMatch[1];
        } else if (lowerQuery.includes("spotify.com")) {
          const spotifyMatch = cleanQuery.match(/track\/([a-zA-Z0-9]+)/);
          if (spotifyMatch) searchQuery = `spotify track ${spotifyMatch[1]}`;
        } else if (lowerQuery.includes("soundcloud.com")) {
          try {
            const scInfo = await play.soundcloud(cleanQuery);
            if (scInfo) {
              title = (scInfo as any).name || (scInfo as any).title || title;
              artist = ((scInfo as any).user?.username || (scInfo as any).user?.name || artist) as string;
              durationSeconds = Math.round(((scInfo as any).durationInMs || 210000) / 1000);
              thumbnail = (scInfo as any).thumbnail || (scInfo as any).artwork_url || thumbnail;
              songUrl = (scInfo as any).streams?.hls || (scInfo as any).url || songUrl;
              return { songUrl, title, artist, durationSeconds, thumbnail };
            }
          } catch {
            // fallback to radio
          }
        }

        if (!youtubeId) {
          try {
            const searchResults = await play.search(searchQuery, { limit: 1 });
            if (searchResults && searchResults.length > 0) {
              const first = searchResults[0];
              const ytInfo = await play.video_info(first.id);
              const ytDetails = (ytInfo as any).video_details;
              if (ytDetails) {
                title = ytDetails.title || title;
                artist = ytDetails.channel?.name || artist;
                durationSeconds = Math.round((ytDetails.durationInSec || 210));
                thumbnail = ytDetails.thumbnails?.[0]?.url || thumbnail;
                const streams = (ytInfo as any).streams;
                if (streams && streams.length > 0) {
                  songUrl = streams[0].url || songUrl;
                  return { songUrl, title, artist, durationSeconds, thumbnail };
                }
              }
            }
          } catch {
            // fallback to radio
          }
        }

        if (youtubeId) {
          try {
            const ytInfo = await play.video_info(youtubeId);
            const ytDetails = (ytInfo as any).video_details;
            if (ytDetails) {
              title = ytDetails.title || title;
              artist = ytDetails.channel?.name || artist;
              durationSeconds = Math.round((ytDetails.durationInSec || 210));
              thumbnail = ytDetails.thumbnails?.[0]?.url || thumbnail;
              const streams = (ytInfo as any).streams;
              if (streams && streams.length > 0) {
                songUrl = streams[0].url || songUrl;
                return { songUrl, title, artist, durationSeconds, thumbnail };
              }
            }
          } catch {
            // fallback to radio
          }
        }
      } catch (err) {
        console.error("play-dl error:", err);
      }
    }

    // Keyword-based radio fallback (primary behavior for non-URL queries)
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
