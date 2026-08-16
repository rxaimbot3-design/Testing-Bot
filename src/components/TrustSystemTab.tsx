import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  ShieldX, 
  ShieldAlert,
  Star,
  Clock,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { apiFetch } from '../services/apiClient';

interface TrustedUser {
  id: string;
  username: string;
  userId: string;
  trustScore: number;
  role: string;
  joinedAt: string;
  lastActive: string;
  history: Array<{ timestamp: string; action: string; scoreChange: number }>;
}

interface TrustSystemTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function TrustSystemTab({ onAddLog }: TrustSystemTabProps) {
  const [users, setUsers] = useState<TrustedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({ username: '', userId: '', role: 'member' });
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrustData = async () => {
      try {
        const res = await apiFetch('/api/analytics/trust-system');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            const mapped: TrustedUser[] = data.users.map((u: any, idx: number) => ({
              id: u.id || `trust-${Date.now()}-${idx}`,
              username: u.username,
              userId: u.userId,
              trustScore: u.trustScore,
              role: u.role,
              joinedAt: u.joinedAt,
              lastActive: u.lastActive,
              history: Array.from({ length: 5 }, (_, j) => ({
                timestamp: new Date(Date.now() - j * 604800000).toISOString(),
                action: ['Positive interaction', 'Helpful contribution', 'Rule adherence', 'Community engagement'][j % 4],
                scoreChange: Math.floor(Math.random() * 5 + 1)
              }))
            }));
            setUsers(mapped);
            setIsDemo(data.demo || false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch trust system data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustData();
  }, []);

  const filteredUsers = users.filter(user => {
    if (searchQuery && !user.username.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !user.userId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterScore === 'high' && user.trustScore < 80) return false;
    if (filterScore === 'medium' && (user.trustScore < 50 || user.trustScore >= 80)) return false;
    if (filterScore === 'low' && user.trustScore >= 50) return false;
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Highly Trusted';
    if (score >= 60) return 'Trusted';
    if (score >= 40) return 'Moderate';
    return 'Low Trust';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    if (score >= 60) return <ShieldAlert className="w-5 h-5 text-amber-400" />;
    if (score >= 40) return <ShieldAlert className="w-5 h-5 text-orange-400" />;
    return <ShieldX className="w-5 h-5 text-red-400" />;
  };

  const handleAddUser = () => {
    if (!newUserForm.username || !newUserForm.userId) return;
    const newUser: TrustedUser = {
      id: `trust-${Date.now()}`,
      username: newUserForm.username,
      userId: newUserForm.userId,
      trustScore: 50,
      role: newUserForm.role,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      history: [{ timestamp: new Date().toISOString(), action: 'Added to trust system', scoreChange: 0 }]
    };
    setUsers(prev => [...prev, newUser]);
    setNewUserForm({ username: '', userId: '', role: 'member' });
    onAddLog?.(`Added ${newUserForm.username} to trust system`, 'low');
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.userId !== userId));
    onAddLog?.(`Removed user from trust system`, 'medium');
  };

  return (
    <div className="space-y-6" id="trust-system-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Trust System</h2>
              <p className="text-xs text-zinc-400 font-semibold">Trusted users, whitelist management, and trust scoring</p>
              {isDemo && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                  Demo Data
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#18181b] border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(e.target.value)}
              className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Scores</option>
              <option value="high">High (80+)</option>
              <option value="medium">Medium (50-79)</option>
              <option value="low">Low (&lt;50)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Trusted Users</span>
            <span className="text-2xl font-black text-emerald-400">{users.length}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Avg Trust Score</span>
            <span className="text-2xl font-black text-indigo-400">
              {users.length > 0 ? Math.round(users.reduce((a, b) => a + b.trustScore, 0) / users.length) : 0}
            </span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">High Trust</span>
            <span className="text-2xl font-black text-emerald-400">{users.filter(u => u.trustScore >= 80).length}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Low Trust</span>
            <span className="text-2xl font-black text-red-400">{users.filter(u => u.trustScore < 50).length}</span>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Add to Whitelist</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Username"
              value={newUserForm.username}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 flex-1"
            />
            <input
              type="text"
              placeholder="User ID"
              value={newUserForm.userId}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, userId: e.target.value }))}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 flex-1"
            />
            <select
              value={newUserForm.role}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
              className="bg-[#121212] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="member">Member</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleAddUser}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-zinc-300 mb-3">Trusted Users List</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`bg-[#18181b] rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md ${
                    selectedUser === user.id ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-zinc-800/60'
                  }`}
                  onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getScoreColor(user.trustScore).replace('text-', 'bg-').replace('400', '500/10')}`}>
                        {getScoreIcon(user.trustScore)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-100">{user.username}</span>
                          <span className={`text-xs font-bold ${getScoreColor(user.trustScore)}`}>
                            {user.trustScore}/100
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">{user.role}</span>
                          <span className="text-[10px] text-zinc-600">|</span>
                          <span className="text-[10px] text-zinc-500">
                            Last active: {new Date(user.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveUser(user.userId); }}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedUser === user.id && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">User ID</span>
                          <span className="text-xs font-mono text-zinc-300">{user.userId}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Role</span>
                          <span className="text-xs font-bold text-zinc-300">{user.role}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Joined</span>
                          <span className="text-xs text-zinc-300">{new Date(user.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Trust Score</span>
                          <span className={`text-sm font-black ${getScoreColor(user.trustScore)}`}>{user.trustScore}/100</span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-300 mb-2">Trust History</h4>
                      <div className="space-y-2">
                        {user.history.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#121212] rounded-lg border border-zinc-800/40">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              <span className="text-xs text-zinc-300">{entry.action}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {entry.scoreChange > 0 ? (
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-400" />
                              )}
                              <span className={`text-xs font-bold ${entry.scoreChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {entry.scoreChange > 0 ? '+' : ''}{entry.scoreChange}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-300 mb-3">Whitelist Management</h3>
            <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Auto-whitelist admins</span>
                <span className="text-xs font-black text-emerald-400">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Auto-whitelist mods</span>
                <span className="text-xs font-black text-emerald-400">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Minimum trust score</span>
                <span className="text-xs font-black text-zinc-100">50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Auto-decay period</span>
                <span className="text-xs font-black text-zinc-100">30 days</span>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-zinc-300 mb-3">Score Distribution</h3>
              <div className="space-y-2">
                {[
                  { label: '80-100', count: users.filter(u => u.trustScore >= 80).length, color: 'bg-emerald-500' },
                  { label: '60-79', count: users.filter(u => u.trustScore >= 60 && u.trustScore < 80).length, color: 'bg-amber-500' },
                  { label: '40-59', count: users.filter(u => u.trustScore >= 40 && u.trustScore < 60).length, color: 'bg-orange-500' },
                  { label: '0-39', count: users.filter(u => u.trustScore < 40).length, color: 'bg-red-500' }
                ].map(bucket => (
                  <div key={bucket.label} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 w-12">{bucket.label}</span>
                    <div className="flex-1 bg-[#27272a] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bucket.color}`}
                        style={{ width: `${users.length > 0 ? (bucket.count / users.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-zinc-100 w-6 text-right">{bucket.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
