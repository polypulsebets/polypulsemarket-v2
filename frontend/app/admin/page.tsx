'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { formatEther } from 'viem';
import { MARKET_MAKER_ABI, ADMIN_WALLETS } from '../constants';
import { parseQuestion } from '../components';
import { UsernameManager } from '../components/UsernameManager';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";

if (!GRAPHQL_URL) {
  console.error("❌ CRITICAL ERROR: NEXT_PUBLIC_GRAPHQL_URL is missing in .env file");
}

const ITEMS_PER_PAGE = 6; 

const ADMIN_ABI_PATCH = [
  {
    inputs: [],
    name: "feesCollected",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "emergencyCancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// --- FEE DISPLAY COMPONENT ---
function FeeDisplay({ marketAddress }: { marketAddress: string }) {
    const { data: fees, isLoading, error } = useReadContract({
        address: marketAddress as `0x${string}`,
        abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH], 
        functionName: 'feesCollected',
        watch: true, 
    });

    if (isLoading) return <span className="text-slate-500 text-xs animate-pulse">Loading...</span>;
    
    if (error || fees === undefined) return <span className="text-slate-500 text-xs">$0.00</span>;

    const val = Number(formatEther(fees as bigint));
    return <span className={`font-mono font-bold ${val > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>${val.toFixed(2)}</span>;
}

function StatusDisplay({ marketAddress, deadline }: { marketAddress: string, deadline: number }) {
    const { data: resolved } = useReadContract({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'resolved' });
    const { data: isDisputed } = useReadContract({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'isDisputed' });
    
    const isExpired = Date.now() > deadline * 1000;
    
    if (resolved) return <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-700 uppercase tracking-wide">RESOLVED</span>;
    if (isDisputed) return <span className="bg-red-900/20 text-red-500 text-[10px] font-bold px-2 py-1 rounded border border-red-900/50 animate-pulse uppercase tracking-wide">DISPUTED</span>;
    if (isExpired) return <span className="bg-amber-900/20 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-900/50 uppercase tracking-wide">ORACLE PHASE</span>;
    return <span className="bg-emerald-900/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-900/50 uppercase tracking-wide">LIVE</span>;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount(); 
  const [markets, setMarkets] = useState<any[]>([]);
  const [search, setSearch] = useState(''); 
  const [myUsername, setMyUsername] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  const { writeContract, isPending } = useWriteContract();

  useEffect(() => {
    const fetchMarkets = async () => {
        if (!GRAPHQL_URL) return;
        try {
            const res = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `{ markets(orderBy: "createdTimestamp", orderDirection: "desc") { items { id question totalVolume deadline isDisputed } } }` })
            });
            const json = await res.json();
            if (json.data?.markets?.items) setMarkets(json.data.markets.items);
        } catch (e) { console.error(e); }
    };
    fetchMarkets();
  }, []);

  const handleResolve = (marketAddr: string, outcome: number, isDisputed: boolean) => {
      const method = isDisputed ? 'resolveDispute' : 'resolve'; 
      const args = isDisputed ? [BigInt(outcome)] : [BigInt(outcome)];
      
      if(!confirm(`⚠️ ${isDisputed ? "JUDGE DISPUTE" : "FORCE RESOLVE"}: Are you sure?`)) return;
      
      writeContract({
          address: marketAddr as `0x${string}`,
          abi: MARKET_MAKER_ABI,
          functionName: method,
          args: args
      }, { onSuccess: () => alert("Transaction Sent!") });
  };

  const handleWithdraw = (marketAddr: string) => {
      
      writeContract({
          address: marketAddr as `0x${string}`,
          abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH],
          functionName: 'withdrawFees',
          args: []
      }, { onSuccess: () => alert("Fees withdrawn!") });
  };

  const handleCancel = (marketAddr: string) => {
      if(!confirm("🚨 EMERGENCY: Refund everyone?")) return;
      writeContract({
          address: marketAddr as `0x${string}`,
          abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH],
          functionName: 'emergencyCancel',
          args: []
      });
  };

  const filteredMarkets = markets.filter(m => {
      const { question } = parseQuestion(m.question);
      const searchTerm = search.toLowerCase();
      return question.toLowerCase().includes(searchTerm) || m.id.toLowerCase().includes(searchTerm);
  });

  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (!address || !ADMIN_WALLETS.includes(address.toLowerCase())) {
      return <div className="min-h-screen bg-[#0F172A] p-20 text-center text-white"><h1>🚫 Access Denied</h1><Link href="/" className="text-blue-500">Go Home</Link></div>;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans p-8">
        <UsernameManager onNameSet={setMyUsername} />

        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-slate-800 pb-6 gap-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">⚡ Admin Dashboard <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded border border-blue-800">SUPERUSER</span></h1>
                    <p className="text-slate-400 text-sm mt-1">Manage markets, resolve disputes, and collect fees.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <Link href="/" className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-700 transition-all">View Site</Link>
                    
                    <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                        <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                        <span className="text-xs font-bold text-slate-300">
                            {isConnected ? (myUsername ? `@${myUsername}` : 'Loading...') : '@User'}
                        </span>
                    </div>

                    <ConnectButton />
                </div>
            </div>

            <div className="mb-8 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                <input 
                    type="text" 
                    placeholder="Search by Question or Market ID..." 
                    value={search} 
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all shadow-lg" 
                />
            </div>

            <div className="space-y-4">
                {paginatedMarkets.length === 0 && <div className="text-slate-500 text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 border-dashed">No matching markets found.</div>}
                
                {paginatedMarkets.map((m: any) => {
                    const { question } = parseQuestion(m.question);
                    return (
                        <div key={m.id} className={`bg-slate-900 border p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg hover:border-slate-700 transition-colors ${m.isDisputed ? 'border-red-900/50 shadow-red-900/10' : 'border-slate-800'}`}>
                            
                            <div className="flex-1 w-full md:w-auto">
                                <div className="flex items-center gap-3 mb-2">
                                    <StatusDisplay marketAddress={m.id} deadline={Number(m.deadline)} />
                                    <span className="text-slate-600 text-[10px] font-mono uppercase bg-slate-950 px-2 py-1 rounded">{m.id.slice(0,6)}...{m.id.slice(-4)}</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2 leading-snug">{question}</h3>
                                <div className="flex gap-4 text-xs text-slate-400 font-mono">
                                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">Vol: ${Number(formatEther(m.totalVolume)).toFixed(2)}</span>
                                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">End: {new Date(Number(m.deadline) * 1000).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center min-w-[120px] shadow-inner">
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Unclaimed Fees</div>
                                <FeeDisplay marketAddress={m.id} />
                            </div>

                            <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
                                <div className="flex gap-2">
                                    <button onClick={() => handleResolve(m.id, 1, m.isDisputed)} disabled={isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20">{m.isDisputed ? "Rule YES" : "YES Won"}</button>
                                    <button onClick={() => handleResolve(m.id, 2, m.isDisputed)} disabled={isPending} className="flex-1 bg-rose-600 hover:bg-rose-500 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-rose-900/20">{m.isDisputed ? "Rule NO" : "NO Won"}</button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleWithdraw(m.id)} disabled={isPending} className="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 py-2 rounded-lg text-xs font-bold transition-all">💰 Collect</button>
                                    <button onClick={() => handleCancel(m.id)} disabled={isPending} className="flex-1 bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/30 py-2 rounded-lg text-[10px] font-bold transition-all">⚠️ CANCEL</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-slate-800 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all text-sm"
                    >
                        ← Prev
                    </button>
                    <span className="text-xs text-slate-400 font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-slate-800 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all text-sm"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}