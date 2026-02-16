'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";
const ITEMS_PER_PAGE = 10;

type LeaderboardUser = {
  rank: number;
  address: string;
  username: string;
  totalPoints: number;
  bets: number;
  sells: number;
  proposals: number;
  suggestions: number;
};

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount(); 
  const [allLeaders, setAllLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
    if (!GRAPHQL_URL) return;
      try {
        // 1. Fetch Usernames
        const { data: profiles, error: profileError } = await supabase.from('users').select('wallet_address, username');
        if (profileError) throw profileError;

        // 2. Fetch Suggestions (Points: +1)
        const { data: suggestions, error: suggestionError } = await supabase.from('suggestions').select('user_address');
        if (suggestionError) throw suggestionError;

        const suggestionCounts: Record<string, number> = {};
        suggestions?.forEach((s: any) => {
            if (s.user_address) {
                const u = s.user_address.toLowerCase();
                suggestionCounts[u] = (suggestionCounts[u] || 0) + 1;
            }
        });

        // 3. Fetch On-Chain Points (Bets, Sells, Props)
        const response = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query { users(limit: 1000, orderBy: "points", orderDirection: "desc") { items { id points betCount sellCount proposeCount } } }`
            }),
        });

        const json = await response.json();
        if (json.errors) throw new Error("GraphQL Error");
        
        const graphUsers = json.data?.users?.items || [];
        const leaderboardMap: Record<string, LeaderboardUser> = {};

        // Process Graph Data
        graphUsers.forEach((u: any) => {
            const addr = u.id.toLowerCase();
            leaderboardMap[addr] = {
                rank: 0,
                address: addr,
                username: `${addr.slice(0,6)}...`,
                totalPoints: u.points,
                bets: u.betCount,
                sells: u.sellCount,
                proposals: u.proposeCount,
                suggestions: 0
            };
        });

        // Process Suggestion Data & Merge
        Object.entries(suggestionCounts).forEach(([addr, count]) => {
            if (!leaderboardMap[addr]) {
                leaderboardMap[addr] = {
                    rank: 0,
                    address: addr,
                    username: `${addr.slice(0,6)}...`,
                    totalPoints: 0,
                    bets: 0, sells: 0, proposals: 0,
                    suggestions: 0
                };
            }
            leaderboardMap[addr].suggestions = count;
            leaderboardMap[addr].totalPoints += count; 
        });

        // Attach Usernames
        profiles?.forEach(p => {
            const addr = p.wallet_address.toLowerCase();
            if (leaderboardMap[addr]) {
                leaderboardMap[addr].username = p.username || leaderboardMap[addr].username;
            }
        });

        // Sort & Rank
        const sortedList = Object.values(leaderboardMap).sort((a, b) => b.totalPoints - a.totalPoints);
        const rankedList = sortedList.map((item, index) => ({ ...item, rank: index + 1 }));

        setAllLeaders(rankedList); 
        setLoading(false);

      } catch (e) {
        console.error(e);
        toast.error("Failed to load leaderboard");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredLeaders = allLeaders.filter(user => 
      user.username.toLowerCase().includes(search.toLowerCase()) || 
      user.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLeaders.length / ITEMS_PER_PAGE);
  const displayedLeaders = filteredLeaders.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [search]);

  const myStats = allLeaders.find(u => u.address.toLowerCase() === address?.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col w-full">
      
      <div className="flex flex-1 items-center justify-center p-4 md:p-12 pb-32">
        <div className="max-w-5xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="text-center mb-8 md:mb-12">
                <div className="text-5xl md:text-6xl mb-4 animate-bounce">🏆</div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Leaderboard</h1>
                <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto mb-6 px-4">
                    Earn Points: <span className="text-emerald-400 font-bold">Bet (+2)</span> • <span className="text-rose-400 font-bold">Sell (+1)</span> • <span className="text-blue-400 font-bold">Propose (+2)</span> • <span className="text-yellow-400 font-bold">Suggest (+1)</span>
                </p>
                <input 
                    type="text" 
                    placeholder="🔍 Search Trader..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-center font-bold shadow-lg"
                />
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-6 bg-slate-950/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5 pl-4">Trader</div>
                    <div className="col-span-2 text-right">Points</div>
                    <div className="col-span-4 text-right">Breakdown</div>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {loading ? (
                        <div className="py-20 text-center text-slate-500 animate-pulse">Calculating points...</div>
                    ) : filteredLeaders.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">No traders found.</div>
                    ) : (
                        displayedLeaders.map((user) => (
                            <div key={user.address} className={`flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 md:p-6 items-center hover:bg-slate-800/30 transition-colors ${user.address === address?.toLowerCase() ? 'bg-blue-900/10 border-l-2 border-blue-500' : ''}`}>
                                
                                {/* Rank & Avatar & Name */}
                                <div className="w-full md:col-span-6 flex items-center justify-between md:justify-start gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-slate-400 w-6 text-center text-lg md:text-base">
                                            {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                                        </div>
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${user.rank <= 3 ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-yellow-500/30 text-yellow-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                            {user.address.slice(2,4)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`font-bold truncate ${user.address === address?.toLowerCase() ? 'text-blue-400' : 'text-white'}`}>
                                                {user.username.startsWith('0x') ? user.username : `@${user.username}`}
                                            </span>
                                            <span className="text-[10px] text-slate-600 font-mono truncate">{user.address.slice(0,6)}...{user.address.slice(-4)}</span>
                                        </div>
                                    </div>

                                    {/* Mobile Only: Points display right next to name */}
                                    <div className="md:hidden text-right">
                                        <span className="font-mono font-bold text-xl text-purple-600">{user.totalPoints}</span>
                                        <span className="text-[10px] text-slate-600 block">PTS</span>
                                    </div>
                                </div>

                                {/* Desktop: Points Column */}
                                <div className="hidden md:block col-span-2 text-right">
                                    <span className="font-mono font-bold text-xl text-purple-600">{user.totalPoints}</span>
                                </div>

                                {/* Stats Breakdown */}
                                <div className="w-full md:col-span-4 flex justify-between md:justify-end gap-2 md:gap-3 text-[10px] text-slate-500 font-mono border-t border-slate-800/50 pt-2 md:pt-0 md:border-0">
                                    <div className="flex flex-col items-center md:items-end"><span className="text-white font-bold">{user.bets}</span><span>Bet</span></div>
                                    <div className="flex flex-col items-center md:items-end"><span className="text-white font-bold">{user.sells}</span><span>Sell</span></div>
                                    <div className="flex flex-col items-center md:items-end"><span className="text-white font-bold">{user.proposals}</span><span>Prop</span></div>
                                    <div className="flex flex-col items-center md:items-end"><span className="text-white font-bold">{user.suggestions}</span><span>Sugg</span></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-6 border-t border-slate-800 bg-slate-950/30">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 bg-slate-800 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all text-xs"
                        >
                            ← Prev
                        </button>
                        <span className="text-xs text-slate-400 font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 bg-slate-800 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all text-xs"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {isConnected && myStats && (
        <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 bg-[#0F172A]/90 backdrop-blur-md border-t border-blue-500/30 p-4 z-40 animate-in slide-in-from-bottom-full duration-500 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">Your Rank</div>
                    <div className="text-2xl font-bold text-white">#{myStats.rank}</div>
                </div>
                
                <div className="flex gap-6 md:gap-12">
                    <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Points</div>
                        <div className="font-mono font-bold text-xl text-purple-600">{myStats.totalPoints}</div>
                    </div>
                    <div className="text-center hidden md:block">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Bets</div>
                        <div className="text-lg font-bold text-white">{myStats.bets}</div>
                    </div>
                    <div className="text-center hidden md:block">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Sells</div>
                        <div className="text-lg font-bold text-white">{myStats.sells}</div>
                    </div>
                    <div className="text-center hidden md:block">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Props</div>
                        <div className="text-lg font-bold text-white">{myStats.proposals}</div>
                    </div>
                    <div className="text-center hidden md:block">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Sugg</div>
                        <div className="text-lg font-bold text-white">{myStats.suggestions}</div>
                    </div>
                </div>
                
                <button onClick={() => {
                    setSearch(myStats.address);
                }} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
                    Show Me
                </button>
            </div>
        </div>
      )}
    </div>
  );
}