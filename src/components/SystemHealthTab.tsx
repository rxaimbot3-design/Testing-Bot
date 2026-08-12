import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Network, 
  Activity, 
  Clock,
  Server
} from 'lucide-react';

interface SystemHealthTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

interface SystemMetric {
  label: string;
  value: number;
  unit: string;
  max: number;
  icon: React.ReactNode;
  color: string;
  history: number[];
}

export default function SystemHealthTab({ onAddLog }: SystemHealthTabProps) {
  const [uptime, setUptime] = useState(0);
  const [processCount, setProcessCount] = useState(0);

  const [metrics, setMetrics] = useState<SystemMetric[]>([
    {
      label: 'CPU Usage',
      value: 0,
      unit: '%',
      max: 100,
      icon: <Cpu className="w-5 h-5" />,
      color: 'text-indigo-400',
      history: []
    },
    {
      label: 'RAM Usage',
      value: 0,
      unit: '%',
      max: 100,
      icon: <MemoryStick className="w-5 h-5" />,
      color: 'text-emerald-400',
      history: []
    },
    {
      label: 'Disk Usage',
      value: 0,
      unit: '%',
      max: 100,
      icon: <HardDrive className="w-5 h-5" />,
      color: 'text-amber-400',
      history: []
    },
    {
      label: 'Network I/O',
      value: 0,
      unit: 'Mbps',
      max: 1000,
      icon: <Network className="w-5 h-5" />,
      color: 'text-purple-400',
      history: []
    }
  ]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
      
      const cpuVal = Math.min(100, Math.max(5, Math.random() * 40 + 10));
      const ramVal = Math.min(100, Math.max(20, Math.random() * 50 + 30));
      const diskVal = Math.min(100, Math.max(10, Math.random() * 30 + 40));
      const netVal = Math.min(1000, Math.max(10, Math.random() * 200 + 50));

      setMetrics(prev => prev.map((m, idx) => {
        const newVal = [cpuVal, ramVal, diskVal, netVal][idx];
        return {
          ...m,
          value: newVal,
          history: [...m.history.slice(-29), newVal]
        };
      }));

      setProcessCount(Math.floor(Math.random() * 50 + 80));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const getBarColor = (metric: SystemMetric) => {
    if (metric.label === 'CPU Usage') {
      if (metric.value > 80) return 'bg-red-500';
      if (metric.value > 60) return 'bg-amber-500';
      return 'bg-indigo-500';
    }
    if (metric.value > 80) return 'bg-red-500';
    if (metric.value > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6" id="system-health-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">System Health</h2>
            <p className="text-xs text-zinc-400 font-semibold">Real-time system metrics and resource monitoring</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Uptime</span>
              <span className="text-sm font-black text-zinc-100">{formatUptime(uptime)}</span>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Processes</span>
              <span className="text-sm font-black text-zinc-100">{processCount}</span>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">CPU Cores</span>
              <span className="text-sm font-black text-zinc-100">8</span>
            </div>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <MemoryStick className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Memory</span>
              <span className="text-sm font-black text-zinc-100">16 GB</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={metric.color}>{metric.icon}</div>
                  <span className="text-xs font-bold text-zinc-300">{metric.label}</span>
                </div>
                <span className={`text-lg font-black ${metric.color}`}>
                  {metric.value.toFixed(1)}{metric.unit}
                </span>
              </div>
              <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(metric)}`}
                  style={{ width: `${Math.min(100, (metric.value / metric.max) * 100)}%` }}
                />
              </div>
              <div className="h-12 flex items-end gap-0.5">
                {metric.history.map((val, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-t ${getBarColor(metric)} opacity-80`}
                    style={{ height: `${(val / metric.max) * 100}%`, minHeight: '2px' }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800/60">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">System Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">OS</span>
              <span className="text-xs font-black text-zinc-100">Linux 6.5.0</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Node.js</span>
              <span className="text-xs font-black text-zinc-100">v20.10.0</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Architecture</span>
              <span className="text-xs font-black text-zinc-100">x64</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Hostname</span>
              <span className="text-xs font-black text-zinc-100">prod-node-01</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
