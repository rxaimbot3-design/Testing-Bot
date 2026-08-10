import React, { useState } from 'react';
import { 
  Ticket as TicketIcon, 
  MessageSquare, 
  ShieldCheck, 
  Trash2, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Ticket } from '../types';

interface TicketTabProps {
  tickets: Ticket[];
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function TicketTab({ tickets: initialTickets, onAddLog }: TicketTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [department, setDepartment] = useState('Support');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [reason, setReason] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Handle open ticket
  const handleOpenTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const newTicket: Ticket = {
      id: `#T-${Date.now().toString().slice(-4)}`,
      user: 'rxaimbot3',
      department,
      priority,
      status: 'open',
      time: 'Just now'
    };

    setTickets([newTicket, ...tickets]);
    setReason('');
    onAddLog(`Ticket ${newTicket.id} opened for ${department} department`, 'low');
  };

  // Claim ticket
  const handleClaimTicket = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'claimed' } : t));
    onAddLog(`Staff member claimed Ticket ${id}`, 'low');
    if (activeTicketId === id) {
      setTranscript(prev => [...prev, `[System] Staff member has joined the channel and claimed your ticket.`]);
    }
  };

  // Close ticket
  const handleCloseTicket = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'closed' } : t));
    onAddLog(`Ticket ${id} was closed by user`, 'low');
    if (activeTicketId === id) {
      setTranscript(prev => [...prev, `[System] This ticket has been marked as closed. Transcript generated successfully.`]);
    }
  };

  // Open conversation
  const handleSelectTicket = (t: Ticket) => {
    setActiveTicketId(t.id);
    setTranscript([
      `[System] Ticket channel created for ${t.user}. Department: ${t.department}`,
      `[System] Current priority level: ${t.priority.toUpperCase()}`,
      `[rxaimbot3] Hello, I need assistance with this server's premium features config. Thanks!`
    ]);
  };

  // Send message in ticket
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setTranscript(prev => [...prev, `[rxaimbot3] ${chatInput.trim()}`]);
    const userMsg = chatInput.trim();
    setChatInput('');

    // Simulate agent response (demo only — no backend agent connected)
    setTimeout(() => {
      setTranscript(prev => [...prev, `[Bot Assistant] Thank you for your inquiry. A staff agent has been alerted and will review: "${userMsg}"`]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="ticket-tab-container">
      {/* Sidebar: Open Ticket Form & Active Tickets */}
      <div className="lg:col-span-1 space-y-6" id="tickets-left-panel">
        {/* Open Ticket Form */}
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Open Support Ticket</h3>
          </div>

          <form onSubmit={handleOpenTicket} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Select Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="General Support">General Support</option>
                <option value="Technical Appeal">Technical Appeal</option>
                <option value="Premium Billing">Premium Billing & Whitelabel</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Emergency</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Issue Description</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly state your concern..."
                className="w-full px-3 py-2 border border-zinc-800 bg-[#18181b] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black tracking-wider uppercase transition-colors"
            >
              🎟️ CREATE TICKET
            </button>
          </form>
        </div>

        {/* Active Ticket List */}
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-3 shadow-xs">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">Active Tickets</h3>
          
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-4">No active tickets.</p>
            ) : (
              tickets.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => handleSelectTicket(t)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    activeTicketId === t.id 
                      ? 'bg-indigo-50/50 border-indigo-400' 
                      : 'bg-[#18181b] hover:bg-[#27272a] border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-extrabold text-zinc-950">{t.id} ({t.department})</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      t.status === 'open' ? 'bg-amber-100 text-amber-800' :
                      t.status === 'claimed' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-zinc-200 text-zinc-500'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold">
                    <span className="capitalize">Priority: {t.priority}</span>
                    <span>{t.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Panel: Interactive Support Chat Transcript & Controls */}
      <div className="lg:col-span-2 bg-[#121212] rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between min-h-[420px] shadow-xs" id="tickets-main-panel">
        {activeTicketId ? (
          <>
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Active Ticket Channel: {activeTicketId}</h3>
                  <p className="text-xs text-zinc-500">Live chat log inside the server ticket category.</p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleClaimTicket(activeTicketId)}
                    className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-100 text-indigo-400 text-[10px] font-black uppercase rounded-lg border border-indigo-200/50 flex items-center gap-1 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> CLAIM
                  </button>
                  <button
                    onClick={() => handleCloseTicket(activeTicketId)}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-100 text-rose-400 text-[10px] font-black uppercase rounded-lg border border-rose-200/50 flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> CLOSE
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 overflow-y-auto max-h-[250px] min-h-[220px] space-y-2.5 font-mono text-[11px] text-zinc-700">
                {transcript.map((line, idx) => {
                  const isSystem = line.startsWith('[System]');
                  const isBot = line.startsWith('[Bot Assistant]');
                  return (
                    <div key={idx} className={`p-1.5 rounded ${
                      isSystem ? 'text-indigo-600 bg-indigo-50/40 border-l-2 border-indigo-500 font-sans' :
                      isBot ? 'text-zinc-200 bg-zinc-200/50 border-l-2 border-zinc-400 font-sans' : 'text-zinc-100 bg-[#121212] border border-zinc-800/30'
                    }`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message to support desk..."
                className="flex-1 px-4 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wide rounded-xl transition-colors"
              >
                SEND
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <TicketIcon className="w-12 h-12 text-zinc-300 mb-3" />
            <h3 className="text-sm font-bold text-zinc-700">No Ticket Selected</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Select an active support ticket from the list or open a new one above to start testing live transcript logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
