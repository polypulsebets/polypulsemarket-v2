'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { formatEther } from 'viem';
import { MARKET_MAKER_ABI, ADMIN_WALLETS, MOCK_ORACLE_ABI, MOCK_ORACLE_ADDRESS } from '../constants';
import { parseQuestion } from '../components';
import { UsernameManager } from '../components/UsernameManager';
import { toast } from 'react-hot-toast'; 

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";

if (!GRAPHQL_URL) {
  console.error("❌ CRITICAL ERROR: NEXT_PUBLIC_GRAPHQL_URL is missing in .env file");
}

const ITEMS_PER_PAGE = 6; 

// Patch for Admin functions
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
  },
  {
    inputs: [],
    name: "assertionId",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// --- SUB-COMPONENT: DISPUTE PANEL ---
const DisputePanel = ({ marketAddress }: { marketAddress: string }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default open for active disputes

    const { data: assertionId } = useReadContract({
        address: marketAddress as `0x${string}`,
        abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH],
        functionName: 'assertionId'
    });

    const { data: assertion } = useReadContract({
        address: MOCK_ORACLE_ADDRESS as `0x${string}`,
        abi: MOCK_ORACLE_ABI,
        functionName: 'getAssertion',
        args: [assertionId as `0x${string}`],
        query: { enabled: !!assertionId && assertionId !== "0x0000000000000000000000000000000000000000000000000000000000000000" }
    });
    
    const { writeContractAsync, isPending } = useWriteContract();

    // Auto-collapse if resolved (run once when data loads)
    useEffect(() => {
        if (assertion?.resolved) {
            setIsExpanded(false);
        }
    }, [assertion?.resolved]);

    if (!assertionId || assertionId === "0x0000000000000000000000000000000000000000000000000000000000000000") return null;
    if (!assertion) return <div className="text-xs text-slate-500 animate-pulse mt-4">Loading Evidence from Oracle...</div>;

    const handleRuling = async (ruling: boolean) => {
        if(!confirm(`⚠️ JUDGE RULING:\n\n${ruling ? "✅ UPHOLD ASSERTION (Asserter Wins)" : "❌ REJECT ASSERTION (Disputer Wins)"}\n\nAre you sure? This is final.`)) return;
        
        try {
            await toast.promise(
                writeContractAsync({
                    address: MOCK_ORACLE_ADDRESS as `0x${string}`,
                    abi: MOCK_ORACLE_ABI,
                    functionName: 'resolveDispute',
                    args: [assertionId, ruling]
                }),
                {
                    loading: 'Submitting Ruling... ⚖️',
                    success: 'Ruling Executed! 👨‍⚖️',
                    error: 'Ruling failed ❌',
                }
            );
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    ⚖️ Evidence Locker
                    {assertion.resolved && <span className="text-[9px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700">CLOSED</span>}
                </h4>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 font-mono">ID: {assertionId.toString().slice(0,6)}...</span>
                </div>
            </div>
            
            {/* EVIDENCE GRID (COLLAPSIBLE) */}
            {isExpanded && (
                <div className="grid grid-cols-2 gap-6 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* ASSERTER */}
                    <div className="bg-emerald-900/5 p-3 rounded-lg border border-emerald-900/20">
                        <div className="text-[10px] text-emerald-500 font-bold uppercase mb-2 flex justify-between">
                            <span>Asserted Outcome</span>
                            <span className="bg-emerald-900/30 px-1.5 rounded">{assertion.outcome ? "YES" : "NO"}</span>
                        </div>
                        <div className="space-y-1">
                            {assertion.assertionLinks.length > 0 ? assertion.assertionLinks.map((l: string, i: number) => (
                                <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="block text-blue-400 text-xs hover:underline truncate">🔗 {l}</a>
                            )) : <span className="text-xs text-slate-600 italic">No links provided.</span>}
                        </div>
                    </div>

                    {/* DISPUTER */}
                    <div className="bg-rose-900/5 p-3 rounded-lg border border-rose-900/20">
                        <div className="text-[10px] text-rose-500 font-bold uppercase mb-2">Dispute Evidence</div>
                        <div className="space-y-1">
                            {assertion.disputeLinks.length > 0 ? assertion.disputeLinks.map((l: string, i: number) => (
                                <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="block text-blue-400 text-xs hover:underline truncate">🔗 {l}</a>
                            )) : <span className="text-xs text-slate-600 italic">No links provided.</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER: BUTTONS OR TOGGLE */}
            {!assertion.resolved ? (
                <div className="flex gap-3">
                    <button onClick={() => handleRuling(true)} disabled={isPending} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 group">
                        <span className="group-hover:scale-110 transition-transform">✅ Uphold Assertion</span>
                        <span className="text-[9px] opacity-60 font-normal">Asserter wins bond</span>
                    </button>
                    <button onClick={() => handleRuling(false)} disabled={isPending} className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/50 py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 group">
                        <span className="group-hover:scale-110 transition-transform">❌ Reject (Liar)</span>
                        <span className="text-[9px] opacity-60 font-normal">Disputer wins bond</span>
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="w-full py-2 text-xs font-bold text-slate-500 bg-slate-900/30 hover:bg-slate-900/50 hover:text-slate-400 rounded border border-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    {isExpanded ? "Hide Evidence ▲" : "Show Evidence History ▼"}
                </button>
            )}
        </div>
    );
};

// --- FEE DISPLAY ---
function FeeDisplay({ marketAddress }: { marketAddress: string }) {
    const { data: fees, isLoading, error } = useReadContract({
        address: marketAddress as `0x${string}`,
        abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH], 
        functionName: 'feesCollected',
        query: { refetchInterval: 5000 }
    });

    if (isLoading) return <span className="text-slate-500 text-xs animate-pulse">Loading...</span>;
    if (error || fees === undefined) return <span className="text-slate-500 text-xs">$0.00</span>;

    const val = Number(formatEther(fees as bigint));
    return <span className={`font-mono font-bold ${val > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>${val.toFixed(2)}</span>;
}

// --- STATUS BADGE ---
function StatusDisplay({ marketAddress, deadline }: { marketAddress: string, deadline: number }) {
    const { data: resolved } = useReadContract({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'resolved' });
    const { data: isDisputed } = useReadContract({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'isDisputed' });
    const { data: assertionId } = useReadContract({ address: marketAddress as `0x${string}`, abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH], functionName: 'assertionId' });
    
    const isExpired = Date.now() > deadline * 1000;
    const hasAssertion = assertionId && assertionId !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    if (resolved) return <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-700 uppercase tracking-wide">RESOLVED</span>;
    if (isDisputed) return <span className="bg-red-900/20 text-red-500 text-[10px] font-bold px-2 py-1 rounded border border-red-900/50 animate-pulse uppercase tracking-wide">DISPUTED</span>;
    if (hasAssertion) return <span className="bg-blue-900/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-900/50 uppercase tracking-wide">ASSERTED</span>;
    if (isExpired) return <span className="bg-amber-900/20 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-900/50 uppercase tracking-wide">AWAITING ASSERTION</span>;
    return <span className="bg-emerald-900/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-900/50 uppercase tracking-wide">LIVE</span>;
}

// --- MAIN ADMIN CARD ---
const AdminMarketCard = ({ market }: { market: any }) => {
    
    const { writeContractAsync, isPending } = useWriteContract();
    
    const { data: fees } = useReadContract({
        address: market.id as `0x${string}`,
        abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH],
        functionName: 'feesCollected',
    });

    const { data: isDisputed } = useReadContract({
        address: market.id as `0x${string}`,
        abi: MARKET_MAKER_ABI,
        functionName: 'isDisputed',
    });

    const { data: resolved } = useReadContract({
        address: market.id as `0x${string}`,
        abi: MARKET_MAKER_ABI,
        functionName: 'resolved',
    });

    const { question } = parseQuestion(market.question);
    const feeValue = fees ? Number(formatEther(fees as bigint)) : 0;

    const handleWithdraw = async () => {
        try {
            await toast.promise(
                writeContractAsync({
                    address: market.id as `0x${string}`,
                    abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH],
                    functionName: 'withdrawFees',
                    args: []
                }),
                {
                    loading: 'Withdrawing Fees... 💰',
                    success: 'Fees withdrawn! 💸',
                    error: 'Withdrawal failed ❌',
                }
            );
        } catch (e) {
            console.error(e);
        }
    };

    const handleCancel = async () => {
        if(!confirm("🚨 EMERGENCY: Cancel Market?")) return;
        try {
            await toast.promise(
                writeContractAsync({
                    address: market.id as `0x${string}`,
                    abi: [...MARKET_MAKER_ABI, ...ADMIN_ABI_PATCH],
                    functionName: 'emergencyCancel',
                    args: []
                }),
                {
                    loading: 'Cancelling Market... ⚠️',
                    success: 'Market Cancelled 🛑',
                    error: 'Cancellation failed ❌',
                }
            );
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`bg-slate-900 border p-6 rounded-2xl shadow-lg transition-colors ${isDisputed ? 'border-red-500/50 shadow-red-900/10' : 'border-slate-800'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-1 w-full md:w-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <StatusDisplay marketAddress={market.id} deadline={Number(market.deadline)} />
                        <span className="text-slate-600 text-[10px] font-mono uppercase bg-slate-950 px-2 py-1 rounded cursor-pointer" onClick={() => navigator.clipboard.writeText(market.id)}>{market.id.slice(0,6)}...{market.id.slice(-4)} 📋</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2 leading-snug hover:text-blue-400">
                        <Link href={`/market/${market.id}`}>{question}</Link>
                    </h3>
                    <div className="flex gap-4 text-xs text-slate-400 font-mono">
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">Vol: ${Number(formatEther(market.totalVolume)).toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-950 px-6 py-3 rounded-xl border border-slate-800 text-center shadow-inner">
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Fees</div>
                        <span className={`font-mono font-bold ${feeValue > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>${feeValue.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                        <button onClick={handleWithdraw} disabled={isPending} className="w-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 py-2 rounded-lg text-xs font-bold transition-all">💰 Collect</button>
                        <button onClick={handleCancel} disabled={isPending} className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/30 py-2 rounded-lg text-[10px] font-bold transition-all">⚠️ Cancel</button>
                    </div>
                </div>
            </div>

            {/* FORCE SHOW IF ON-CHAIN SAYS DISPUTED */}
            {isDisputed && <DisputePanel marketAddress={market.id} />}
        </div>
    );
};

export default function AdminPage() {
  const { address, isConnected } = useAccount(); 
  const [markets, setMarkets] = useState<any[]>([]);
  const [search, setSearch] = useState(''); 
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchMarkets = async () => {
        if (!GRAPHQL_URL) return;
        try {
            const res = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `{ markets(orderBy: "createdTimestamp", orderDirection: "desc") { items { id question totalVolume deadline } } }` })
            });
            const json = await res.json();
            if (json.data?.markets?.items) setMarkets(json.data.markets.items);
        } catch (e) { console.error(e); }
    };
    fetchMarkets();
    const i = setInterval(fetchMarkets, 10000);
    return () => clearInterval(i);
  }, []);

  const filteredMarkets = markets.filter(m => {
      const { question } = parseQuestion(m.question);
      const searchTerm = search.toLowerCase();
      return question.toLowerCase().includes(searchTerm) || m.id.toLowerCase().includes(searchTerm);
  });

  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (!address || !ADMIN_WALLETS.includes(address.toLowerCase())) {
      return <div className="min-h-screen bg-[#0F172A] p-20 text-center text-white"><h1>🚫 Access Denied</h1><Link href="/" className="text-blue-500">Go Home</Link></div>;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans p-8">
        <UsernameManager onNameSet={setMyUsername} />
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-slate-800 pb-6 gap-6">
                <div><h1 className="text-3xl font-bold">⚡ Admin Dashboard</h1><p className="text-slate-400 text-sm">Superuser Controls</p></div>
                <div className="flex gap-4"><Link href="/" className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold">View Site</Link><ConnectButton /></div>
            </div>

            <input type="text" placeholder="Search Markets..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-4 text-white mb-8 focus:border-blue-500 outline-none" />

            <div className="space-y-4">
                {paginatedMarkets.length === 0 && <div className="text-slate-500 text-center py-20">No markets found.</div>}
                {paginatedMarkets.map((m: any) => <AdminMarketCard key={m.id} market={m} />)}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-4 mt-8">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-800 rounded text-white disabled:opacity-50">← Prev</button>
                    <span className="text-xs text-slate-400 py-2">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-800 rounded text-white disabled:opacity-50">Next →</button>
                </div>
            )}
        </div>
    </div>
  );
}