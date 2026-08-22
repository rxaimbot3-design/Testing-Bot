import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  Bot,
  Cpu,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    api: { status: 'up' | 'down'; latencyMs?: number };
    database: { status: 'up' | 'down' };
    redis: { status: 'up' | 'down' };
    cppEngine: { status: 'up' | 'down'; mode?: string };
    discordBot: { status: 'up' | 'down' };
  };
  version: string;
}

export default function HealthCheck({ onRefresh }: { onRefresh?: () => void }) {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setLastChecked(new Date());
      }
    } catch {
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        checks: {
          api: { status: 'down' },
          database: { status: 'down' },
          redis: { status: 'down' },
          cppEngine: { status: 'down', mode: 'unknown' },
          discordBot: { status: 'down' }
        },
        version: 'unknown'
      });
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': case 'healthy': return 'text-emerald-400';
      case 'down': case 'unhealthy': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'up': case 'healthy': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'down': case 'unhealthy': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-amber-500/10 border-amber-500/30';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const overallStatus = health?.status || 'unknown';
  const overallColor = getStatusColor(overallStatus);

  return (
    <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs" id="health-check-component">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-100 uppercase tracking-tight">System Health</h3>
            <p className="text-[10px] text-zinc-400 font-medium">Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}</p>
          </div>
        </div>
        <button
          onClick={() => { fetchHealth(); onRefresh?.(); }}
          disabled={loading}
          className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-4 ${getStatusBg(overallStatus)}`}>
        {overallStatus !== 'unknown' && overallStatus !== 'degraded' && overallStatus !== 'unhealthy' ? (
          <CheckCircle className={`w-4 h-4 ${overallColor}`} />
        ) : (
          <XCircle className={`w-4 h-4 ${overallColor}`} />
        )}
        <span className={`text-xs font-black uppercase ${overallColor}`}>
          {loading ? 'Checking...' : overallStatus}
        </span>
      </div>

      {health && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border ${getStatusBg(health.checks.api.status)}`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase">API</span>
              </div>
              <span className={`text-xs font-black ${getStatusColor(health.checks.api.status)}`}>
                {health.checks.api.status.toUpperCase()}
              </span>
              {health.checks.api.latencyMs && (
                <span className="text-[10px] text-zinc-500 block">{health.checks.api.latencyMs}ms</span>
              )}
            </div>

            <div className={`p-3 rounded-xl border ${getStatusBg(health.checks.database.status)}`}>
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase">Database</span>
              </div>
              <span className={`text-xs font-black ${getStatusColor(health.checks.database.status)}`}>
                {health.checks.database.status.toUpperCase()}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${getStatusBg(health.checks.redis.status)}`}>
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase">Redis</span>
              </div>
              <span className={`text-xs font-black ${getStatusColor(health.checks.redis.status)}`}>
                {health.checks.redis.status.toUpperCase()}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${getStatusBg(health.checks.cppEngine.status)}`}>
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase">C++ Engine</span>
              </div>
              <span className={`text-xs font-black ${getStatusColor(health.checks.cppEngine.status)}`}>
                {health.checks.cppEngine.status.toUpperCase()}
              </span>
              {health.checks.cppEngine.mode && (
                <span className="text-[10px] text-zinc-500 block">{health.checks.cppEngine.mode}</span>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${getStatusBg(health.checks.discordBot.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase">Discord Bot</span>
              </div>
              <span className={`text-xs font-black ${getStatusColor(health.checks.discordBot.status)}`}>
                {health.checks.discordBot.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-[10px] text-zinc-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Uptime: {formatUptime(health.uptime)}</span>
            </div>
            <span>v{health.version}</span>
          </div>
        </div>
      )}
    </div>
  );
}
