import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Network, 
  Activity, 
  Clock,
  Server,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import os from 'os';

interface DetailedHealth {
  status: string;
  timestamp: string;
  uptime: number;
  bot: { connected: boolean; latency: number; guilds: number; users: number };
  gateway: { latency: number; heartbeat: number; sessionId?: string };
  events: { ratePerSecond: number; lastEventTimestamp: string };
  system: { cpu: number; ram: number; uptime: number; nodeVersion: string };
  engine: { status: string; latencyMicros: number; throughput: number; simd: boolean; nativeLoaded: boolean };
  workers: { active: number; crashed: number; restarts: number };
  errorRate: { last5min: number; last1hour: number };
  auditQueue: { size: number; flushed: number; pending: number };
}

interface SystemHealthTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function SystemHealthTab({ onAddLog }: SystemHealthTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<DetailedHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      setError(null);
      const res = await fetch('/api/health/detailed');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const getHealthColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'text-red-400';
    if (value >= thresholds.warning) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getBarColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'bg-red-500';
    if (value >= thresholds.warning) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <div className="space-y-6" id="system-health-tab">
        <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">System Health</h2>
              <p className="text-xs text-zinc-400 font-semibold">Loading system metrics...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3"></div>
                <div className="h-8 bg-zinc-800 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-zinc-800 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" id="system-health-tab">
        <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">System Health</h2>
              <p className="text-xs text-red-400 font-semibold">Failed to load health data</p>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-6 border border-red-500/30 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-300 mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 mx-auto">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="space-y-6" id="system-health-tab">
        <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">System Health</h2>
              <p className="text-xs text-zinc-400 font-semibold">No health data available</p>
            </div>
          </div>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-medium">Health endpoint returned no data</p>
            <button onClick={handleRefresh} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 mx-auto">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cpuVal = health.system.cpu;
  const ramVal = health.system.ram;
  const latencyVal = health.bot.latency;
  const errorRateVal = health.errorRate.last5min;

  return (
    <div className="space-y-6" id="system-health-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">System Health</h2>
              <p className="text-xs text-zinc-400 font-semibold">Real-time system metrics from /api/health/detailed</p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-zinc-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Uptime</span>
              <span className="text-sm font-black text-zinc-100">{formatUptime(health.uptime)}</span>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Processes</span>
              <span className="text-sm font-black text-zinc-100">{health.workers.active}</span>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">CPU Cores</span>
              <span className="text-sm font-black text-zinc-100">{health.workers.active || os?.cpus?.length || 'N/A'}</span>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <MemoryStick className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Memory</span>
              <span className="text-sm font-black text-zinc-100">{Math.round(ramVal)} MB</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-indigo-400"><Cpu className="w-4 h-4" /></div>
                <span className="text-xs font-bold text-zinc-300">CPU Usage</span>
              </div>
              <span className={`text-lg font-black ${getHealthColor(cpuVal, { warning: 60, danger: 80 })}`}>
                {cpuVal.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(cpuVal, { warning: 60, danger: 80 })}`} style={{ width: `${Math.min(100, cpuVal)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Load Average: {cpuVal.toFixed(2)}</span>
              <span>{health.system.nodeVersion}</span>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-emerald-400"><MemoryStick className="w-4 h-4" /></div>
                <span className="text-xs font-bold text-zinc-300">RAM Usage</span>
              </div>
              <span className={`text-lg font-black ${getHealthColor(ramVal, { warning: 80, danger: 90 })}`}>
                {ramVal.toFixed(1)} MB
              </span>
            </div>
            <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(ramVal, { warning: 80, danger: 90 })}`} style={{ width: `${Math.min(100, (ramVal / 1024) * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Heap: {ramVal.toFixed(1)} MB</span>
              <span>{health.engine.simd ? 'SIMD Active' : 'SIMD Off'}</span>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-purple-400"><Network className="w-4 h-4" /></div>
                <span className="text-xs font-bold text-zinc-300">Gateway Latency</span>
              </div>
              <span className={`text-lg font-black ${getHealthColor(latencyVal, { warning: 200, danger: 500 })}`}>
                {latencyVal}ms
              </span>
            </div>
            <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(latencyVal, { warning: 200, danger: 500 })}`} style={{ width: `${Math.min(100, (latencyVal / 1000) * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Ping: {latencyVal}ms</span>
              <span>Session: {health.gateway.sessionId ? 'Active' : 'None'}</span>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-amber-400"><Activity className="w-4 h-4" /></div>
                <span className="text-xs font-bold text-zinc-300">Error Rate (5m)</span>
              </div>
              <span className={`text-lg font-black ${getHealthColor(errorRateVal, { warning: 5, danger: 10 })}`}>
                {errorRateVal}
              </span>
            </div>
            <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(errorRateVal, { warning: 5, danger: 10 })}`} style={{ width: `${Math.min(100, errorRateVal * 5)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>1h: {health.errorRate.last1hour} errors</span>
              <span>Audit: {health.auditQueue.size} entries</span>
            </div>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">System Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Engine</span>
              <span className="text-xs font-black text-zinc-100">{health.engine.status}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Latency</span>
              <span className="text-xs font-black text-zinc-100">{health.engine.latencyMicros} µs</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Throughput</span>
              <span className="text-xs font-black text-zinc-100">{health.engine.throughput}/s</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Native</span>
              <span className={`text-xs font-black ${health.engine.nativeLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                {health.engine.nativeLoaded ? 'Loaded' : 'Fallback'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
