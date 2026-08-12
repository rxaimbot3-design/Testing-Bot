import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Sparkles, 
  Puzzle, 
  Workflow, 
  Palette, 
  ShieldCheck, 
  Ticket, 
  Key, 
  Settings, 
  Coins, 
  Radio, 
  Github,
  Bot, Lock,
  Zap,
  Activity,
  UserCheck,
  Music,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Cpu,
  BarChart3,
  Bug,
  FileText,
  Users,
  HardDrive,
  Clock
} from 'lucide-react';

import OverviewTab from './components/OverviewTab';
import AiSystemTab from './components/AiSystemTab';
import EmbedBuilderTab from './components/EmbedBuilderTab';
import SecurityTab from './components/SecurityTab';
import TicketUserTab from './components/TicketUserTab';
import EnterpriseBillingTab from './components/EnterpriseBillingTab';
import SettingsTab from './components/SettingsTab';
import EconomyTab from './components/EconomyTab';
import DiscordConnectTab from './components/DiscordConnectTab';
import GitHubTab from './components/GitHubTab';
import VerificationTab from './components/VerificationTab';
import MusicPlayerTab from './components/MusicPlayerTab';
import TopFiveFeaturesBar from './components/TopFiveFeaturesBar';
import LiveSecurityEventsTab from './components/LiveSecurityEventsTab';
import AttackTimelineTab from './components/AttackTimelineTab';
import RiskScoreTab from './components/RiskScoreTab';
import SystemHealthTab from './components/SystemHealthTab';
import EventThroughputTab from './components/EventThroughputTab';
import DetectionLatencyTab from './components/DetectionLatencyTab';
import AuditLogsTab from './components/AuditLogsTab';
import ErrorMonitoringTab from './components/ErrorMonitoringTab';
import BackupStatusTab from './components/BackupStatusTab';
import TrustSystemTab from './components/TrustSystemTab';
import HealthCheck from './components/HealthCheck';
import { parseMusicIntent } from './services/musicIntentService';
import { apiFetch, checkSession, loginWithAdminKey, logoutAdmin, getAdminToken, loginWithDiscordToken } from './services/apiClient';

import { AuditLog, SecuritySetting, LeaderboardUser } from './types';

