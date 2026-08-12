import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  Filter, 
  ZoomIn, 
  ZoomOut,
  Maximize,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';

interface AttackEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cluster?: string;
  description: string;
}

interface AttackTimelineTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function AttackTimelineTab({ onAddLog }: AttackTimelineTabProps) {
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showClusters, setShowClusters] = useState(true);

  const clusters = ['Cluster-01', 'Cluster-02', 'Cluster-03', 'Cluster-04'];
  const attackTypes = ['Raid', 'Spam', 'Phishing', 'Malware', 'DDoS', 'Brute Force', 'SQL Injection', 'XSS'];

  useEffect(() => {
    const generateTimelineEvents = (): AttackEvent[] => {
      const now = Date.now();
      const count = 40;
      return Array.from({ length: count }, (_, i) => {
        const type = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        const severities: AttackEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const timestamp = new Date(now - Math.floor(Math.random() * 86400000));
        return {
          id: `attack-${Date.now()}-${i}`,
          timestamp: timestamp.toISOString(),
          type,
          severity,
          cluster: clusters[Math.floor(Math.random() * clusters.length)],
          description: `${type} attack detected and neutralized`
        };
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    setEvents(generateTimelineEvents());
  }, [timeRange]);

  const severityColors: Record<string, string> = {
    low: 'bg-yellow-500',
    medium: 'bg-orange-500',
    high: 'bg-red-500',
    critical: 'bg-purple-500'
  };

  const severityBorders: Record<string, string> = {
    low: 'border-yellow-500/30',
    medium: 'border-orange-500/30',
    high: 'border-red-500/30',
    critical: 'border-purple-500/30'
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minTime = events.length > 0 ? new Date(events[0].timestamp).getTime() : Date.now() - 86400000;
  const maxTime = events.length > 0 ? new Date(events[events.length - 1].timestamp).getTime() : Date.now();
  const timeSpan = maxTime - minTime || 86400000;

  const getEventPosition = (timestamp: string) => {
    const eventTime = new Date(timestamp).getTime();
    const position = ((eventTime - minTime) / timeSpan) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const filteredEvents = events.filter(event => {
    if (selectedCluster !== 'all' && event.cluster !== selectedCluster) return false;
    return true;
  });

  const clusteredEvents = showClusters ? filteredEvents.reduce((acc: Record<string, AttackEvent[]>, event) => {
    const cluster = event.cluster || 'Unknown';
    if (!acc[cluster]) acc[cluster] = [];
    acc[cluster].push(event);
    return acc;
  }, {} as Record<string, AttackEvent[]>) : { 'All Events': filteredEvents };

  const patternStrength = filteredEvents.length > 20 ? 'High' : filteredEvents.length > 10 ? 'Medium' : 'Low';
  const patternColor = patternStrength === 'High' ? 'text-red-400' : patternStrength === 'Medium' ? 'text-orange-400' : 'text-yellow-400';

  return (
    <div className="space-y-6" id="attack-timeline-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Attack Timeline</h2>
              <p className="text-xs text-zinc-400 font-semibold">Visual timeline of security events and attack patterns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-zinc-700"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-zinc-700"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowClusters(!showClusters)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                showClusters ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              <Maximize className="w-4 h-4 inline mr-1" />
              Clusters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total Events</span>
            <span className="text-2xl font-black text-zinc-100">{filteredEvents.length}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pattern Strength</span>
            <span className={`text-2xl font-black ${patternColor}`}>{patternStrength}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Active Clusters</span>
            <span className="text-2xl font-black text-zinc-100">{Object.keys(clusteredEvents).length}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Critical Events</span>
            <span className="text-2xl font-black text-purple-400">
              {filteredEvents.filter(e => e.severity === 'critical').length}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-bold text-zinc-400 block mb-2">Filter by Cluster</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCluster('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedCluster === 'all' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              All Clusters
            </button>
            {clusters.map(cluster => (
              <button
                key={cluster}
                onClick={() => setSelectedCluster(cluster)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedCluster === cluster ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {cluster}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 mb-2">
            {hours.filter((_, i) => i % (showClusters ? 3 : 2) === 0).map(hour => (
              <span key={hour} style={{ position: 'absolute', left: `${(hour / 24) * 100}%`, transform: 'translateX(-50%)' }}>
                {hour.toString().padStart(2, '0')}:00
              </span>
            ))}
          </div>

          <div className="space-y-4">
            {Object.entries(clusteredEvents).map(([cluster, clusterEvents]) => {
              const events = clusterEvents as AttackEvent[];
              return (
                <div key={cluster} className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-300">{cluster}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">({events.length} events)</span>
                  </div>
                  <div className="relative h-16 bg-[#18181b] rounded-xl border border-zinc-800/60 overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {hours.map(hour => (
                        <div key={hour} className="flex-1 border-r border-zinc-800/30 last:border-r-0" />
                      ))}
                    </div>
                    {events.map((event, idx) => {
                      const position = getEventPosition(event.timestamp);
                      const row = idx % 3;
                      const topOffset = row * 20 + 8;
                      return (
                        <div
                          key={event.id}
                          className={`absolute w-2 h-2 rounded-full ${severityColors[event.severity]} cursor-pointer hover:scale-150 transition-transform`}
                          style={{ left: `${position}%`, top: `${topOffset}px` }}
                          title={`${event.type} - ${new Date(event.timestamp).toLocaleTimeString()}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Event Distribution by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {attackTypes.map(type => {
              const count = filteredEvents.filter(e => e.type === type).length;
              const percentage = filteredEvents.length > 0 ? (count / filteredEvents.length) * 100 : 0;
              return (
                <div key={type} className="bg-[#18181b] rounded-lg p-3 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{type}</span>
                    <span className="text-xs font-black text-zinc-100">{count}</span>
                  </div>
                  <div className="w-full bg-[#27272a] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
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
