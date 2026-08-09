import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../services/apiClient';
import { 
  Music, Play, Pause, SkipForward, Volume2, ListMusic, Radio, Sparkles, Disc, Plus, 
  Trash2, CheckCircle2, Sliders, RefreshCw, Layers, Zap, VolumeX, ShieldCheck, ExternalLink,
  Shuffle, Repeat, Mic, RadioTower
} from 'lucide-react';

interface MusicPlayerTabProps {
  onAddLog: (action: string, severity?: 'low' | 'medium' | 'high') => void;
}

export default function MusicPlayerTab({ onAddLog }: MusicPlayerTabProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSong, setCurrentSong] = useState<any>({
    title: 'Drift Phonk - 666 RAVE (Aggressive Bass Boost)',
    artist: 'Kordhell x DVRST',
    durationRaw: '3:45',
    requester: 'Discord User',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    url: 'https://stream.zeno.fm/n732m8420e8uv'
  });

  const [queue, setQueue] = useState<any[]>([
    { title: 'MEMORIZED - Slowed Phonk', artist: 'Kordhell', durationRaw: '2:50', requestedBy: 'user_1' },
    { title: 'TOKYO DRIFT - Phonk Remix', artist: 'DVRST', durationRaw: '3:10', requestedBy: 'user_2' },
    { title: 'Cyberpunk Synthwave 2077 Mix', artist: 'Neon Horizon', durationRaw: '4:35', requestedBy: 'cyber_ninja' }
  ]);

  const [inputSong, setInputSong] = useState('');
  const [volume, setVolume] = useState(80);
  const [equalizer, setEqualizer] = useState('phonk');
  const [loopMode, setLoopMode] = useState<'off' | 'track' | 'queue'>('off');
  const [activeGuildId, setActiveGuildId] = useState<string | null>(null);
  const [activeGuilds, setActiveGuilds] = useState<Array<{ id: string; name: string }>>([]);
  const [isConnectedToBot, setIsConnectedToBot] = useState(false);
  const [isDeployingChannel, setIsDeployingChannel] = useState(false);
  const [deployedChannelInfo, setDeployedChannelInfo] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isBrowserMuted, setIsBrowserMuted] = useState(false);

  // Sync volume with browser audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isBrowserMuted ? 0 : volume / 100;
    }
  }, [volume, isBrowserMuted]);

  // Play/pause and stream selection logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && !isPaused && currentSong.url) {
      let playUrl = currentSong.url;
      // Handle fallback high-quality streams if the current URL is unplayable or YouTube
      if (playUrl.includes('youtube.com') || playUrl.includes('youtu.be') || playUrl.includes('soundcloud.com') || !playUrl) {
        const lowerTitle = (currentSong.title || '').toLowerCase();
        if (lowerTitle.includes('lofi') || lowerTitle.includes('chill') || lowerTitle.includes('beats') || lowerTitle.includes('coffee') || lowerTitle.includes('study')) {
          playUrl = 'https://stream.zeno.fm/60s0p297vfeuv'; // Lofi stream
        } else if (lowerTitle.includes('synthwave') || lowerTitle.includes('cyber') || lowerTitle.includes('retro')) {
          playUrl = 'https://stream.zeno.fm/5y48y697vfeuv'; // Synthwave stream
        } else if (lowerTitle.includes('edm') || lowerTitle.includes('club') || lowerTitle.includes('festival')) {
          playUrl = 'https://stream.zeno.fm/n0un4h8y1feuv'; // EDM stream
        } else if (lowerTitle.includes('bass') || lowerTitle.includes('trap')) {
          playUrl = 'https://stream.zeno.fm/7qep7h8y1feuv'; // Bass/Trap stream
        } else {
          playUrl = 'https://stream.zeno.fm/n732m8420e8uv'; // Phonk/Rave stream
        }
      }

      if (audio.src !== playUrl) {
        audio.src = playUrl;
      }
      audio.play().catch((err) => {
        console.warn("Browser autoplay blocked or stream load error:", err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, isPaused, currentSong.url, currentSong.title]);

  // Fetch live music state from server
  const fetchMusicState = async () => {
    try {
      const url = activeGuildId ? `/api/bot/music/state?guild_id=${activeGuildId}` : '/api/bot/music/state';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setIsConnectedToBot(true);
        if (data.activeGuilds && data.activeGuilds.length > 0) {
          setActiveGuilds(data.activeGuilds);
          if (!activeGuildId) {
            setActiveGuildId(data.activeGuilds[0].id);
          }
        }
        
        // Extract properties from data.state if nested, otherwise fallback to data
        const mState = data.state || data;
        
        if (mState.currentTrack) {
          setCurrentSong({
            title: mState.currentTrack.title || 'Unknown Track',
            artist: mState.currentTrack.artist || 'Luna Music DJ',
            durationRaw: mState.currentTrack.durationRaw || '24/7 Live Stream',
            requester: mState.currentTrack.requestedBy || 'Discord VC',
            thumbnail: mState.currentTrack.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
            url: mState.currentTrack.url || ''
          });
          setIsPlaying(mState.isPlaying);
          setIsPaused(mState.isPaused);
        } else {
          setIsPlaying(mState.isPlaying || false);
          setIsPaused(mState.isPaused || false);
        }
        if (Array.isArray(mState.queue)) {
          setQueue(mState.queue);
        }
        if (mState.volume) setVolume(mState.volume);
        if (mState.equalizer) setEqualizer(mState.equalizer);
        if (mState.loopMode) setLoopMode(mState.loopMode);
      }
    } catch (e) {
      console.warn("Failed to sync music state with backend:", e);
    }
  };

  useEffect(() => {
    fetchMusicState();
    const interval = setInterval(fetchMusicState, 3000);
    return () => clearInterval(interval);
  }, [activeGuildId]);

  // Handle remote controls
  const sendControlAction = async (action: string, payload?: any) => {
    try {
      const res = await apiFetch('/api/bot/music/control', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminKey ? { 'x-admin-key': adminKey, 'x-admin-secret': adminKey } : {})
        },
        body: JSON.stringify({
          guildId: activeGuildId,
          action,
          payload
        })
      });
      const data = await res.json();
      if (data.error) {
        onAddLog(`❌ [MUSIC CONTROL ERROR] ${data.error}`, 'high');
      } else {
        onAddLog(`🎵 [MUSIC] Control action '${action}' executed successfully on Discord Bot`, 'low');
        fetchMusicState();
      }
    } catch (err: any) {
      onAddLog(`❌ [MUSIC ERROR] Failed to send command: ${err.message}`, 'high');
    }
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSong.trim()) return;

    sendControlAction('play', { query: inputSong, requestedBy: 'Web Dashboard' });
    setInputSong('');
  };

  const handleDeployRequestChannel = async () => {
    setIsDeployingChannel(true);
    try {
      const res = await apiFetch('/api/bot/music/setup-channel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminKey ? { 'x-admin-key': adminKey, 'x-admin-secret': adminKey } : {})
        },
        body: JSON.stringify({ guildId: activeGuildId })
      });
      const data = await res.json();
      if (data.success) {
        setDeployedChannelInfo(`#${data.channelName}`);
        onAddLog(`🚀 [HYDRA MUSIC DECK] Successfully deployed #${data.channelName} interactive request channel in Discord!`, 'high');
      } else {
        onAddLog(`❌ [SETUP ERROR] ${data.error || 'Failed to setup music channel'}`, 'high');
      }
    } catch (err: any) {
      onAddLog(`❌ [SETUP ERROR] ${err.message}`, 'high');
    } finally {
      setIsDeployingChannel(false);
    }
  };

  const RADIO_STATIONS = [
    { key: 'phonk', name: 'Drift Phonk & Rave', icon: '🔥', desc: 'Aggressive Bass & Phonk 24/7', color: 'from-amber-600/20 to-rose-900/30 border-amber-500/30' },
    { key: 'lofi', name: 'Lofi Hip Hop Chill', icon: '☕', desc: 'Relaxing Beats & Study Music', color: 'from-indigo-600/20 to-purple-900/30 border-indigo-500/30' },
    { key: 'synthwave', name: 'Synthwave & Cyberpunk', icon: '🌆', desc: '80s Retro Futuristic Beats', color: 'from-cyan-600/20 to-blue-900/30 border-cyan-500/30' },
    { key: 'edm', name: 'EDM Club & Festival', icon: '⚡', desc: 'High Energy Electronic Dance', color: 'from-emerald-600/20 to-teal-900/30 border-emerald-500/30' },
    { key: 'bassboost', name: 'Ultra Bass Boost Trap', icon: '🔊', desc: 'Sub-Bass Heavy Heavy Hits', color: 'from-purple-600/20 to-pink-900/30 border-purple-500/30' }
  ];

  const EQ_PRESETS = [
    { id: 'phonk', label: '🔥 Phonk Rave 300%' },
    { id: 'bassboost', label: '🔊 Sub-Bass Boost' },
    { id: '8d', label: '🎧 8D Spatial Audio' },
    { id: 'nightcore', label: '⚡ Nightcore Speed' },
    { id: 'flat', label: '🎼 Studio Flat' }
  ];

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Admin Auth Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1">
           <h3 className="text-sm font-bold text-zinc-200">Admin Authentication</h3>
           <p className="text-[11px] text-zinc-400">Required to authorize remote control commands to the bot</p>
        </div>
        <input 
           type="password"
           placeholder="Enter ADMIN_SECRET"
           value={adminKey}
           onChange={(e) => setAdminKey(e.target.value)}
           className="w-full md:w-64 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Header Studio Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/70 to-zinc-950 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-indigo-400">
              <Disc className={`w-8 h-8 ${isPlaying && !isPaused ? 'animate-spin text-purple-400' : ''}`} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-white tracking-wide">World-Class Discord Music Studio</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 320kbps Lossless
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-xl">
              Pro-grade Discord audio playback engine inspired by Hydra & Rythm. Zero lag, high-fidelity streams, live equalizer, 24/7 radio presets, and automated channel deployment!
            </p>
          </div>
        </div>

        {/* Server & Bot VC Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0 w-full md:w-auto">
          {activeGuilds.length > 0 && (
            <select
              value={activeGuildId || ''}
              onChange={(e) => setActiveGuildId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {activeGuilds.map((g) => (
                <option key={g.id} value={g.id}>
                  🏰 {g.name}
                </option>
              ))}
            </select>
          )}

          <button 
            onClick={() => sendControlAction('retry')}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-black tracking-wider transition shadow-lg flex items-center justify-center gap-2"
            title="Re-attempt voice channel connection if disconnected"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            Retry Connection
          </button>

          <button 
            onClick={handleDeployRequestChannel}
            disabled={isDeployingChannel}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black tracking-wider transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {isDeployingChannel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
            {deployedChannelInfo ? `Deployed ${deployedChannelInfo}!` : 'Deploy #luna-music-player Channel'}
          </button>
        </div>
      </div>

      {/* Main Studio Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Now Playing Deck */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Deck Player Card */}
          <div className="bg-[#121215] rounded-3xl border border-zinc-800/80 p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400 animate-pulse" /> Live VC Playback
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg font-mono font-bold">
                {currentSong.durationRaw}
              </span>
            </div>

            {/* Song Cover Artwork with Vinyl Effect */}
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-5 border border-zinc-800/80 group bg-zinc-950 flex items-center justify-center">
              <img 
                src={currentSong.thumbnail} 
                alt="Track Artwork" 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-700 opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent flex flex-col justify-between p-5">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] bg-purple-600/80 text-white px-2.5 py-1 rounded-md font-black uppercase tracking-wider backdrop-blur-md">
                    {equalizer.toUpperCase()} EQ
                  </span>
                  {isPlaying && !isPaused && (
                    <div className="flex items-end gap-1 h-5">
                      <span className="w-1 bg-indigo-400 animate-bounce h-full rounded-full" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 bg-purple-400 animate-bounce h-3/4 rounded-full" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 bg-pink-400 animate-bounce h-1/2 rounded-full" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-black text-white truncate drop-shadow-md">{currentSong.title}</h3>
                  <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">{currentSong.artist}</p>
                </div>
              </div>
            </div>

            {/* Audio Waveform / Progress Slider */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  {isPlaying ? '01:24' : '00:00'}
                  <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50 font-sans">
                    📻 Live Stream (Seek N/A)
                  </span>
                </span>
                <span>{currentSong.durationRaw}</span>
              </div>
              <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all ${isPlaying && !isPaused ? 'w-2/3 animate-pulse' : 'w-0'}`} 
                />
              </div>
            </div>

            {/* Primary Control Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              <button
                onClick={() => sendControlAction(isPaused ? 'resume' : 'pause')}
                className="col-span-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={() => sendControlAction('skip')}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                title="Skip Track"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>

              <button
                onClick={() => sendControlAction('shuffle')}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition flex items-center justify-center"
                title="Shuffle Queue"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={() => sendControlAction('stop')}
                className="py-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 font-bold text-xs rounded-xl transition flex items-center justify-center"
                title="Stop & Leave VC"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Volume Control */}
            <div className="p-4 bg-zinc-900/70 rounded-2xl border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span className="flex items-center gap-2 text-indigo-400">
                  <Volume2 className="w-4 h-4" /> VC Output Volume
                </span>
                <span className="font-mono text-zinc-200">{volume}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  sendControlAction('volume', { volume: val });
                }}
                className="w-full accent-indigo-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Local Browser Audio Monitor */}
            <div className="p-4 bg-zinc-900/70 rounded-2xl border border-zinc-800/80 flex items-center justify-between">
              <audio ref={audioRef} style={{ display: 'none' }} />
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPlaying && !isPaused && !isBrowserMuted ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                <div>
                  <h5 className="text-xs font-bold text-zinc-200">Local Browser Monitor</h5>
                  <p className="text-[10px] text-zinc-500">
                    {isPlaying && !isPaused ? (isBrowserMuted ? 'Monitor stream is muted' : 'Streaming live audio...') : 'Stream is idle'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBrowserMuted(!isBrowserMuted)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition uppercase flex items-center gap-1.5 ${
                  isBrowserMuted 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/60' 
                    : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30'
                }`}
              >
                {isBrowserMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isBrowserMuted ? 'Muted' : 'Unmuted'}
              </button>
            </div>
          </div>

          {/* Equalizer Mode Selector */}
          <div className="bg-[#121215] rounded-3xl border border-zinc-800/80 p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" /> Audio Equalizer Presets
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {EQ_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setEqualizer(preset.id);
                    sendControlAction('equalizer', { equalizer: preset.id });
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                    equalizer === preset.id
                      ? 'bg-purple-950/50 border-purple-500 text-purple-200'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span>{preset.label}</span>
                  {equalizer === preset.id && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Queue & 24/7 Radio Hub */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Song Search & Queue Manager */}
          <div className="bg-[#121215] rounded-3xl border border-zinc-800/80 p-6 shadow-2xl flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-indigo-400" /> Active Queue ({queue.length})
                </h3>
                <button 
                  onClick={() => sendControlAction('clear')}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 transition font-bold"
                >
                  Clear Queue
                </button>
              </div>

              {/* Input Form */}
              <form onSubmit={handleAddSong} className="flex gap-2 mb-5">
                <div className="relative flex-1">
                  <Music className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Search song title, artist, YouTube, or SoundCloud link..."
                    value={inputSong}
                    onChange={(e) => setInputSong(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/80"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Add Song
                </button>
              </form>

              {/* Queue List */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {queue.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-900/30">
                    <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 font-medium">Queue is currently empty.</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Type a song query above or launch a 24/7 radio station below!</p>
                  </div>
                ) : (
                  queue.map((track, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-zinc-900/60 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 transition group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="text-xs font-mono font-bold text-zinc-600 w-4">{idx + 1}</span>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition truncate">{track.title}</h4>
                          <p className="text-[11px] text-zinc-500 truncate">{track.artist || 'Requested Song'} • <span className="text-zinc-400">{track.requestedBy || 'Discord User'}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-500">{track.durationRaw || '3:30'}</span>
                        <button
                          onClick={() => sendControlAction('remove', { index: idx })}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                          title="Remove track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Command Info */}
            <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" /> Discord Slash Command: <code className="text-indigo-300 font-mono">/play [song]</code>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bot Connected
              </span>
            </div>
          </div>

          {/* 24/7 Live Radio Preset Stations Hub */}
          <div className="bg-[#121215] rounded-3xl border border-zinc-800/80 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                  <RadioTower className="w-4 h-4 text-purple-400" /> 24/7 Curated Radio Streams
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">One-click stream launcher directly into Discord Voice Channel</p>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                24/7 Online
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {RADIO_STATIONS.map((st) => (
                <button
                  key={st.key}
                  onClick={() => sendControlAction('play', { query: st.key, requestedBy: 'Web Radio Hub' })}
                  className={`p-3.5 rounded-2xl border bg-gradient-to-br ${st.color} hover:border-indigo-400 transition text-left group flex flex-col justify-between h-24`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{st.icon}</span>
                    <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">{st.name}</h4>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{st.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
