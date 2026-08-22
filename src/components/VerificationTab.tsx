import React, { useState } from 'react';
import { apiFetch } from '../services/apiClient';
import { 
  ShieldCheck, 
  CheckCircle2, 
  UserCheck, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  QrCode, 
  ExternalLink, 
  Clock, 
  AlertOctagon, 
  Key, 
  Send,
  Layers,
  Settings,
  ShieldAlert
} from 'lucide-react';

interface VerificationTabProps {
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function VerificationTab({ onAddLog }: VerificationTabProps) {
  const [activeSub, setActiveSub] = useState<'methods' | 'embeds' | 'simulator' | 'settings'>('methods');

  // Verification Methods Config
  const [methods, setMethods] = useState([
    { id: 'btn', name: 'One-Click Button Verification', type: 'Instant Reaction / Button', enabled: true, desc: 'Users click a "Verify" button in the designated channel to instantly receive the Verified role.' },
    { id: 'captcha', name: 'CAPTCHA Image / Text Challenge', type: 'Anti-Bot Captcha', enabled: true, desc: 'Users must answer an image/text CAPTCHA modal before gaining server access.' },
    { id: 'oauth', name: 'Discord Web OAuth2 Verification', type: 'Zero-Trust Web Gateway', enabled: true, desc: 'Requires members to authorize via web portal to verify account age and IP reputation.' },
    { id: 'math', name: 'Smart Math Problem Challenge', type: 'Logic Modal', enabled: false, desc: 'Presents a randomized arithmetic equation in a Discord modal.' }
  ]);

  // Verification Settings
  const [settings, setSettings] = useState({
    verifiedRole: 'Member',
    unverifiedRole: 'Unverified',
    quarantineRole: 'Quarantined',
    minAccountAgeDays: 7,
    autoKickFailedAttempts: 3,
    logChannel: '#verification-logs',
    welcomeMessage: 'Welcome to the server! Click the button below to complete verification.'
  });

  // Verification Simulator State
  const [simStep, setSimStep] = useState<'start' | 'captcha' | 'success' | 'failed'>('start');
  const [simAnswer, setSimAnswer] = useState('');
  const [simError, setSimError] = useState<string | null>(null);

  const handleToggleMethod = (id: string) => {
    setMethods(prev => prev.map(m => {
      if (m.id === id) {
        const next = !m.enabled;
        onAddLog(`Toggled Verification Method '${m.name}' to ${next ? 'ENABLED' : 'DISABLED'}`, 'medium');
        return { ...m, enabled: next };
      }
      return m;
    }));
  };

  const handleSimulateVerify = () => {
    if (simAnswer.trim() === '789') {
      setSimStep('success');
      setSimError(null);
      onAddLog('Verification Simulator: User successfully passed CAPTCHA challenge.', 'low');
    } else {
      setSimError('Incorrect CAPTCHA code. Try again (Hint: 789).');
      onAddLog('Verification Simulator: User failed verification CAPTCHA.', 'low');
    }
  };


  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleManualAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await apiFetch("/api/bot/verify-audit", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAuditResult(data.message);
        onAddLog('Manual Zero Trust Verification Audit Executed.', 'medium');
      } else {
        setAuditResult(`Audit failed: ${data.error}`);
      }
    } catch (err: any) {
      setAuditResult(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleResetSim = () => {
    setSimStep('start');
    setSimAnswer('');
    setSimError(null);
  };

  return (
    <div className="space-y-6" id="verification-tab-container">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-zinc-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-500/30 relative overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase border border-emerald-400/30 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> ZERO TRUST MEMBER VERIFICATION
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-zinc-300 font-bold">Anti-Raid Gate Active</span>
        </div>
        <h2 className="text-xl font-black tracking-tight">Enterprise Member Verification System</h2>
        <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed mt-1">
          Protect your Discord server against self-bots, mass raid accounts, and spam bots with multi-tier CAPTCHA, Web OAuth2, and automated quarantine gates.
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="bg-[#121212] rounded-xl p-3 border border-zinc-800/80 flex flex-wrap gap-2 shadow-xs">
        {[
          { id: 'methods', icon: ShieldCheck, label: 'Verification Gateways' },
          { id: 'simulator', icon: Sparkles, label: 'Interactive Live Simulator' },
          { id: 'settings', icon: Settings, label: 'Roles & Auto-Quarantine Policy' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSub === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSub(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-zinc-400 hover:bg-[#27272a] hover:text-zinc-950'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: VERIFICATION GATEWAYS */}
      {activeSub === 'methods' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map(m => (
              <div key={m.id} className="bg-[#121212] p-5 rounded-xl border border-zinc-800/80 flex flex-col justify-between gap-4 shadow-xs hover:border-zinc-700 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-100">
                      {m.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      m.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-200/50' : 'bg-[#27272a] text-zinc-500'
                    }`}>
                      {m.enabled ? '● Active' : '○ Disabled'}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-zinc-100">{m.name}</h3>
                  <p className="text-xs text-zinc-500 leading-normal">{m.desc}</p>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-medium">Gateway Protocol v4</span>
                  <button
                    onClick={() => handleToggleMethod(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                      m.enabled ? 'bg-[#27272a] hover:bg-rose-500/10 text-zinc-700 hover:text-rose-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {m.enabled ? 'DISABLE' : 'ENABLE GATEWAY'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: LIVE SIMULATOR */}
      {activeSub === 'simulator' && (
        <div className="bg-[#121212] rounded-xl p-6 border border-zinc-800/80 space-y-6 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Verification Flow Test Simulator</h3>
            <p className="text-xs text-zinc-500">Test how new members will experience your Discord verification prompt in real time.</p>
          </div>

          {/* Discord Embed Mock */}
          <div className="max-w-md mx-auto bg-zinc-900 rounded-2xl p-5 border border-zinc-800 text-white space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                🤖
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-100">Enterprise Bot Gatekeeper</h4>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">BOT</span>
              </div>
            </div>

            {simStep === 'start' && (
              <div className="space-y-3">
                <div className="border-l-4 border-indigo-500 pl-3 space-y-1">
                  <h5 className="text-xs font-extrabold text-zinc-100">🔒 Server Member Verification</h5>
                  <p className="text-[11px] text-zinc-300 leading-normal">
                    {settings.welcomeMessage}
                  </p>
                </div>
                <button
                  onClick={() => setSimStep('captcha')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <UserCheck className="w-4 h-4" /> VERIFY MY ACCOUNT
                </button>
              </div>
            )}

            {simStep === 'captcha' && (
              <div className="space-y-3">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-center space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 block">CAPTCHA CODE:</span>
                  <div className="font-mono text-2xl font-black tracking-widest text-emerald-400 bg-zinc-900 py-2 rounded-lg border border-zinc-800 select-none italic">
                    7 8 9
                  </div>
                </div>

                {simError && (
                  <p className="text-[10px] font-bold text-rose-400 text-center">{simError}</p>
                )}

                <input
                  type="text"
                  placeholder="Enter 3-digit code..."
                  value={simAnswer}
                  onChange={(e) => setSimAnswer(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 text-center"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSimulateVerify}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase"
                  >
                    SUBMIT CODE
                  </button>
                  <button
                    onClick={handleResetSim}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
                  >
                    RESET
                  </button>
                </div>
              </div>
            )}

            {simStep === 'success' && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h5 className="text-xs font-black text-emerald-300 uppercase">Verification Complete!</h5>
                <p className="text-[11px] text-emerald-200">
                  You have been assigned the <strong>@{settings.verifiedRole}</strong> role! Access granted to all public channels.
                </p>
                <button
                  onClick={handleResetSim}
                  className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase"
                >
                  TEST AGAIN
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: POLICY & ROLE CONFIGURATION */}
      {activeSub === 'settings' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Verification Policy & Role Assignment</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Verified Member Role</label>
              <input
                type="text"
                value={settings.verifiedRole}
                onChange={(e) => setSettings({ ...settings, verifiedRole: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Unverified Role (Restricted Access)</label>
              <input
                type="text"
                value={settings.unverifiedRole}
                onChange={(e) => setSettings({ ...settings, unverifiedRole: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Minimum Account Age Filter (Days)</label>
              <input
                type="number"
                value={settings.minAccountAgeDays}
                onChange={(e) => setSettings({ ...settings, minAccountAgeDays: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Auto-Quarantine Log Channel</label>
              <input
                type="text"
                value={settings.logChannel}
                onChange={(e) => setSettings({ ...settings, logChannel: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 space-y-3">
            <h4 className="text-xs font-black text-zinc-100 uppercase tracking-wider">
              Channel Permissions Matrix Upon Receiving @{settings.verifiedRole} Role
            </h4>
            <p className="text-xs text-zinc-500">
              Automated channel permission overrides enforced immediately after member passes verification:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#18181b] rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                  <Lock className="w-3.5 h-3.5" /> Locked Voice Channels
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Remain strictly <strong>LOCKED</strong> (`CONNECT: Denied`). Verified users cannot join restricted VCs.
                </p>
                <span className="inline-block px-2 py-0.5 bg-amber-100/80 text-amber-800 text-[9px] font-black uppercase rounded">
                  🔒 LOCK PRESERVED
                </span>
              </div>

              <div className="p-3.5 bg-[#18181b] rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked Text & VC
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Automatically <strong>UNLOCKED</strong> (`VIEW & SEND: Allowed`). Full access granted to public chat and voice.
                </p>
                <span className="inline-block px-2 py-0.5 bg-emerald-100/80 text-emerald-800 text-[9px] font-black uppercase rounded">
                  🔓 ACCESS UNLOCKED
                </span>
              </div>

              <div className="p-3.5 bg-[#18181b] rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> Hidden Admin / Staff Channels
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Remain fully <strong>HIDDEN</strong> (`VIEW_CHANNEL: Denied`). Invisible to regular members & bots.
                </p>
                <span className="inline-block px-2 py-0.5 bg-rose-100/80 text-rose-800 text-[9px] font-black uppercase rounded">
                  🙈 HIDDEN PRESERVED
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onAddLog('Updated Verification System Roles and Channel Permission Matrix', 'medium')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-colors"
          >
            SAVE VERIFICATION POLICY
          </button>
        </div>
      )}

    </div>
  );
}
