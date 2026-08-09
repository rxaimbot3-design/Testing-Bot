import React, { useState } from 'react';
import { 
  Ticket, 
  Users, 
  ShieldAlert, 
  Bell, 
  UserX, 
  UserCheck, 
  Check, 
  X, 
  Lock, 
  Download,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { Ticket as TicketType } from '../types';

interface TicketUserTabProps {
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
  serverStatus?: string;
  onToggleLockdown?: () => void;
}

export default function TicketUserTab({ onAddLog, serverStatus, onToggleLockdown }: TicketUserTabProps) {
  const [activeSub, setActiveSub] = useState<'tickets' | 'users' | 'incident'>('tickets');

  // Tickets state
  const [tickets, setTickets] = useState<TicketType[]>([
    { id: 'TICK-101', user: 'cyber_ninja#1002', department: 'Billing & Subscriptions', priority: 'high', status: 'open', time: '10 mins ago' },
    { id: 'TICK-102', user: 'dev_alex#8891', department: 'Technical Support', priority: 'medium', status: 'claimed', time: '25 mins ago', claimedBy: 'Staff_Aiman' },
    { id: 'TICK-103', user: 'gamer_pro#4412', department: 'General Inquiry', priority: 'low', status: 'closed', time: '2 hours ago' }
  ]);

  // Users state
  const [users, setUsers] = useState([
    { id: 'u1', name: 'spammer_account#9911', status: 'Flagged (Spam Risk)', warns: 2, level: 1 },
    { id: 'u2', name: 'rxaimbot3#0001', status: 'Server Owner / Executive', warns: 0, level: 99 }
  ]);

  const [lockdownActive, setLockdownActive] = useState(false);

  const handleClaimTicket = (id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        onAddLog(`Claimed ticket ${t.id}`, 'low');
        return { ...t, status: 'claimed', claimedBy: 'Current_Admin' };
      }
      return t;
    }));
  };

  const handleCloseTicket = (id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        onAddLog(`Closed ticket ${t.id} and generated transcript`, 'low');
        return { ...t, status: 'closed' };
      }
      return t;
    }));
  };

  const handleToggleLockdownLocal = () => {
    if (onToggleLockdown) onToggleLockdown();
    else {
      const next = !lockdownActive;
      setLockdownActive(next);
      onAddLog(next ? '🚨 EMERGENCY SERVER LOCKDOWN ACTIVATED' : 'Server lockdown lifted', 'high');
    }
  };
  
  React.useEffect(() => {
    if (serverStatus === 'lockdown') {
      setLockdownActive(true);
    } else if (serverStatus === 'online' || serverStatus === 'offline') {
      setLockdownActive(false);
    }
  }, [serverStatus]);

  return (
    <div className="space-y-6" id="ticket-user-tab-container">
      
      {/* Navigation Sub-header */}
      <div className="bg-[#121212] rounded-xl p-3 border border-zinc-800/80 flex flex-wrap gap-2 shadow-xs">
        {[
          { id: 'tickets', icon: Ticket, label: 'Enterprise Ticket System' },
          { id: 'users', icon: Users, label: 'User Management & Role Manager' },
          { id: 'incident', icon: ShieldAlert, label: 'Incident Response & Emergency Lockdown' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSub === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSub(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-zinc-400 hover:bg-[#27272a] hover:text-zinc-950'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: ENTERPRISE TICKET SYSTEM */}
      {activeSub === 'tickets' && (
        <div className="space-y-4">
          <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Enterprise Support Ticket Queue</h3>
                <p className="text-xs text-zinc-500">Manage support inquiries with claim routing and transcript export.</p>
              </div>
            </div>

            <div className="space-y-3">
              {tickets.map(ticket => (
                <div key={ticket.id} className="p-4 bg-[#18181b] rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-100">{ticket.id}</span>
                      <span className="font-semibold text-zinc-400">by {ticket.user}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        ticket.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ticket.priority} priority
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{ticket.department} • {ticket.time}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleClaimTicket(ticket.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-lg transition-colors"
                      >
                        CLAIM TICKET
                      </button>
                    )}
                    {ticket.status === 'claimed' && (
                      <button
                        onClick={() => handleCloseTicket(ticket.id)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] uppercase rounded-lg transition-colors"
                      >
                        CLOSE & TRANSCRIPT
                      </button>
                    )}
                    {ticket.status === 'closed' && (
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-200 px-2.5 py-1 rounded-lg">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USER & ROLE MANAGEMENT */}
      {activeSub === 'users' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Enterprise User Lookup & Role Hierarchy</h3>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="p-3 bg-[#18181b] rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-extrabold text-zinc-100">{u.name}</h4>
                  <p className="text-[10px] text-zinc-400">{u.status} • Warns: {u.warns}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">WARN</button>
                  <button className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded text-[10px]">BAN</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: INCIDENT RESPONSE & EMERGENCY LOCKDOWN */}
      {activeSub === 'incident' && (
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Emergency Incident Response</h3>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            In case of a server raid or malicious attack, trigger an instant server-wide lockdown. This revokes send_message permissions across all public channels automatically.
          </p>

          <button
            onClick={handleToggleLockdownLocal}
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              lockdownActive 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            {lockdownActive ? '🚨 SERVER IS CURRENTLY LOCKED DOWN (CLICK TO UNLOCK)' : 'ENABLE EMERGENCY SERVER LOCKDOWN'}
          </button>
        </div>
      )}

    </div>
  );
}
