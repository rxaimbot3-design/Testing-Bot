export interface MusicIntentResult {
  matched: boolean;
  songTitle?: string;
  artist?: string;
  action?: 'play' | 'pause' | 'skip' | 'queue';
  message: string;
}

export function parseMusicIntent(text: string): MusicIntentResult {
  const lower = text.toLowerCase();

  // Check for play intent
  if (lower.includes('play') || lower.includes('ganan') || lower.includes('shono') || lower.includes('song') || lower.includes('music') || lower.includes('phonk') || lower.includes('lofi') || lower.includes('track')) {
    // Extract song name if possible
    let songName = 'Drift Phonk - 666 RAVE (Aggressive Bass Boost)';
    let artist = 'AI Voice DJ';

    if (lower.includes('phonk')) {
      songName = 'AGRESSIVE DRIFT PHONK 2026';
      artist = 'Kordhell x DVRST';
    } else if (lower.includes('lofi') || lower.includes('lo-fi') || lower.includes('chill')) {
      songName = 'Midnight Coffee Lo-Fi Beats';
      artist = 'Lofi Records';
    } else if (lower.includes('rock') || lower.includes('metal')) {
      songName = 'Epic Rock Guitar Anthem';
      artist = 'Rock Legends';
    } else if (lower.includes('play ')) {
      const parts = text.split(/play\s+/i);
      if (parts.length > 1 && parts[1].trim().length > 0) {
        songName = parts[1].trim();
        artist = 'User Request via AI Chat';
      }
    }

    return {
      matched: true,
      songTitle: songName,
      artist: artist,
      action: 'play',
      message: `🎵 [AI Intent Router] Successfully mapped intent to MusicPlayerTab: Playing "${songName}" by ${artist} in Voice Channel.`
    };
  }

  if (lower.includes('pause') || lower.includes('stop music')) {
    return {
      matched: true,
      action: 'pause',
      message: `⏸️ [AI Intent Router] Mapped intent: Pausing music playback.`
    };
  }

  if (lower.includes('skip') || lower.includes('next song')) {
    return {
      matched: true,
      action: 'skip',
      message: `⏭️ [AI Intent Router] Mapped intent: Skipping to next song in queue.`
    };
  }

  return {
    matched: false,
    message: ''
  };
}
