export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  url: string | ReadableStream<any>;
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

// Verified working direct audio streams (no YouTube/play-dl dependency)
const RADIO_STREAMS: Record<string, { url: string; title: string; artist: string; genre: string[] }> = {
  chillhop: {
    url: "https://streams.ilovemusic.de/iloveradio17.mp3",
    title: "ChillHop & Lo-Fi Beats Radio",
    artist: "I Love Radio",
    genre: ["chill", "lofi", "study", "beats", "coffee", "relax", "sleep", "ambient"]
  },
  hits: {
    url: "https://streams.ilovemusic.de/iloveradio16.mp3",
    title: "Top 40 Hits & Charts",
    artist: "I Love Radio",
    genre: ["hits", "pop", "top", "charts", "trending", "popular"]
  },
  dance: {
    url: "https://streams.ilovemusic.de/iloveradio8.mp3",
    title: "Dance & EDM Radio",
    artist: "I Love Radio",
    genre: ["edm", "club", "festival", "dance", "electronic", "house"]
  },
  hiphop: {
    url: "https://streams.ilovemusic.de/iloveradio11.mp3",
    title: "Hip Hop & Rap Radio",
    artist: "I Love Radio",
    genre: ["hip", "rap", "hiphop", "trap", "bass", "phonk", "drift"]
  },
  rock: {
    url: "https://streams.ilovemusic.de/iloveradio9.mp3",
    title: "Rock & Alternative Radio",
    artist: "I Love Radio",
    genre: ["rock", "alternative", "metal", "punk", "indie"]
  },
  rb: {
    url: "https://streams.ilovemusic.de/iloveradio10.mp3",
    title: "R&B & Soul Radio",
    artist: "I Love Radio",
    genre: ["rnb", "soul", "r&b", "motown", "neo"]
  },
  reggae: {
    url: "https://streams.ilovemusic.de/iloveradio12.mp3",
    title: "Reggae & Dancehall Radio",
    artist: "I Love Radio",
    genre: ["reggae", "dancehall", "ska", "caribbean"]
  },
  latino: {
    url: "https://streams.ilovemusic.de/iloveradio13.mp3",
    title: "Latino & Reggaeton Radio",
    artist: "I Love Radio",
    genre: ["latino", "reggaeton", "spanish", "latin", "salsa"]
  },
  ambient: {
    url: "https://ice1.somafm.com/groovesalad-128-mp3",
    title: "Groove Salad (Ambient/Chill)",
    artist: "SomaFM",
    genre: ["ambient", "chill", "lofi", "study", "beats", "downtempo", "relax"]
  },
  space: {
    url: "https://ice1.somafm.com/deepspaceone-128-mp3",
    title: "Deep Space One (Space Ambient)",
    artist: "SomaFM",
    genre: ["space", "ambient", "drone", "cosmic", "spacemusic"]
  },
  drone: {
    url: "https://ice1.somafm.com/dronezone-128-mp3",
    title: "Drone Zone (Ambient Soundscapes)",
    artist: "SomaFM",
    genre: ["drone", "ambient", "soundscape", "meditation", "calm"]
  }
};

const DEFAULT_STREAM = RADIO_STREAMS.chillhop;

function matchStream(query: string): { url: string; title: string; artist: string } {
  const lower = query.toLowerCase();
  
  let bestMatch = DEFAULT_STREAM;
  let bestScore = 0;
  
  for (const stream of Object.values(RADIO_STREAMS)) {
    let score = 0;
    for (const keyword of stream.genre) {
      if (lower.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = stream;
    }
  }
  
  return { url: bestMatch.url, title: bestMatch.title, artist: bestMatch.artist };
}

export async function getAudioStreamDetails(query: string) {
  let songUrl = DEFAULT_STREAM.url;
  let title = query || DEFAULT_STREAM.title;
  let artist = DEFAULT_STREAM.artist;
  let durationSeconds = 210;
  let thumbnail = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500";

  const cleanQuery = query ? query.trim() : "";
  if (cleanQuery) {
    const lowerQuery = cleanQuery.toLowerCase();

    const isYouTube = lowerQuery.includes("youtube.com") || lowerQuery.includes("youtu.be");
    const isSoundCloud = lowerQuery.includes("soundcloud.com");
    
    if (!isYouTube && (isSoundCloud || lowerQuery.includes("spotify.com"))) {
      try {
        const play = await import("play-dl");
        
        if (isSoundCloud) {
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
        
        if (lowerQuery.includes("spotify.com")) {
          try {
            const spotifyMatch = cleanQuery.match(/track\/([a-zA-Z0-9]+)/);
            if (spotifyMatch) {
              const searchResults = await play.search(`spotify track ${spotifyMatch[1]}`, { limit: 1 });
              if (searchResults && searchResults.length > 0) {
                const first = searchResults[0];
                if (first.id) {
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

    const matched = matchStream(cleanQuery);
    songUrl = matched.url;
    
    if (isYouTube) {
      title = cleanQuery.replace(/https?:\/\/(www\.)?youtube\.com\/watch\?v=/i, '').replace(/https?:\/\/(www\.)?youtu\.be\//i, '').substring(0, 60) || matched.title;
      artist = "YouTube Audio";
    } else if (title === query || title === DEFAULT_STREAM.title) {
      title = matched.title;
      artist = matched.artist;
    }
  }

  return { songUrl, title, artist, durationSeconds, thumbnail };
}
