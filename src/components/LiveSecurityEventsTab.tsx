import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Pause,
  Play,
  Clock
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: string;
  description: string;
  details?: Record<string, any>;
}

interface LiveSecurityEventsTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

const severityConfig = {
  low: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: ShieldCheck },
  medium: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle },
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: ShieldAlert },
  critical: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: ShieldX }
};

export default function LiveSecurityEventsTab({ onAddLog }: LiveSecurityEventsTabProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const eventTypes = ['raid', 'spam', 'malware', 'phishing', 'unauthorized_access', 'rate_limit', 'sql_injection', 'xss', 'ddos'];

  useEffect(() => {
    const generateMockEvents = (): SecurityEvent[] => {
      const types = eventTypes;
      const severities: SecurityEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
      const sources = ['Discord Gateway', 'API Endpoint', 'WebSocket', 'Message Scanner', 'Rate Limiter', 'Auth System'];
      const descriptions: Record<string, string[]> = {
        raid: ['Mass join detected from IP range', 'Raid pattern identified in channel', 'Coordinated attack attempt blocked'],
        spam: ['Spam message filtered', 'Duplicate content detected', 'Bot-like behavior flagged'],
        malware: ['Malicious link blocked', 'Suspicious file attachment quarantined', 'Packer signature detected'],
        phishing: ['Phishing domain intercepted', 'Fake Discord link identified', 'Credential harvesting attempt blocked'],
        unauthorized_access: ['Invalid token attempt', 'Brute force login detected', 'Privilege escalation attempt'],
        rate_limit: ['Rate limit exceeded', 'API abuse detected', 'Request flooding blocked'],
        sql_injection: ['SQL injection attempt blocked', 'Malicious query pattern detected'],
        xss: ['XSS payload sanitized', 'Script injection attempt blocked'],
        ddos: ['DDoS pattern detected', 'Traffic spike from single source', 'Connection flood blocked']
      };

      return Array.from({ length: 20 }, (_, i) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const descs = descriptions[type] || ['Security event detected'];
        return {
          id: `evt-${Date.now()}-${i}`,
          type,
          severity,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
          source: sources[Math.floor(Math.random() * sources.length)],
          description: descs[Math.floor(Math.random() * descs.length)],
          details: {
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            userId: `user_${Math.floor(Math.random() * 10000)}`,
            actionTaken: ['blocked', 'quarantined', 'monitored', 'rate_limited'][Math.floor(Math.random() * 4)],
            confidence: Math.floor(Math.random() * 30 + 70)
          }
        };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    setEvents(generateMockEvents());
  }, []);

  useEffect(() => {
    if (!autoScroll || isPaused || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [events, autoScroll, isPaused]);

  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.type !== filterType) return false;
    if (filterSeverity !== 'all' && event.severity !== filterSeverity) return false;
    if (searchQuery && !event.description.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !event.source.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !event.type.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    const eventTime = new Date(event.timestamp).getTime();
    const now = Date.now();
    const ranges: Record<string, number> = { '15m': 15 * 60 * 1000, '1h': 60 * 60 * 1000, '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000 };
    if (ranges[timeRange] && now - eventTime > ranges[timeRange]) return false;
    
    return true;
  });

  const handleRefresh = () => {
    const newEvents: SecurityEvent[] = Array.from({ length: 5 }, (_, i) => {
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const severities: SecurityEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      return {
        id: `evt-${Date.now()}-${i}`,
        type,
        severity,
        timestamp: new Date().toISOString(),
        source: ['Discord Gateway', 'API Endpoint', 'WebSocket', 'Message Scanner'][Math.floor(Math.random() * 4)],
        description: 'New security event detected',
        details: { ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, actionTaken: 'blocked', confidence: Math.floor(Math.random() * 30 + 70) }
      };
    });
    setEvents(prev => [...newEvents, ...prev]);
    onAddLog?.('Live security feed updated with new events', 'medium');
  };

  const severityCounts = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6" id="live-security-events-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Live Security Events</h2>
              <p className="text-xs text-zinc-400 font-semibold">Real-time threat detection and event monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                autoScroll ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {autoScroll ? 'Auto-Scroll ON' : 'Auto-Scroll OFF'}
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isPaused ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(severityCounts).map(([severity, count]) => {
            const config = severityConfig[severity as keyof typeof severityConfig];
            return (
              <div key={severity} className={`${config.bg} border ${config.border} rounded-xl p-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <config.icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-xs font-bold text-zinc-300 capitalize">{severity}</span>
                </div>
                <span className={`text-lg font-black ${config.color}`}>{count}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="15m">Last 15m</option>
              <option value="1h">Last 1h</option>
              <option value="6h">Last 6h</option>
              <option value="24h">Last 24h</option>
            </select>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="space-y-2 max-h-[600px] overflow-y-auto pr-1"
          onMouseEnter={() => isPaused && setIsPaused(false)}
        >
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">No events match your filters</div>
          ) : (
            filteredEvents.map((event) => {
              const config = severityConfig[event.severity];
              const IconComponent = config.icon;
              const isExpanded = expandedEvent === event.id;
              return (
                <div
                  key={event.id}
                  className={`${config.bg} border ${config.border} rounded-xl p-4 cursor-pointer transition-all hover:shadow-md`}
                  onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <IconComponent className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${config.color} bg-black/20`}>
                            {event.severity}
                          </span>
                          <span className="text-xs font-bold text-zinc-300 capitalize">{event.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{event.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-medium">
                          <span>{event.source}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />}
                  </div>
                  {isExpanded && event.details && (
                    <div className="mt-4 pt-4 border-t border-black/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(event.details).map(([key, value]) => (
                          <div key={key} className="bg-black/20 rounded-lg p-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{key}</span>
                            <span className="text-xs font-black text-zinc-100">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