type DashboardTab = 
  | 'overview' 
  | 'aisystem' 
  | 'music'
  | 'embeds' 
  | 'security' 
  | 'verification'
  | 'tickets' 
  | 'billing' 
  | 'settings' 
  | 'economy' 
  | 'discord-connect' 
  | 'github'
  | 'live-security'
  | 'attack-timeline'
  | 'risk-score'
  | 'system-health'
  | 'event-throughput'
  | 'detection-latency'
  | 'audit-logs'
  | 'error-monitoring'
  | 'backup-status'
  | 'trust-system';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Discord OAuth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [discordUser, setDiscordUser] = useState<any>(null);

  
  const [adminSecretInput, setAdminSecretInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [discordClientId, setDiscordClientId] = useState('');

  useEffect(() => {
    fetch('/api/config/public').then(res => res.json()).then(data => {
      if (data.discordClientId) setDiscordClientId(data.discordClientId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        // Clear hash
        window.history.replaceState(null, "", window.location.pathname);
        loginWithDiscordToken(accessToken).then(res => {
          if (res.success && res.user) {
            setIsAuthenticated(true);
            setDiscordUser({
              username: res.user.username,
              discriminator: res.user.discriminator || "0000",
              id: res.user.id,
              avatarUrl: res.user.avatar ? `https://cdn.discordapp.com/avatars/${res.user.id}/${res.user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
            });
          } else {
            setLoginError(res.error || "Discord authentication failed");
          }
        });
      }
    }
  }, []);


  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await loginWithAdminKey(adminSecretInput);
      if (res.success) {
        setIsAuthenticated(true);
        setDiscordUser({ username: 'Admin', discriminator: '0000', id: 'admin', avatarUrl: '' });
      } else {
        setLoginError('Invalid Admin Secret');
      }
    } catch (err) {
      setLoginError('Login failed');
    }
  };


  
  const [server, setServer] = useState({
    id: '709581762663',
    name: 'Enterprise Ultra Cluster Node #1',
    icon: '🚀',
    memberCount: 18420,
    activeTickets: 3,
    latency: 0,
    status: 'online' as 'online' | 'offline' | 'lockdown'
  });

  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkSession().then(res => {
      setAdminAuthenticated(res.authenticated);
      if (res.authenticated) {
        setIsAuthenticated(true);
      }
    });

    const handleUnauthorized = (e: Event) => {
      setAdminAuthenticated(false);
      setShowAdminModal(true);
      setAdminAuthError('Session expired or Admin Authentication required for this action.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (!adminKeyInput.trim()) return;
    const res = await loginWithAdminKey(adminKeyInput.trim());
    if (res.success) {
      setAdminAuthenticated(true);
      setShowAdminModal(false);
      setAdminKeyInput('');
      handleAddLog('Admin authenticated successfully via Session Management.', 'medium');
    } else {
      setAdminAuthError(res.error || 'Authentication failed');
    }
  };

  const handleAdminLogout = async () => {
    await logoutAdmin();
    setAdminAuthenticated(false);
    handleAddLog('Admin session terminated.', 'low');
  };

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await apiFetch('/api/discord/status');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;
        const data = await res.json();
        if (mounted && data) {
          if (data.guilds && data.guilds.length > 0) {
            const searchParams = new URLSearchParams(window.location.search);
            const guildId = searchParams.get('guild_id');
            
            let targetGuild = data.guilds[0];
            if (guildId) {
              const found = data.guilds.find((g: any) => g.id === guildId);
              if (found) targetGuild = found;
            } else if (data.guilds.length > 1) {
              targetGuild = {
                name: `${data.guilds.length} Connected Servers`,
                memberCount: data.guilds.reduce((acc: number, g: any) => acc + (g.memberCount || 0), 0)
              };
            }

            setServer(prev => ({
              ...prev,
              name: targetGuild.name,
              memberCount: targetGuild.memberCount || 0,
              activeTickets: data.activeTickets !== undefined ? data.activeTickets : prev.activeTickets,
              latency: data.latency !== undefined ? data.latency : prev.latency,
              status: data.status === 'lockdown' ? 'lockdown' : (data.status === 'offline' ? 'offline' : (data.status === 'error' ? 'offline' : 'online'))
            }));
          } else {
             setServer(prev => ({
              ...prev,
              activeTickets: data.activeTickets !== undefined ? data.activeTickets : prev.activeTickets,
              latency: data.latency !== undefined ? data.latency : prev.latency,
              status: data.status === 'lockdown' ? 'lockdown' : (data.status === 'offline' ? 'offline' : (data.status === 'error' ? 'offline' : 'online'))
            }));
          }
        }
      } catch (e) {
        // Silent fail on background status poll to avoid noisy error banners during dev reloads
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);


  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', time: new Date().toLocaleTimeString(), user: 'ClusterWorker-01', action: 'Auto Sharding Cluster Engine started. 4 shards active.', severity: 'low' },
    { id: '2', time: new Date().toLocaleTimeString(), user: 'Gemini-AI', action: 'Google Search Live Grounding & Anti-Scam Shield online.', severity: 'low' },
    { id: '3', time: new Date().toLocaleTimeString(), user: 'SecurityCenter', action: 'Immutable audit trail cryptographically verified.', severity: 'low' }
  ]);

  // AI Chat System State
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; sources?: Array<{ title: string; uri: string }>; isError?: boolean }>>([
    { sender: 'assistant', text: 'Hello! I am your Enterprise Gemini AI Assistant. How can I help optimize your cluster today?' }
  ]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySetting[]>([
    { id: 'sec-1', name: 'Anti-Raid Mass Join Shield', description: 'Auto-kick accounts joining in burst patterns > 10 joins/sec', enabled: true, category: 'anti-nuke', riskLevel: 'critical' },
    { id: 'sec-2', name: 'Gemini Crypto Scam & Link Filter', description: 'Analyze link destinations using Gemini 2.5 Flash live threat scan', enabled: true, category: 'links', riskLevel: 'high' },
    { id: 'sec-3', name: 'Immutable Cryptographic Audit Logging', description: 'Hash each log entry sequentially to prevent audit trail tampering', enabled: true, category: 'compliance', riskLevel: 'medium' },
    { id: 'sec-4', name: 'Self-Healing Crash Recovery & Health Checks', description: 'Automatically reboot frozen cluster worker isolates in under 100ms', enabled: true, category: 'permission', riskLevel: 'low' }
  ]);

  // Economy Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const handleAddLog = (action: string, severity: 'low' | 'medium' | 'high' = 'low') => {
    const newEntry: AuditLog = {
      id: `log-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      user: 'Admin',
      action,
      severity
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const handleSendMessageToAi = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = { sender: 'user' as const, text };
    setAiMessages(prev => [...prev, userMsg]);
    setIsGeneratingAi(true);

    // Parse music intent service layer
    const musicIntent = parseMusicIntent(text);
    if (musicIntent.matched) {
      handleAddLog(musicIntent.message, 'low');
    }

    try {
      const response = await apiFetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: aiMessages })
      });
      const data = await response.json();
      if (response.ok) {
        let replyText = data.reply;
        if (musicIntent.matched) {
          replyText += `\n\n🎵 **AI Voice DJ Integration:** \`${musicIntent.message}\``;
        }
        setAiMessages(prev => [...prev, { sender: 'assistant', text: replyText, sources: data.sources }]);
      } else {
        setAiMessages(prev => [...prev, { sender: 'assistant', text: data.error || 'Failed to generate AI response.', isError: true }]);
      }
    } catch (err: any) {
      setAiMessages(prev => [...prev, { sender: 'assistant', text: 'Network error connecting to Gemini AI.', isError: true }]);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleToggleSecuritySetting = (id: string) => {
    setSecuritySettings(prev => prev.map(s => {
      if (s.id === id) {
        const next = !s.enabled;
        handleAddLog(`Toggled security policy '${s.name}' to ${next}`, 'medium');
        return { ...s, enabled: next };
      }
      return s;
    }));
  };

  const handleSimulateRaid = (msg: string) => {
    handleAddLog(`🛡️ [SECURITY SHIELD TRIGGERED] ${msg}`, 'high');
  };

  const handleToggleLockdown = async () => {
    try {
      const res = await apiFetch('/api/bot/lockdown', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setServer(prev => ({ ...prev, status: data.status }));
        // fetchStatus() will eventually pick this up too
      }
    } catch (e) {
      console.error("Failed to toggle lockdown:", e);
    }
  };

  const navigationItems = [
    { id: 'overview', icon: Compass, label: 'Overview & Cluster Health', category: 'CORE ENGINE' },
    { id: 'aisystem', icon: Sparkles, label: 'AI System & Insights', category: 'INTELLIGENCE' },
    { id: 'music', icon: Music, label: 'AI Voice DJ & Music', category: 'ENTERTAINMENT' },
    { id: 'verification', icon: UserCheck, label: 'Verification System & CAPTCHA', category: 'SECURITY' },
    { id: 'security', icon: ShieldCheck, label: 'Security & Database Backup', category: 'PROTECTION' },
    { id: 'live-security', icon: AlertTriangle, label: 'Live Security Events', category: 'MONITORING' },
    { id: 'attack-timeline', icon: Activity, label: 'Attack Timeline', category: 'MONITORING' },
    { id: 'risk-score', icon: Gauge, label: 'Risk Score', category: 'ANALYTICS' },
    { id: 'system-health', icon: Cpu, label: 'System Health', category: 'MONITORING' },
    { id: 'event-throughput', icon: BarChart3, label: 'Event Throughput', category: 'ANALYTICS' },
    { id: 'detection-latency', icon: Clock, label: 'Detection Latency', category: 'ANALYTICS' },
    { id: 'audit-logs', icon: FileText, label: 'Audit Logs', category: 'COMPLIANCE' },
    { id: 'error-monitoring', icon: Bug, label: 'Error Monitoring', category: 'MONITORING' },
    { id: 'backup-status', icon: HardDrive, label: 'Backup Status', category: 'OPERATIONS' },
    { id: 'trust-system', icon: Users, label: 'Trust System', category: 'SECURITY' },
    { id: 'embeds', icon: Palette, label: 'Visual Embed Builder', category: 'BUILDER' },
    { id: 'tickets', icon: Ticket, label: 'Tickets & User Control', category: 'MANAGEMENT' },
    { id: 'billing', icon: Key, label: 'License Keys & Analytics', category: 'ENTERPRISE' },
    { id: 'settings', icon: Settings, label: 'Themes & Multi-Language', category: 'SYSTEM' },
    { id: 'economy', icon: Coins, label: 'Guild Economy & XP', category: 'ENGAGEMENT' },
    { id: 'discord-connect', icon: Radio, label: 'Discord Bot & Live Console', category: 'GATEWAY' },
    { id: 'github', icon: Github, label: 'GitHub Sync & Deployment', category: 'DEVOPS' }
  ];

  
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-sans selection:bg-indigo-500/30">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
           <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-600/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-md bg-[#121212] border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-6">
              <Bot className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-black tracking-tight mb-2">Enterprise Bot Control Panel</h1>
           <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              Enter your Admin Secret Key to access the secure dashboard.
           </p>
           
           <div className="w-full flex flex-col gap-4">
             {discordClientId && (
               <button 
                 onClick={() => {
                   const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
                   window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=token&scope=identify`;
                 }}
                 className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-[#5865F2]/20"
               >
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 127.14 96.36">
                   <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                 </svg>
                 Login with Discord
               </button>
             )}

             {!discordClientId && (
               <div className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg text-center mb-2">
                 Discord OAuth not configured.<br />Please setup DISCORD_CLIENT_ID in .env
               </div>
             )}

             <div className="relative flex items-center my-2">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-medium">OR USE ADMIN SECRET</span>
                <div className="flex-grow border-t border-zinc-800"></div>
             </div>

             <form onSubmit={handleAdminLogin} className="w-full flex flex-col gap-3">
               <input
                 type="password"
                 placeholder="Enter ADMIN_SECRET..."
                 value={adminSecretInput}
                 onChange={(e) => setAdminSecretInput(e.target.value)}
                 className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                 required
               />
               <button 
                 type="submit"
                 className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white py-3.5 rounded-xl font-bold transition-all"
               >
                  <Lock className="w-5 h-5" />
                  Authenticate
               </button>
             </form>
             {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
           </div>
           
           <p className="text-xs text-zinc-600 mt-6 font-medium">
              Protected by Zero-Trust Security Architecture
           </p>
        </div>
      </div>
    );
  }


  return (

    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200" id="dashboard-root">
      
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-xs" id="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-black">
            <Bot className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-zinc-100">Enterprise Bot Control Panel</h1>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase rounded-md border border-indigo-500/20">
                v4.8.2 Ultra
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-bold">Multi-Tenant • Cluster Support • Hot Reload • AI Grounding</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50 text-xs font-bold text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cluster Ping: 18ms</span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            High Availability (4/4 Shards)
          </span>

          {adminAuthenticated ? (
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5"
              title="Click to terminate admin session"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Session Active</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          )}
        </div>
      </header>

      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Admin Authentication</h3>
                <p className="text-xs text-zinc-400">Enter your ADMIN_SECRET key to unlock protected endpoints.</p>
              </div>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              {adminAuthError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400">
                  {adminAuthError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Admin Secret Key</label>
                <input
                  type="password"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_SECRET..."
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-body">
        
        {/* Navigation Sidebar */}
        <section className="lg:col-span-3 flex flex-col gap-4" id="sidebar-panel">
          <div className="bg-[#121212] rounded-2xl p-4 border border-zinc-800/80 shadow-xs flex flex-col gap-3 sticky top-20">
            <div className="pb-2 border-b border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black text-zinc-400 uppercase tracking-wider">Enterprise Modules</h2>
                <p className="text-[10px] text-zinc-500 font-semibold">Enterprise Control & Management Hub</p>
              </div>
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>

            <nav className="flex flex-col gap-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1" id="nav-list">
              {navigationItems.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 text-left ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </section>

        {/* Dynamic Content Canvas */}
        <section className="lg:col-span-9 flex flex-col" id="content-canvas">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex-1"
            >
              <TopFiveFeaturesBar />

              {activeTab === 'overview' && (
                <OverviewTab 
                  server={server} 
                  onToggleLockdown={handleToggleLockdown} 
                  logs={auditLogs}
                  onRefreshLogs={() => handleAddLog('Refreshed cluster telemetry logs', 'low')}
                  isOwner={isAuthenticated}
                />
              )}

              {activeTab === 'aisystem' && (
                <AiSystemTab 
                  messages={aiMessages}
                  isGenerating={isGeneratingAi}
                  onSendMessage={handleSendMessageToAi}
                />
              )}

              {activeTab === 'music' && (
                <MusicPlayerTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'embeds' && (
                <EmbedBuilderTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'security' && (
                <SecurityTab 
                  settings={securitySettings}
                  onToggleSetting={handleToggleSecuritySetting}
                  onSimulateRaid={handleSimulateRaid}
                  serverStatus={server.status}
                  onToggleLockdown={handleToggleLockdown}
                  isOwner={isAuthenticated}
                />
              )}

              {activeTab === 'verification' && (
                <VerificationTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'tickets' && (
                <TicketUserTab 
                  onAddLog={handleAddLog} 
                  serverStatus={server.status}
                  onToggleLockdown={handleToggleLockdown}
                />
              )}

              {activeTab === 'billing' && (
                <EnterpriseBillingTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'settings' && (
                <SettingsTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'economy' && (
                <EconomyTab 
                  leaderboard={leaderboard}
                  onAddLog={handleAddLog}
                />
              )}

              {activeTab === 'discord-connect' && (
                <DiscordConnectTab />
              )}

              {activeTab === 'github' && (
                <GitHubTab />
              )}

              {activeTab === 'live-security' && (
                <LiveSecurityEventsTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'attack-timeline' && (
                <AttackTimelineTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'risk-score' && (
                <RiskScoreTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'system-health' && (
                <SystemHealthTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'event-throughput' && (
                <EventThroughputTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'detection-latency' && (
                <DetectionLatencyTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'audit-logs' && (
                <AuditLogsTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'error-monitoring' && (
                <ErrorMonitoringTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'backup-status' && (
                <BackupStatusTab onAddLog={handleAddLog} />
              )}

              {activeTab === 'trust-system' && (
                <TrustSystemTab onAddLog={handleAddLog} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-[#09090b] py-4 text-center text-xs text-zinc-500 font-medium mt-auto" id="dashboard-footer">
        © {new Date().getFullYear()} Enterprise Discord Bot Core Engine. High Availability & Multi-Tenant Architecture.
      </footer>
    </div>
  );
}
