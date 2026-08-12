import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  FileText,
  Clock,
  User,
  Globe,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  ip: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
}

interface AuditLogsTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function AuditLogsTab({ onAddLog }: AuditLogsTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 15;

  const actions = ['LOGIN', 'LOGOUT', 'ADMIN_AUTH', 'BACKUP', 'RESTORE', 'LOCKDOWN', 'CONFIG_CHANGE', 'USER_BAN', 'API_CALL', 'SECURITY_SCAN'];
  const users = ['admin', 'system', 'bot', 'api_service', 'scheduler'];

  useEffect(() => {
    const generateLogs = (): AuditLogEntry[] => {
      const now = Date.now();
      return Array.from({ length: 100 }, (_, i) => {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const statuses: AuditLogEntry['status'][] = ['success', 'success', 'success', 'failure', 'warning'];
        const severities: AuditLogEntry['severity'][] = ['low', 'low', 'medium', 'high', 'critical'];
        return {
          id: `log-${Date.now()}-${i}`,
          timestamp: new Date(now - Math.floor(Math.random() * 86400000)).toISOString(),
          action,
          actor: users[Math.floor(Math.random() * users.length)],
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          severity: severities[Math.floor(Math.random() * severities.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          details: {
            endpoint: `/api/${action.toLowerCase()}`,
            method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
            durationMs: Math.floor(Math.random() * 500 + 10),
            sessionId: `sess_${Math.random().toString(36).substring(2, 15)}`
          }
        };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    setLogs(generateLogs());
  }, [timeRange]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (filterUser !== 'all' && log.actor !== filterUser) return false;
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.action.toLowerCase().includes(query) ||
          log.actor.toLowerCase().includes(query) ||
          log.ip.includes(query) ||
          (log.details?.endpoint && log.details.endpoint.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [logs, searchQuery, filterAction, filterUser, filterStatus]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Actor', 'IP', 'Status', 'Severity'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.timestamp,
      log.action,
      log.actor,
      log.ip,
      log.status,
      log.severity
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onAddLog?.('Exported audit logs to CSV', 'low');
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    onAddLog?.('Exported audit logs to JSON', 'low');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'failure': return <ShieldCheck className="w-3.5 h-3.5 text-red-400" />;
      default: return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6" id="audit-logs-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Audit Logs</h2>
              <p className="text-xs text-zinc-400 font-semibold">Comprehensive audit trail and compliance logging</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={exportJSON}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              JSON
            </button>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
            </select>
            <select
              value={timeRange}
              onChange={(e) => { setTimeRange(e.target.value); setCurrentPage(1); }}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl border border-zinc-800/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">IP</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {paginatedLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-zinc-200">{log.action}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-xs text-zinc-300">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-xs text-zinc-400 font-mono">{log.ip}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(log.status)}
                          <span className={`text-xs font-bold capitalize ${
                            log.status === 'success' ? 'text-emerald-400' : 
                            log.status === 'failure' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-all"
                        >
                          {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && log.details && (
                      <tr className="bg-zinc-800/20">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="bg-[#121212] rounded-lg p-2.5 border border-zinc-800/40">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">{key}</span>
                                <span className="text-xs font-black text-zinc-100 break-all">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-zinc-400">
              Showing {(currentPage - 1) * logsPerPage + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-lg text-xs font-bold transition-all"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-lg text-xs font-bold transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
