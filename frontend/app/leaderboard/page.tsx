'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ADMIN_WALLETS } from '../constants';
import { UsernameManager } from '../components/UsernameManager';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";

if (!GRAPHQL_URL) {
  console.error("❌ CRITICAL ERROR: NEXT_PUBLIC_GRAPHQL_URL is missing in .env file");
}

type LeaderboardUser = {
  rank: number;
  address: string;
  username: string;
  volume: number;
  marketsPlayed: number;
  bestWin: string; 
};

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount(); 
  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
    if (!GRAPHQL_URL) return;
      try {
        const { data: profiles } = await supabase
            .from('users')
            .select('wallet_address, username');

        const response = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query { userPositions(limit: 1000) { items { user invested } } }`
            }),
        });

        if (!response.ok) throw new Error("Graph API Error"); 

        const json = await response.json();
        const positions = json.data?.userPositions?.items || [];

        const stats: Record<string, { volume: number, count: number }> = {};
        
        positions.forEach((p: any) => {
            const user = p.user.toLowerCase();
            const amount = Number(formatEther(BigInt(p.invested)));
            
            if (!stats[user]) stats[user] = { volume: 0, count: 0 };
            stats[user].volume += amount;
            stats[user].count += 1;
        });

        const leaderboard: LeaderboardUser[] = [];
        
        Object.entries(stats).forEach(([userAddr, stat]) => {
            const profile = profiles?.find(p => p.wallet_address.toLowerCase() === userAddr);
            
            leaderboard.push({
                rank: 0, 
                address: userAddr,
                username: profile?.username || `${userAddr.slice(0,6)}...`,
                volume: stat.volume,
                marketsPlayed: stat.count,
                bestWin: '---'
            });
        });

        leaderboard.sort((a, b) => b.volume - a.volume);
        const ranked = leaderboard.map((item, index) => ({ ...item, rank: index + 1 }));

        setLeaders(ranked.slice(0, 10)); 
        setLoading(false);

      } catch (e) {
        console.error("Error fetching leaderboard", e);
        toast.error("Could not load leaderboard data 📉");
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col">
      <UsernameManager onNameSet={setMyUsername} />

      {/* NAVBAR */}
      <nav className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center py-2"><img src="/logo.png" className="h-10.5 w-auto object-contain" alt="PolyPulseBets Logo" /></Link>
          <div className="flex gap-4 items-center">
            <Link href="/portfolio" className="hidden md:block text-sm font-bold text-slate-400 hover:text-white transition-colors">Portfolio</Link>
            <Link href="/support" className="hidden md:block text-sm font-bold text-slate-400 hover:text-white transition-colors">Support</Link>
            <Link href="/leaderboard" className="text-sm font-bold text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">🏆 Leaderboard</Link>
            {isAdmin ? (
                <Link href="/create" className="hidden md:block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 transition-all">+ Create</Link>
            ) : (
                <Link href="/suggest" className="hidden md:block bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all">Suggest?</Link>
            )}

            <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                <span className="text-xs font-bold text-slate-300">
                    {isConnected ? (myUsername ? `@${myUsername}` : 'Loading...') : '@User'}
                </span>
            </div>

            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="text-center mb-12">
                <div className="text-6xl mb-4 animate-bounce">🏆</div>
                <h1 className="text-4xl font-extrabold text-white mb-4">Top Traders</h1>
                <p className="text-slate-400 max-w-lg mx-auto">Rankings are based on total volume traded. Prove your conviction and climb the ranks.</p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

                <div className="grid grid-cols-12 gap-4 p-6 bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-6 pl-4">Trader</div>
                    <div className="col-span-3 text-right">Volume</div>
                    <div className="col-span-2 text-right">Bets</div>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {loading ? (
                        <div className="py-20 text-center text-slate-500 animate-pulse">Calculating rankings...</div>
                    ) : leaders.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">No trades yet. Be the first!</div>
                    ) : (
                        leaders.map((user) => (
                            <div key={user.address} className={`grid grid-cols-12 gap-4 p-6 items-center hover:bg-slate-800/30 transition-colors ${user.address === address?.toLowerCase() ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''}`}>
                                <div className="col-span-1 text-center font-bold text-slate-400">
                                    {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                                </div>
                                <div className="col-span-6 pl-4 flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${user.rank <= 3 ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-yellow-500/30 text-yellow-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                            {user.address.slice(2,4)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${user.address === address?.toLowerCase() ? 'text-blue-400' : 'text-white'}`}>
                                            {user.username.startsWith('0x') ? user.username : `@${user.username}`}
                                        </span>
                                        {user.username !== user.address && (
                                            <span className="text-[10px] text-slate-600 font-mono">{user.address.slice(0,6)}...{user.address.slice(-4)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-3 text-right">
                                    <span className="font-mono font-bold text-emerald-400">${user.volume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-slate-400 font-bold">{user.marketsPlayed}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}