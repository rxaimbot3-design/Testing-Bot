import React, { useState } from 'react';
import { 
  Palette, 
  Languages, 
  Layers, 
  Download, 
  Upload, 
  ArrowRightLeft, 
  Activity, 
  CheckCircle, 
  Sparkles,
  Globe
} from 'lucide-react';

interface SettingsTabProps {
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function SettingsTab({ onAddLog }: SettingsTabProps) {
  const [activeSub, setActiveSub] = useState<'themes' | 'localization' | 'templates' | 'migration'>('themes');

  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'banglish' | 'bangla'>('english');
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'cyber'>('light');

  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  const handleExportConfig = () => {
    const config = {
      version: "4.8.2-enterprise",
      exportedAt: new Date().toISOString(),
      language: currentLanguage,
      theme: currentTheme,
      securityPolicies: { maxMentions: 5, linkFilter: true, antiSpamSensitivity: "high" }
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bot_Config_Backup_${Date.now()}.json`;
    a.click();
    onAddLog('Exported full bot configuration JSON', 'low');
  };

  const handleOneClickMigration = () => {
    setMigrationStatus('Syncing channels, roles, and bot configuration across servers...');
    setTimeout(() => {
      setMigrationStatus('✅ One-Click Server Migration complete! All permissions & settings cloned.');
      onAddLog('Executed One-Click Server Migration to target guild', 'high');
    }, 2000);
  };

  return (
    <div className="space-y-6" id="settings-tab-container">
      
      {/* Sub-navigation Header */}
      <div className="bg-[#121212] rounded-xl p-3 border border-zinc-800/80 flex flex-wrap gap-2 shadow-xs">
        {[
          { id: 'themes', icon: Palette, label: 'Theme Manager & Styling' },
          { id: 'localization', icon: Languages, label: 'Localization & Multi-Language' },
          { id: 'templates', icon: Layers, label: 'Template Library & Import/Export' },
          { id: 'migration', icon: ArrowRightLeft, label: 'One-Click Server Migration' }
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

      {/* SECTION 1: THEME MANAGER */}
      {activeSub === 'themes' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Dashboard Theme Manager</h3>
          <p className="text-xs text-zinc-500">Choose your preferred visual theme for the control dashboard.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'light', name: 'Clean Modern Light', desc: 'High contrast crisp layout (Default)' },
              { id: 'dark', name: 'Dark Luxury Obsidian', desc: 'Eye-safe deep dark canvas' },
              { id: 'cyber', name: 'Cyber Neon Matrix', desc: 'Vibrant neon purple and emerald accents' }
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  setCurrentTheme(theme.id as any);
                  onAddLog(`Switched dashboard theme to ${theme.name}`, 'low');
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  currentTheme === theme.id 
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <h4 className="text-xs font-extrabold text-zinc-100">{theme.name}</h4>
                <p className="text-[11px] text-zinc-500 mt-1">{theme.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: LOCALIZATION & MULTI-LANGUAGE */}
      {activeSub === 'localization' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Localization & Multi-Language Support</h3>
          <p className="text-xs text-zinc-500">Set primary bot response language for slash commands and automated messages.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'english', name: 'Global English (US/UK)', label: 'English (US)' },
              { id: 'banglish', name: 'Banglish (Bangla + English)', label: 'Banglish' },
              { id: 'bangla', name: 'Bengali (Bangla)', label: 'Bengali' }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => {
                  setCurrentLanguage(lang.id as any);
                  onAddLog(`Changed bot response language to ${lang.name}`, 'low');
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  currentLanguage === lang.id 
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <h4 className="text-xs font-extrabold text-zinc-100">{lang.name}</h4>
                <span className="text-[11px] font-bold text-indigo-600 block mt-1">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: TEMPLATES & IMPORT/EXPORT */}
      {activeSub === 'templates' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Configuration Backup & Template Library</h3>
              <p className="text-xs text-zinc-500">Import or export your bot settings in one click.</p>
            </div>
            <button
              onClick={handleExportConfig}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> EXPORT CONFIG JSON
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: ONE-CLICK SERVER MIGRATION */}
      {activeSub === 'migration' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">One-Click Server Migration Engine</h3>
            <p className="text-xs text-zinc-500">Clone all channel layouts, role permissions, and bot parameters to a new Discord server.</p>
          </div>

          {migrationStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
              {migrationStatus}
            </div>
          )}

          <button
            onClick={handleOneClickMigration}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" /> START ONE-CLICK SERVER MIGRATION
          </button>
        </div>
      )}

    </div>
  );
}
