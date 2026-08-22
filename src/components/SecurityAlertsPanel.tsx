import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react';

interface SecurityAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  acknowledged: boolean;
}

interface SecurityAlertsPanelProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function SecurityAlertsPanel({ onAddLog }: SecurityAlertsPanelProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/health/detailed');
      if (!res.ok) throw new Error('Failed to fetch security alerts');
      const data = await res.json();

      const generatedAlerts: SecurityAlert[] = [];

      if (data.engine?.status !== 'ACTIVE_MICROSECOND' && data.engine?.status !== 'STANDBY') {
        generatedAlerts.push({
          id: 'alert-engine',
          timestamp: new Date().toISOString(),
          severity: 'critical',
          title: 'C++ Engine Offline',
          description: `Security engine status: ${data.engine?.status || 'unknown'}`,
          source: 'cpp-engine',
          acknowledged: false
        });
      }

      if (data.bot?.connected === false) {
        generatedAlerts.push({
          id: 'alert-bot',
          timestamp: new Date().toISOString(),
          severity: 'high',
          title: 'Discord Bot Disconnected',
          description: 'Bot is not connected to Discord gateway',
          source: 'discord-bot',
          acknowledged: false
        });
      }

      if ((data.errorRate?.last5min || 0) > 10) {
        generatedAlerts.push({
          id: 'alert-errors',
          timestamp: new Date().toISOString(),
          severity: 'high',
          title: 'Elevated Error Rate',
          description: `${data.errorRate.last5min} errors in last 5 minutes`,
          source: 'error-monitor',
          acknowledged: false
        });
      }

      if ((data.workers?.crashed || 0) > 0) {
        generatedAlerts.push({
          id: 'alert-workers',
          timestamp: new Date().toISOString(),
          severity: 'medium',
          title: 'Worker Crashes Detected',
          description: `${data.workers.crashed} worker crashes, ${data.workers.restarts} restarts`,
          source: 'worker-manager',
          acknowledged: false
        });
      }

      if (data.bot?.latency > 500) {
        generatedAlerts.push({
          id: 'alert-latency',
          timestamp: new Date().toISOString(),
          severity: 'medium',
          title: 'High Gateway Latency',
          description: `Discord gateway latency: ${data.bot.latency}ms`,
          source: 'discord-gateway',
          acknowledged: false
        });
      }

      if (generatedAlerts.length === 0 && !loading) {
        generatedAlerts.push({
          id: 'alert-ok',
          timestamp: new Date().toISOString(),
          severity: 'low',
          title: 'All Systems Operational',
          description: 'No active security alerts detected',
          source: 'health-check',
          acknowledged: true
        });
      }

      setAlerts(generatedAlerts);
    } catch (err: any) {
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Security Alerts</h2>
            <p className="text-xs text-zinc-400 font-semibold">Loading alerts...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Security Alerts</h2>
            <p className="text-xs text-red-400 font-semibold">Error loading alerts</p>
          </div>
        </div>
        <div className="bg-[#18181b] rounded-xl p-4 border border-red-500/30 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-300">{error}</p>
          <button onClick={fetchAlerts} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Security Alerts</h2>
            <p className="text-xs text-zinc-400 font-semibold">
              {criticalCount > 0 ? `${criticalCount} critical alert${criticalCount > 1 ? 's' : ''}` : 'No critical alerts'}
            </p>
          </div>
        </div>
        <button onClick={fetchAlerts} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-zinc-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <ShieldAlert className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No active security alerts</p>
            <p className="text-xs text-zinc-600 mt-1">All systems are running normally</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-[#18181b] rounded-xl p-4 border transition-all ${
                alert.acknowledged ? 'border-zinc-800/60 opacity-70' : 'border-zinc-800/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getSeverityColor(alert.severity).split(' ')[1]}`}>
                  <span className={getSeverityColor(alert.severity).split(' ')[0]}>
                    {getSeverityIcon(alert.severity)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-bold text-zinc-300">{alert.title}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-2">{alert.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
                    <span>Source: {alert.source}</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
