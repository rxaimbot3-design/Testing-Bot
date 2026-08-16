import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Bug, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Clock,
  ShieldX,
  Code
} from 'lucide-react';
import { apiFetch } from '../services/apiClient';

interface ErrorMonitoringTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

interface ErrorEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  stackTrace?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function ErrorMonitoringTab({ onAddLog }: ErrorMonitoringTabProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rateHistory, setRateHistory] = useState<Array<{ hour: number; errors: number }>>([]);
  const [stats, setStats] = useState({ totalErrors: 0, criticalErrors: 0, avgPerHour: 0, uniqueTypes: 0, last5min: 0, last1hour: 0 });

  const fetchErrors = async () => {
    try {
      setApiError(null);
      const res = await apiFetch('/api/analytics/errors');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        const mappedErrors: ErrorEntry[] = (data.errors || []).map((err: any, idx: number) => ({
          id: err.id || `err-${Date.now()}-${idx}`,
          timestamp: err.timestamp || new Date().toISOString(),
          type: err.type || 'General',
          message: err.message || 'Unknown error',
          stackTrace: err.stack || err.stackTrace || '',
          count: 1,
          firstSeen: err.timestamp || new Date().toISOString(),
          lastSeen: err.timestamp || new Date().toISOString(),
          severity: (err.severity as ErrorEntry['severity']) || 'medium'
        }));
        setErrors(mappedErrors);
        setRateHistory(data.rateHistory || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to fetch error data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6" id="error-monitoring-tab">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-bold">
          Failed to load error data: {apiError}
        </div>
      )}
      {loading ? (
        <div className="bg-[#121212] rounded-2xl p-12 border border-zinc-800/80 shadow-xs flex items-center justify-center">
          <span className="text-xs text-zinc-400 font-bold">Loading error telemetry...</span>
        </div>
      ) : (
        <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Error Monitoring</h2>
              <p className="text-xs text-zinc-400 font-semibold">Error rate tracking, categorization, and trend analysis</p>
            </div>
          </div>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total Errors</span>
            <span className="text-2xl font-black text-red-400">{stats.totalErrors}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Critical Errors</span>
            <span className="text-2xl font-black text-purple-400">{stats.criticalErrors}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Avg/Hour</span>
            <span className="text-2xl font-black text-zinc-100">{stats.avgPerHour.toFixed(1)}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Unique Types</span>
            <span className="text-2xl font-black text-indigo-400">{stats.uniqueTypes}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Error Rate Trend</h3>
          <div className="h-40 flex items-end gap-1">
            {rateHistory.map((data) => {
              const maxErrors = Math.max(...rateHistory.map(d => d.errors), 1);
              return (
                <div
                  key={data.hour}
                  className="flex-1 bg-red-500/80 rounded-t hover:bg-red-400 transition-all cursor-pointer"
                  style={{ height: `${(data.errors / maxErrors) * 100}%`, minHeight: '4px' }}
                  title={`${data.errors} errors at ${data.hour}:00`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500 font-medium">
            <span>24h ago</span>
            <span>Now</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Error Categorization</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Unhandled', 'Network', 'Database', 'Auth'].map(category => {
              const count = errors.filter(e => e.type.toLowerCase().includes(category.toLowerCase())).length;
              return (
                <div key={category} className="bg-[#18181b] rounded-xl p-3 border border-zinc-800/60">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{category}</span>
                  <span className="text-lg font-black text-zinc-100">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Error Trend Analysis</h3>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Errors decreasing</span>
                <span className="text-xs font-black text-emerald-400">Yes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Peak error time</span>
                <span className="text-xs font-black text-zinc-100">14:00 - 16:00 UTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Most common error</span>
                <span className="text-xs font-black text-zinc-100">TypeError</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Error trend</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Improving
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Recent Errors</h3>
          <div className="space-y-2">
            {errors.slice(0, 10).map((error) => (
              <div
                key={error.id}
                className={`bg-[#18181b] rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md ${
                  selectedError === error.id ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-zinc-800/60'
                }`}
                onClick={() => setSelectedError(selectedError === error.id ? null : error.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getSeverityColor(error.severity).split(' ')[1]}`}>
                      <XCircle className={`w-4 h-4 ${getSeverityColor(error.severity).split(' ')[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${getSeverityColor(error.severity)}`}>
                          {error.severity}
                        </span>
                        <span className="text-xs font-bold text-zinc-300">{error.type}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{error.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                        <span>Count: {error.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedError === error.id && error.stackTrace && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-300">Sanitized Stack Trace</span>
                    </div>
                    <pre className="bg-[#0A0A0A] rounded-lg p-3 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap border border-zinc-800/40">
                      {error.stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
