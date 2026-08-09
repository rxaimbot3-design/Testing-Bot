import React, { useState } from 'react';
import { 
  Workflow, 
  Clock, 
  Zap, 
  FileCheck, 
  Terminal, 
  Webhook, 
  Plus, 
  Trash2, 
  Check, 
  Layers, 
  Sliders, 
  Send,
  Globe,
  Sparkles
} from 'lucide-react';
import { WorkflowRule } from '../types';

interface AutomationsTabProps {
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function AutomationsTab({ onAddLog }: AutomationsTabProps) {
  const [activeSub, setActiveSub] = useState<'workflows' | 'slash' | 'forms' | 'webhooks'>('workflows');

  // Workflows state
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([
    { id: 'w1', name: 'New Member Auto-Welcome & Verification Embed', trigger: 'On Member Join', action: 'Assign "Unverified" role & send DM verification link', enabled: true, executionsToday: 48 },
    { id: 'w2', name: 'Anti-Spam Rapid Link Quarantine', trigger: 'On Message Send (contains URL)', action: 'Check via Gemini AI -> Timeout user if scam score > 85%', enabled: true, executionsToday: 12 },
    { id: 'w3', name: 'Daily Morning Server Health Summary', trigger: 'Scheduled Task (Cron: 0 8 * * *)', action: 'Generate AI activity digest & post to #staff-announcements', enabled: true, executionsToday: 1 }
  ]);

  // Slash commands state
  const [slashCommands, setSlashCommands] = useState([
    { name: 'ask', desc: 'Ask Gemini AI anything', type: 'AI Query' },
    { name: 'translate', desc: 'Auto translate to Bengali / English', type: 'Utility' },
    { name: 'toxicity', desc: 'Check text toxicity score', type: 'Moderation' },
    { name: 'server-health', desc: 'Latency and cluster ping stats', type: 'System' }
  ]);
  const [newCmdName, setNewCmdName] = useState('');
  const [newCmdDesc, setNewCmdDesc] = useState('');

  // Custom Forms state
  const [forms, setForms] = useState([
    { id: 'f1', title: 'Staff Application Modal', questions: ['Why do you want to join staff?', 'How many hours are you active?'] },
    { id: 'f2', title: 'User Bug Report Modal', questions: ['Describe the bug encountered', 'Steps to reproduce'] }
  ]);

  // Webhooks state
  const [webhooks, setWebhooks] = useState([
    { id: 'wh1', name: 'Stripe Payment Webhook', url: 'https://api.yourdomain.com/webhooks/stripe', status: 'Active' },
    { id: 'wh2', name: 'GitHub Commit Relay', url: 'https://api.yourdomain.com/webhooks/github', status: 'Active' }
  ]);

  const handleToggleWorkflow = (id: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === id) {
        const next = !w.enabled;
        onAddLog(`Toggled Workflow '${w.name}' to ${next}`, 'low');
        return { ...w, enabled: next };
      }
      return w;
    }));
  };

  const handleCreateSlashCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmdName.trim()) return;
    const cleanName = newCmdName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setSlashCommands([...slashCommands, { name: cleanName, desc: newCmdDesc || 'Custom slash command', type: 'Custom' }]);
    setNewCmdName('');
    setNewCmdDesc('');
    onAddLog(`Created custom slash command '/${cleanName}'`, 'medium');
  };

  return (
    <div className="space-y-6" id="automations-tab-container">
      
      {/* Navigation Sub-header */}
      <div className="bg-[#121212] rounded-xl p-3 border border-zinc-800/80 flex flex-wrap gap-2 shadow-xs" id="automations-nav">
        {[
          { id: 'workflows', icon: Workflow, label: 'Workflow Automation & Cron Tasks' },
          { id: 'slash', icon: Terminal, label: 'Slash Command Builder' },
          { id: 'forms', icon: FileCheck, label: 'Custom Modal Forms' },
          { id: 'webhooks', icon: Webhook, label: 'Webhooks & External APIs' }
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

      {/* SECTION 1: WORKFLOW AUTOMATION & SCHEDULED TASKS */}
      {activeSub === 'workflows' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-zinc-900 rounded-2xl p-6 text-white border border-indigo-800/40 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase border border-indigo-400/30">
                Trigger-Action Engine
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-zinc-400 font-medium">Cron Scheduler Active</span>
            </div>
            <h2 className="text-lg font-black tracking-tight">Workflow Automation, Scheduled Tasks & Event Rules</h2>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed mt-1">
              Automate repetitive server tasks with visual triggers, cron expressions, and automated event listeners.
            </p>
          </div>

          <div className="space-y-3">
            {workflows.map(w => (
              <div key={w.id} className="bg-[#121212] p-5 rounded-xl border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-zinc-100">{w.name}</h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                      {w.executionsToday} runs today
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-zinc-700">Trigger:</span> {w.trigger} 
                    <span className="text-zinc-300">→</span>
                    <span className="font-bold text-zinc-700">Action:</span> {w.action}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleWorkflow(w.id)}
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-200 focus:outline-none shrink-0 ${
                    w.enabled ? 'bg-indigo-600' : 'bg-zinc-200'
                  }`}
                >
                  <div className={`w-5.5 h-5.5 rounded-full bg-[#121212] shadow-md transform transition-all duration-200 ${
                    w.enabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: SLASH COMMAND BUILDER */}
      {activeSub === 'slash' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Create Slash Command</h3>
            </div>

            <form onSubmit={handleCreateSlashCmd} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Command Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">/</span>
                  <input
                    type="text"
                    value={newCmdName}
                    onChange={(e) => setNewCmdName(e.target.value)}
                    placeholder="e.g. verify, custom-rules"
                    className="w-full pl-6 pr-3 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Description</label>
                <input
                  type="text"
                  value={newCmdDesc}
                  onChange={(e) => setNewCmdDesc(e.target.value)}
                  placeholder="What does this slash command do?"
                  className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                + REGISTER SLASH COMMAND
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-3 shadow-xs">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">Registered Guild Commands</h3>
            
            <div className="space-y-2">
              {slashCommands.map((cmd, idx) => (
                <div key={idx} className="p-3 bg-[#18181b] rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-extrabold text-indigo-600">/{cmd.name}</span>
                    <p className="text-[11px] text-zinc-500">{cmd.desc}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                    {cmd.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CUSTOM MODAL FORMS */}
      {activeSub === 'forms' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Custom Discord Forms & Application Modals</h3>
            <p className="text-xs text-zinc-500">Design interactive popup forms for staff applications, ban appeals, and member feedback.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map(form => (
              <div key={form.id} className="p-4 bg-[#18181b] rounded-xl border border-zinc-800 space-y-2">
                <h4 className="text-xs font-black text-zinc-100">{form.title}</h4>
                <div className="space-y-1">
                  {form.questions.map((q, idx) => (
                    <div key={idx} className="text-[11px] text-zinc-400 p-2 bg-[#121212] rounded border border-zinc-800/40">
                      Q{idx + 1}: {q}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: WEBHOOKS & EXTERNAL APIS */}
      {activeSub === 'webhooks' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">External Webhooks & API Integrations</h3>
            <p className="text-xs text-zinc-500">Trigger outgoing webhooks or listen to incoming payloads from Stripe, GitHub, or custom servers.</p>
          </div>

          <div className="space-y-2">
            {webhooks.map(wh => (
              <div key={wh.id} className="p-3 bg-[#18181b] rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-extrabold text-zinc-100">{wh.name}</h4>
                  <code className="text-[10px] text-zinc-400 font-mono">{wh.url}</code>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200/50">
                  ● {wh.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
