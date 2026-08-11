import React, { useState } from 'react';
import { 
  Coins, 
  Sparkles, 
  Trophy, 
  ShoppingBag, 
  ArrowUpRight, 
  ChevronRight, 
  TrendingUp, 
  AlertCircle,
  Gift,
  PlusCircle,
  PiggyBank
} from 'lucide-react';
import { LeaderboardUser } from '../types';

interface EconomyTabProps {
  leaderboard: LeaderboardUser[];
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function EconomyTab({ leaderboard, onAddLog }: EconomyTabProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>(leaderboard);
  const [loading, setLoading] = useState(true);
  const [myCoins, setMyCoins] = useState(450);
  const [bankBalance, setBankBalance] = useState(1200);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchLeaderboard = async () => {
      try {
        const res = await apiFetch('/api/economy/leaderboard');
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.leaderboard) {
            setUsers(data.leaderboard);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch leaderboard:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLeaderboard();
    return () => { mounted = false; };
  }, []);

  // Shop Items
  const shopItems = [
    { id: 'role_vip', name: '👑 VIP Premium Role', price: 200, type: 'Role reward' },
    { id: 'role_helper', name: '🛡️ Assistant Mod Role', price: 500, type: 'Staff permission' },
    { id: 'custom_badge', name: '🔥 Custom Server Badge', price: 150, type: 'Profile asset' }
  ];

  // Daily claim
  const handleDailyClaim = () => {
    if (dailyClaimed) return;
    setMyCoins(prev => prev + 100);
    setDailyClaimed(true);
    setPurchaseError(null);
    onAddLog('User rxaimbot3 claimed daily economy reward (+100 coins)', 'low');
    
    // update my user in leaderboard
    setUsers(prev => prev.map(u => u.username === 'rxaimbot3' ? { ...u, coins: u.coins + 100 } : u));
  };

  // Deposit coins to Bank
  const handleDeposit = (amount: number) => {
    if (myCoins < amount) return;
    setMyCoins(prev => prev - amount);
    setBankBalance(prev => prev + amount);
    setPurchaseError(null);
    onAddLog(`Deposited ${amount} coins into bank account`, 'low');
  };

  // Buy item
  const handleBuyItem = (item: typeof shopItems[0]) => {
    if (myCoins < item.price) {
      setPurchaseError(`You do not have enough coins to purchase ${item.name}! Claim daily coins first.`);
      setPurchaseSuccess(null);
      return;
    }
    setMyCoins(prev => prev - item.price);
    setPurchaseError(null);
    setPurchaseSuccess(`Congratulations! You purchased ${item.name}! Your premium server role is now active.`);
    onAddLog(`User rxaimbot3 purchased ${item.name} from Server Shop`, 'low');
    setTimeout(() => {
      setPurchaseSuccess(null);
    }, 4000);
  };

  return (
    <div className="space-y-6" id="economy-tab-container">
      {/* Economy Overview Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="economy-hub-grid">
        {/* Wallet & Daily Claim Widget */}
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Your Wallet Balance</h3>
              </div>
              <span className="text-xs font-black bg-amber-500/10 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200/50">
                ⭐ Level 12
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-100">{myCoins}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">coins</span>
              </div>
              <p className="text-xs text-zinc-500">
                Earn daily rewards, talk in channels, and win minigames to secure more XP and coins!
              </p>
            </div>
          </div>

          <button
            onClick={handleDailyClaim}
            disabled={dailyClaimed}
            className={`w-full py-2.5 mt-6 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 border ${
              dailyClaimed
                ? 'bg-[#18181b] border-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/10'
            }`}
          >
            <Gift className="w-4 h-4" />
            {dailyClaimed ? 'DAILY COMPLETED' : 'CLAIM DAILY 100 COINS'}
          </button>
        </div>

        {/* Server Bank Simulator */}
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Secure Server Bank</h3>
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200/40">
                0% Fee
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-100">{bankBalance}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">coins</span>
              </div>
              <p className="text-xs text-zinc-500">
                Safeguard your coins inside the server bank to prevent getting robbed by other server members!
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => handleDeposit(50)}
              disabled={myCoins < 50}
              className="flex-1 py-2.5 bg-[#18181b] hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-200 text-zinc-700 hover:text-indigo-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              Deposit 50
            </button>
            <button
              onClick={() => handleDeposit(100)}
              disabled={myCoins < 100}
              className="flex-1 py-2.5 bg-[#18181b] hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-200 text-zinc-700 hover:text-indigo-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              Deposit 100
            </button>
          </div>
        </div>

        {/* Server Economy Role Shop */}
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-purple-500" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Guild Store</h3>
            </div>
            
            {purchaseSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-normal animate-pulse">
                {purchaseSuccess}
              </div>
            )}

            {purchaseError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-200 rounded-xl text-[11px] text-rose-800 leading-normal">
                ⚠️ {purchaseError}
              </div>
            )}

            <div className="space-y-2.5">
              {shopItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-[#18181b] rounded-xl border border-zinc-800/40 text-xs">
                  <div>
                    <span className="font-extrabold text-zinc-100 block">{item.name}</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{item.type}</span>
                  </div>
                  <button
                    onClick={() => handleBuyItem(item)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black tracking-wide uppercase transition-colors"
                  >
                    💰 {item.price}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 mt-4 leading-normal">
            Buy custom badges and VIP roles with server coins to custom design your Discord profile cards.
          </p>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 shadow-xs" id="leaderboards-panel">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">🏆 Server Leveling & Economy Leaderboard</h3>
          </div>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weekly Refreshed</span>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-zinc-400 font-bold">Loading leaderboard data...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">No leaderboard data available yet.</div>
          ) : (
            users
              .sort((a, b) => b.xp - a.xp)
              .map((user, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  user.username === 'rxaimbot3' 
                    ? 'bg-indigo-50/50 border-indigo-200/60' 
                    : 'bg-[#18181b]/50 border-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-zinc-300 text-zinc-200' :
                    idx === 2 ? 'bg-amber-600 text-white' : 'text-zinc-500 bg-[#27272a]'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-black text-zinc-100">{user.username}</span>
                    <span className="text-[10px] text-zinc-400 block font-bold uppercase">Rank {idx + 1} Member</span>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-xs font-bold text-zinc-700">
                  <div className="text-right">
                    <span className="text-zinc-400 block text-[9px] uppercase font-extrabold tracking-wider">XP points</span>
                    <span>{user.xp.toLocaleString()} XP</span>
                  </div>

                  <div className="text-right">
                    <span className="text-zinc-400 block text-[9px] uppercase font-extrabold tracking-wider">Coins</span>
                    <span className="text-amber-600">🪙 {user.coins.toLocaleString()}</span>
                  </div>

                  <div className="bg-[#121212] border border-zinc-800 rounded-lg px-2.5 py-1 text-center font-black">
                    Lvl {user.level}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
