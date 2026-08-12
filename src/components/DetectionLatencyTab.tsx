import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Gauge, 
  Timer, 
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';

interface DetectionLatencyTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

interface LatencyData {
  timestamp: string;
  p50: number;
  p95: number;
  p99: number;
  eventType: string;
}

export default function DetectionLatencyTab({ onAddLog }: DetectionLatencyTabProps) {
  const [latencyData, setLatencyData] = useState<LatencyData[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);

  const eventTypes = ['security', 'moderation', 'ai', 'voice', 'utility', 'integration'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const generateData = () => {
      const now = Date.now();
      const points = 60;
      const data: LatencyData[] = [];
      
      for (let i = points; i >= 0; i--) {
        const timestamp = new Date(now - i * 60000);
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const baseLatency = eventType === 'ai' ? 150 : eventType === 'voice' ? 80 : 30;
        
        data.push({
          timestamp: timestamp.toISOString(),
          p50: baseLatency + Math.random() * 20,
          p95: baseLatency * 2 + Math.random() * 50,
          p99: baseLatency * 4 + Math.random() * 100,
          eventType
        });
      }
      return data;
    };

    setLatencyData(generateData());
  }, []);

  const filteredData = selectedEventType === 'all' 
    ? latencyData 
    : latencyData.filter(d => d.eventType === selectedEventType);

  const avgP50 = filteredData.length > 0 ? filteredData.reduce((a, b) => a + b.p50, 0) / filteredData.length : 0;
  const avgP95 = filteredData.length > 0 ? filteredData.reduce((a, b) => a + b.p95, 0) / filteredData.length : 0;
  const avgP99 = filteredData.length > 0 ? filteredData.reduce((a, b) => a + b.p99, 0) / filteredData.length : 0;

  const maxLatency = Math.max(...filteredData.map(d => d.p99), 1);

  const getHeatmapColor = (hour: number, type: string) => {
    const hourData = filteredData.filter(d => new Date(d.timestamp).getHours() === hour && d.eventType === type);
    if (hourData.length === 0) return 'bg-zinc-800';
    const avg = hourData.reduce((a, b) => a + b.p95, 0) / hourData.length;
    if (avg < 50) return 'bg-emerald-500';
    if (avg < 150) return 'bg-amber-500';
    if (avg < 300) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6" id="detection-latency-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Detection Latency</h2>
              <p className="text-xs text-zinc-400 font-semibold">p50/p95/p99 latency analysis and heatmaps</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Event Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                showHeatmap ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-1" />
              Heatmap
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Gauge className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase">p50 Latency</span>
            </div>
            <span className="text-2xl font-black text-emerald-400">{avgP50.toFixed(1)}ms</span>
            <p className="text-[10px] text-zinc-500 mt-1">Median response time</p>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase">p95 Latency</span>
            </div>
            <span className="text-2xl font-black text-amber-400">{avgP95.toFixed(1)}ms</span>
            <p className="text-[10px] text-zinc-500 mt-1">95th percentile</p>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase">p99 Latency</span>
            </div>
            <span className="text-2xl font-black text-red-400">{avgP99.toFixed(1)}ms</span>
            <p className="text-[10px] text-zinc-500 mt-1">99th percentile</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Latency Over Time</h3>
          <div className="h-64 relative">
            <div className="absolute inset-0 flex items-end gap-0.5">
              {filteredData.map((data, idx) => {
                const p50Height = (data.p50 / maxLatency) * 100;
                const p95Height = (data.p95 / maxLatency) * 100;
                const p99Height = (data.p99 / maxLatency) * 100;
                return (
                  <div key={idx} className="flex-1 flex items-end gap-0.5" style={{ minHeight: '4px' }}>
                    <div
                      className="flex-1 bg-emerald-500/60 rounded-t hover:bg-emerald-400 transition-all cursor-pointer"
                      style={{ height: `${Math.max(2, p50Height)}%` }}
                      title={`p50: ${data.p50.toFixed(1)}ms`}
                    />
                    <div
                      className="flex-1 bg-amber-500/60 rounded-t hover:bg-amber-400 transition-all cursor-pointer"
                      style={{ height: `${Math.max(2, p95Height)}%` }}
                      title={`p95: ${data.p95.toFixed(1)}ms`}
                    />
                    <div
                      className="flex-1 bg-red-500/60 rounded-t hover:bg-red-400 transition-all cursor-pointer"
                      style={{ height: `${Math.max(2, p99Height)}%` }}
                      title={`p99: ${data.p99.toFixed(1)}ms`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="font-bold">p50</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="font-bold">p95</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="font-bold">p99</span>
            </div>
          </div>
        </div>

        {showHeatmap && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300 mb-3">Latency Heatmap by Hour</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="flex items-center gap-2 mb-2 ml-8">
                  {eventTypes.map(type => (
                    <div key={type} className="flex-1 text-center">
                      <span className="text-[10px] font-bold text-zinc-400 capitalize">{type}</span>
                    </div>
                  ))}
                </div>
                {hours.map(hour => (
                  <div key={hour} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-zinc-500 w-8 text-right">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                    {eventTypes.map(type => (
                      <div
                        key={type}
                        className={`flex-1 h-6 rounded ${getHeatmapColor(hour, type)} cursor-pointer hover:opacity-80 transition-all`}
                        title={`${type} at ${hour}:00`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] font-bold text-zinc-500">Low</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-3 rounded bg-emerald-500" />
                <div className="w-4 h-3 rounded bg-amber-500" />
                <div className="w-4 h-3 rounded bg-orange-500" />
                <div className="w-4 h-3 rounded bg-red-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500">High</span>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Latency by Event Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {eventTypes.map(type => {
              const typeData = latencyData.filter(d => d.eventType === type);
              const typeAvgP50 = typeData.length > 0 ? typeData.reduce((a, b) => a + b.p50, 0) / typeData.length : 0;
              const typeAvgP95 = typeData.length > 0 ? typeData.reduce((a, b) => a + b.p95, 0) / typeData.length : 0;
              return (
                <div key={type} className="bg-[#18181b] rounded-xl p-3 border border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-300 capitalize block mb-2">{type}</span>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-500">p50</span>
                      <span className="text-emerald-400 font-bold">{typeAvgP50.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-500">p95</span>
                      <span className="text-amber-400 font-bold">{typeAvgP95.toFixed(1)}ms</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
