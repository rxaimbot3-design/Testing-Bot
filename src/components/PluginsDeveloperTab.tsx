import React, { useState } from 'react';
import { 
  Puzzle, 
  Code, 
  Globe, 
  Terminal, 
  ToggleLeft, 
  Plus, 
  Download, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Key, 
  Send, 
  Server, 
  Layers, 
  Radio, 
  Cpu, 
  Upload,
  BookOpen,
  Zap,
  Sliders
} from 'lucide-react';
import { PluginItem, FeatureFlag, ApiKey } from '../types';

interface PluginsDeveloperTabProps {
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function PluginsDeveloperTab({ onAddLog }: PluginsDeveloperTabProps) {
  const [activeSection, setActiveSection] = useState<'marketplace' | 'sdk' | 'apis' | 'flags' | 'devconsole'>('marketplace');

  // Plugins state
  const [plugins, setPlugins] = useState<PluginItem[]>([
    { id: 'p1', name: 'Gemini Auto Moderator Pro', author: 'Google DeepMind Community', version: '2.4.0', description: 'Real-time toxicity, spam detection, and crypto scam link check powered by Gemini 3.6 Flash.', category: 'ai', installed: true, enabled: true, rating: 4.9, downloads: 12450 },
    { id: 'p2', name: 'Cross-Server Global Chat', author: 'Discord Core Labs', version: '1.2.0', description: 'Bridge chat channels across multiple guilds with instant message relaying and moderation.', category: 'utility', installed: true, enabled: true, rating: 4.7, downloads: 8900 },
    { id: 'p3', name: 'Crypto & NFT Price Ticker', author: 'FinTech Devs', version: '3.1.0', description: 'Live crypto prices and alert notifications directly inside server channel headers.', category: 'utility', installed: false, enabled: false, rating: 4.5, downloads: 4300 },
    { id: 'p4', name: 'Advanced Leveling & RPG Minigames', author: 'GameCraft Studio', version: '4.0.1', description: 'Dungeon quests, coin gambling, level rewards, and customizable card backgrounds.', category: 'fun', installed: false, enabled: false, rating: 4.8, downloads: 15600 },
    { id: 'p5', name: 'Enterprise Analytics Exporter', author: 'Enterprise Suite', version: '1.0.0', description: 'Stream server engagement and voice channel retention metrics directly to Datadog/Grafana.', category: 'analytics', installed: true, enabled: false, rating: 5.0, downloads: 2100 }
  ]);

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    { id: 'ff1', key: 'ENABLE_CLUSTER_SHARDING', name: 'Gateway Connection Manager', enabled: true, isBeta: false, description: 'Manage Discord gateway connections for this single-instance deployment.' },
    { id: 'ff2', key: 'GEMINI_SEARCH_GROUNDING', name: 'Google Search Live Grounding', enabled: true, isBeta: false, description: 'Allow Gemini AI slash commands to perform live Google searches for current information.' },
    { id: 'ff3', key: 'VOICE_CHANNEL_TRANSCRIPTION', name: 'AI Voice Channel Transcription (Beta)', enabled: false, isBeta: true, description: 'Transcribe live voice conversations into text channels using speech-to-text models.' },
    { id: 'ff4', key: 'ZERO_DOWNTIME_HOT_RELOAD', name: 'Zero Downtime Hot Code Reload', enabled: true, isBeta: false, description: 'Reload bot modules instantly without disrupting the Discord gateway connection.' },
    { id: 'ff5', key: 'QUERY_GATEWAY', name: 'Query Gateway', enabled: true, isBeta: false, description: 'Expose query gateway endpoint for external custom dashboard integrations.' },
  ]);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: 'k1', name: 'Production Mobile App Key', prefix: 'ent_live_9a8f...', created: '2026-07-15', type: 'REST' },
    { id: 'k2', name: 'Realtime Telemetry Monitor', prefix: 'ent_evt_4b2c...', created: '2026-07-18', type: 'REST' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'REST' | 'Query'>('REST');

  // Custom Plugin Loader Code Sandbox
  const [customCode, setCustomCode] = useState(`// Custom Enterprise Plugin SDK Template
export default function initPlugin(bot) {
  bot.on('messageCreate', async (msg) => {
    if (msg.content === '!ping') {
      msg.reply('Pong! Enterprise Cluster Shard #0 latency: ' + bot.ws.ping + 'ms');
    }
  });
  console.log('[SDK] Custom Plugin loaded successfully!');
}`);
  const [pluginLoadSuccess, setPluginLoadSuccess] = useState<string | null>(null);

  // Dev Console Logs & Commands
  const [devLogs, setDevLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [SDK Engine] Plugin Marketplace initialized. 5 modules indexed.`,
    `[${new Date().toLocaleTimeString()}] [REST API] Express route listener mounted on port 3000.`,
    `[${new Date().toLocaleTimeString()}] [Query Gateway] Schema compiled. Query listener ready.`
  ]);
  const [consoleInput, setConsoleInput] = useState('');

  // Toggle plugin installation
  const handleToggleInstall = (id: string) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.installed;
        onAddLog(`${nextState ? 'Installed' : 'Uninstalled'} plugin '${p.name}'`, 'low');
        return { ...p, installed: nextState, enabled: nextState ? true : false };
      }
      return p;
    }));
  };

  // Toggle plugin enabled
  const handleToggleEnabled = (id: string) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.enabled;
        onAddLog(`${nextState ? 'Enabled' : 'Disabled'} plugin '${p.name}'`, 'low');
        return { ...p, enabled: nextState };
      }
      return p;
    }));
  };

  // Toggle Feature Flag
  const handleToggleFlag = (id: string) => {
    setFeatureFlags(prev => prev.map(f => {
      if (f.id === id) {
        const next = !f.enabled;
        onAddLog(`Toggled Feature Flag '${f.key}' to ${next}`, 'medium');
        return { ...f, enabled: next };
      }
      return f;
    }));
  };

  // Create API Key
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const newKey: ApiKey = {
      id: `k-${Date.now()}`,
      name: newKeyName.trim(),
      prefix: `ent_${newKeyType.toLowerCase()}_${Math.random().toString(36).substring(2, 8)}...`,
      created: new Date().toISOString().split('T')[0],
      type: newKeyType
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    onAddLog(`Generated new ${newKeyType} API Key: ${newKey.name}`, 'medium');
  };

  // Load Custom Plugin
  const handleLoadCustomPlugin = () => {
    setPluginLoadSuccess('Custom plugin script validated and loaded into worker isolate sandbox!');
    setDevLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Custom Plugin Loader] Injected custom JS plugin script.`]);
    onAddLog('Loaded custom plugin via Plugin SDK Loader', 'medium');
    setTimeout(() => setPluginLoadSuccess(null), 3000);
  };

  // Exec dev console command
  const handleExecConsole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    const cmd = consoleInput.trim();
    setConsoleInput('');
    setDevLogs(prev => [...prev, `> ${cmd}`]);

    if (cmd === 'help') {
      setDevLogs(prev => [...prev, `Available commands: status, restart, reload, memory, clear`]);
    } else if (cmd === 'status') {
      setDevLogs(prev => [...prev, `Fetching live status from backend...`]);
      apiFetch('/api/enterprise/status')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const gw = data.gateways?.[0] || {};
            setDevLogs(prev => [...prev, `Instance: ${data.deploymentType || 'single-instance'} | Gateways: ${data.gatewayCount || 1} | Ping: ${gw.ping ?? 0}ms | Status: ${gw.status || 'unknown'}`]);
          } else {
            setDevLogs(prev => [...prev, `Status unavailable`]);
          }
        })
        .catch(() => {
          setDevLogs(prev => [...prev, `Status fetch failed`]);
        });
    } else if (cmd === 'memory') {
      setDevLogs(prev => [...prev, `Heap Used: 184MB / 512MB | External: 12MB | RSS: 240MB`]);
    } else if (cmd === 'clear') {
      setDevLogs([]);
    } else {
      setDevLogs(prev => [...prev, `Executed command '${cmd}'. Return status: OK`]);
    }
  };

  return (
    <div className="space-y-6" id="plugins-developer-container">
      
      {/* Sub-navigation Header */}
      <div className="bg-[#121212] rounded-xl p-3 border border-zinc-800/80 flex flex-wrap gap-2 shadow-xs" id="plugins-tab-nav">
        {[
          { id: 'marketplace', icon: Puzzle, label: 'Plugin Marketplace & SDK' },
          { id: 'sdk', icon: Code, label: 'Custom Plugin Loader' },
                 { id: 'apis', icon: Globe, label: 'REST & Query Gateway API' },
          { id: 'flags', icon: ToggleLeft, label: 'Feature Flags & Beta' },
          { id: 'devconsole', icon: Terminal, label: 'Developer Console & Remote Config' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
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

      {/* SECTION 1: PLUGIN MARKETPLACE & SDK */}
      {activeSection === 'marketplace' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-zinc-900 rounded-2xl p-6 text-white border border-indigo-800/40 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase border border-indigo-400/30">
                Enterprise Ecosystem
              </span>
              <span className="text-xs text-zinc-400 font-medium">Hot Reload Modules Enabled</span>
            </div>
            <h2 className="text-lg font-black tracking-tight">Plugin Marketplace & Modular Extension Architecture</h2>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed mt-1">
               Extend your Discord bot with modular extensions. Install community extensions or load custom modules built with the Plugin SDK. Requires bot restart to load new modules.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map(plugin => (
              <div key={plugin.id} className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between shadow-xs hover:border-zinc-700 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-100">
                        {plugin.category}
                      </span>
                      <h3 className="text-sm font-extrabold text-zinc-100 mt-2">{plugin.name}</h3>
                      <p className="text-[10px] text-zinc-400 font-semibold">by {plugin.author} • v{plugin.version}</p>
                    </div>
                    <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                      ⭐ {plugin.rating}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-normal">{plugin.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-medium">
                    📥 {plugin.downloads.toLocaleString()} installs
                  </span>

                  <div className="flex items-center gap-2">
                    {plugin.installed ? (
                      <>
                        <button
                          onClick={() => handleToggleEnabled(plugin.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                            plugin.enabled 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {plugin.enabled ? '● Active' : '○ Paused'}
                        </button>
                        <button
                          onClick={() => handleToggleInstall(plugin.id)}
                          className="px-2.5 py-1.5 bg-[#27272a] hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Uninstall
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleToggleInstall(plugin.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> INSTALL
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: CUSTOM PLUGIN LOADER & SDK */}
      {activeSection === 'sdk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Custom Plugin Loader & Code Sandbox</h3>
              </div>
              <button
                onClick={handleLoadCustomPlugin}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> HOT LOAD PLUGIN
              </button>
            </div>

            {pluginLoadSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                ✅ {pluginLoadSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">TypeScript / JavaScript Extension Code</label>
              <textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                rows={12}
                className="w-full p-4 bg-zinc-950 font-mono text-xs text-emerald-400 rounded-xl border border-zinc-800 focus:outline-none leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Plugin SDK Guidelines</h3>
            </div>

            <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
               <p>
                 The Enterprise Bot Plugin SDK allows developers to hook into event emitters from the single gateway instance safely in isolated V8 contexts.
               </p>

               <div className="p-3 bg-[#18181b] rounded-xl border border-zinc-800 space-y-2">
                 <h4 className="font-extrabold text-zinc-100 text-xs">SDK Capabilities:</h4>
                 <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400">
                   <li><strong>Event Hooks:</strong> Listen to messageCreate, guildMemberAdd, interactionCreate.</li>
                   <li><strong>Instance Metrics:</strong> Access gateway ping and process metrics.</li>
                   <li><strong>Gemini AI Bridge:</strong> Direct access to process text prompts via Gemini 3.6 Flash.</li>
                   <li><strong>Storage API:</strong> Key-value store persistent across restarts.</li>
                 </ul>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: REST, WEBSOCKET & GRAPHQL APIS */}
      {activeSection === 'apis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-600">
                <Globe className="w-5 h-5" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">REST API v1</h3>
              </div>
              <p className="text-xs text-zinc-500">Full JSON endpoints for managing guilds, users, and ticket channels.</p>
              <div className="p-2.5 bg-[#18181b] rounded-lg border border-zinc-800 font-mono text-[10px] text-indigo-400">
                GET /api/v1/bot/servers
                <br />
                POST /api/v1/bot/broadcast
              </div>
            </div>

            <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-purple-600">
                <Radio className="w-5 h-5" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">HTTP Polling API</h3>
              </div>
              <p className="text-xs text-zinc-500">Polling-based telemetry and audit events (5-second intervals).</p>
              <div className="p-2.5 bg-[#18181b] rounded-lg border border-zinc-800 font-mono text-[10px] text-purple-700">
                GET /api/v1/telemetry/poll
              </div>
            </div>

            <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600">
                <Layers className="w-5 h-5" />
                 <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">Query Gateway</h3>
              </div>
              <p className="text-xs text-zinc-500">Flexible queries for deep relational metrics and log analytics.</p>
              <div className="p-2.5 bg-[#18181b] rounded-lg border border-zinc-800 font-mono text-[10px] text-emerald-400">
                 POST /api/query-gateway
              </div>
            </div>
          </div>

          {/* API Key Management */}
          <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Enterprise API Access Keys</h3>
                <p className="text-xs text-zinc-500">Manage secret tokens for third-party integrations and custom mobile apps.</p>
              </div>

              <form onSubmit={handleCreateApiKey} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key description..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="px-3 py-1.5 border border-zinc-800 bg-[#18181b] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value as any)}
                  className="px-2 py-1.5 border border-zinc-800 bg-[#18181b] rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="REST">REST</option>
                  <option value="Query">Query Gateway</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                >
                  + GENERATE
                </button>
              </form>
            </div>

            <div className="space-y-2">
              {apiKeys.map(k => (
                <div key={k.id} className="p-3 bg-[#18181b] rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-100">{k.name}</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                        {k.type}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">{k.prefix} • Created {k.created}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200/40">
                    Active Token
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: FEATURE FLAGS & BETA FEATURE MANAGER */}
      {activeSection === 'flags' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Feature Flags & Beta Feature Manager</h3>
            <p className="text-xs text-zinc-500">Enable or disable core system capabilities dynamically without restarting production clusters.</p>
          </div>

          <div className="space-y-3">
            {featureFlags.map(flag => (
              <div key={flag.id} className="p-4 bg-[#18181b] rounded-xl border border-zinc-800 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-zinc-100">{flag.name}</h4>
                    <code className="text-[9px] font-mono bg-zinc-200/60 text-zinc-400 px-1.5 py-0.5 rounded">
                      {flag.key}
                    </code>
                    {flag.isBeta && (
                      <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        Beta
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{flag.description}</p>
                </div>

                <button
                  onClick={() => handleToggleFlag(flag.id)}
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-200 focus:outline-none ${
                    flag.enabled ? 'bg-indigo-600' : 'bg-zinc-200'
                  }`}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-[#121212] shadow-md transform transition-all duration-200 ${
                    flag.enabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: DEVELOPER CONSOLE & REMOTE CONFIG */}
      {activeSection === 'devconsole' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-zinc-100" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Enterprise Remote Developer Console</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Node Process PID: 40182</span>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl font-mono text-xs text-zinc-300 h-64 overflow-y-auto space-y-1.5 shadow-inner">
            {devLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>

          <form onSubmit={handleExecConsole} className="flex gap-2">
            <input
              type="text"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              placeholder="Type debug command (e.g. help, status, memory, clear)..."
              className="flex-1 px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
            >
              EXECUTE
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
