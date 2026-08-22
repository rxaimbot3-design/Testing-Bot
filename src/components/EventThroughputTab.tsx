import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Target
} from 'lucide-react';
import { apiFetch } from '../services/apiClient';

interface EventThroughputTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

interface ThroughputData {
  timestamp: string;
  eventsPerSecond: number;
  byType: Record<string, number>;
}

export default function EventThroughputTab({ onAddLog }: EventThroughputTabProps) {
  const [throughputHistory, setThroughputHistory] = useState<ThroughputData[]>([]);
  const [currentEps, setCurrentEps] = useState(0);
  const [peakEps, setPeakEps] = useState(0);
  const [baselineEps] = useState(1500);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventTypes = ['security', 'moderation', 'ai', 'voice', 'utility', 'integration'];

  const fetchThroughput = async () => {
    try {
      setError(null);
      const res = await apiFetch('/api/analytics/throughput');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setThroughputHistory(data.data);
        if (data.summary) {
          setCurrentEps(data.summary.currentEps);
          setPeakEps(data.summary.peakEps);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch throughput data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThroughput();
    const interval = setInterval(fetchThroughput, 5000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const typeTotals = eventTypes.reduce((acc, type) => {
    acc[type] = throughputHistory.reduce((sum, d) => sum + (d.byType[type] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalEvents = Object.values(typeTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6" id="event-throughput-tab">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-bold">
          Failed to load throughput data: {error}
        </div>
      )}
      {loading ? (
        <div className="bg-[#121212] rounded-2xl p-12 border border-zinc-800/80 shadow-xs flex items-center justify-center">
          <span className="text-xs text-zinc-400 font-bold">Loading throughput telemetry...</span>
        </div>
      ) : (
        <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Event Throughput</h2>
              <p className="text-xs text-zinc-400 font-semibold">Events processed per second and distribution analysis</p>
            </div>
          </div>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="15m">Last 15 Minutes</option>
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Current EPS</span>
            <span className="text-2xl font-black text-emerald-400">{currentEps.toLocaleString()}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Peak EPS</span>
            <span className="text-2xl font-black text-purple-400">{peakEps.toLocaleString()}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Baseline</span>
            <span className="text-2xl font-black text-zinc-100">{baselineEps.toLocaleString()}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">vs Baseline</span>
            <span className={`text-2xl font-black ${currentEps >= baselineEps ? 'text-emerald-400' : 'text-red-400'}`}>
              {((currentEps / baselineEps) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Events Per Second (EPS) Trend</h3>
          <div className="h-48 flex items-end gap-0.5">
            {throughputHistory.map((data, idx) => {
              const height = (data.eventsPerSecond / Math.max(...throughputHistory.map(d => d.eventsPerSecond))) * 100;
              const isPeak = data.eventsPerSecond === peakEps;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-t transition-all cursor-pointer hover:opacity-80 ${isPeak ? 'bg-purple-500' : 'bg-indigo-500/80'}`}
                  style={{ height: `${Math.max(2, height)}%`, minHeight: '2px' }}
                  title={`${data.eventsPerSecond} EPS at ${new Date(data.timestamp).toLocaleTimeString()}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500 font-medium">
            <span>{new Date(throughputHistory[0]?.timestamp || Date.now()).toLocaleTimeString()}</span>
            <span>Now</span>
          </div>
          {peakEps > 0 && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-purple-400 font-medium">
              <Target className="w-3 h-3" />
              <span>Peak throughput marker: {peakEps.toLocaleString()} EPS</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-300 mb-3">Events by Type</h3>
            <div className="space-y-3">
              {eventTypes.map(type => {
                const count = typeTotals[type] || 0;
                const percentage = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-24">
                      <span className="text-xs font-bold text-zinc-400 capitalize">{type}</span>
                    </div>
                    <div className="flex-1 bg-[#27272a] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-zinc-100 w-16 text-right">{count.toLocaleString()}</span>
                    <span className="text-[10px] text-zinc-500 w-12 text-right">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-300 mb-3">Comparison with Baseline</h3>
            <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1">
                    <span>Current Throughput</span>
                    <span className="text-emerald-400">{currentEps.toLocaleString()} EPS</span>
                  </div>
                  <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (currentEps / baselineEps) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1">
                    <span>Baseline Target</span>
                    <span className="text-zinc-100">{baselineEps.toLocaleString()} EPS</span>
                  </div>
                  <div className="w-full bg-[#27272a] h-3 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-full rounded-full opacity-50" />
                  </div>
                </div>
                <div className="pt-3 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-300">
                      {currentEps >= baselineEps 
                        ? `Performing ${((currentEps / baselineEps) * 100 - 100).toFixed(1)}% above baseline`
                        : `Performing ${(100 - (currentEps / baselineEps) * 100).toFixed(1)}% below baseline`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
