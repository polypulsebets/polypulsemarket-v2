'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { MOCK_USDT_ADDRESS, ERC20_ABI, MARKET_MAKER_ABI, ADMIN_WALLETS } from '../constants';
import { Market, UserPositionData, parseQuestion, PortfolioRow } from '../components';
import { UsernameManager } from '../components/UsernameManager';
import { toast } from 'react-hot-toast'; 

const ITEMS_PER_PAGE = 10;
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";

if (!GRAPHQL_URL) {
  console.error("❌ CRITICAL ERROR: NEXT_PUBLIC_GRAPHQL_URL is missing in .env file");
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());
  const router = useRouter(); 

  // --- USERNAME STATE ---
  const [myUsername, setMyUsername] = useState<string | null>(null);

  // --- DATA STATE ---
  const [markets, setMarkets] = useState<Market[]>([]);
  const [userPositions, setUserPositions] = useState<UserPositionData[]>([]);
  
  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const { writeContractAsync: writeMint } = useWriteContract();
  const { writeContractAsync: writeClaim } = useWriteContract();

  const { data: userBalance } = useReadContract({
    address: MOCK_USDT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { 
      enabled: !!address,
      refetchInterval: 5000 
    }
  });
  
  const formattedBalance = userBalance ? Number(formatEther(userBalance as bigint)) : 0;

  useEffect(() => {
    if (!address) return;
    const fetchPortfolioData = async () => {
        if (!GRAPHQL_URL) return;
        const safeAddress = address.toLowerCase();
        try {
            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query {
                            markets { items { id question category deadline totalVolume totalYes totalNo resolved cancelled } }
                            userPositions(where: { user: "${safeAddress}" }) { items { market side invested } }
                        }
                    `
                }),
            });
            const json = await response.json();
            
            if (json.data?.markets?.items) {
                setMarkets(json.data.markets.items.map((m: any) => {
                    const { category, question, optionA, optionB } = parseQuestion(m.question);
                    return {
                        address: m.id,
                        question: question,
                        category: category,
                        optionA: (optionA || 'YES').toUpperCase(), 
                        optionB: (optionB || 'NO').toUpperCase(), 
                        deadline: Number(m.deadline),
                        volume: Number(formatEther(BigInt(m.totalVolume))),
                        yes: Number(formatEther(BigInt(m.totalYes))),
                        no: Number(formatEther(BigInt(m.totalNo))),
                        resolved: m.resolved,
                        cancelled: m.cancelled
                    };
                }));
            }
            if (json.data?.userPositions?.items) {
                setUserPositions(json.data.userPositions.items.map((p: any) => ({
                    marketAddress: p.market,
                    side: p.side,
                    invested: Number(formatEther(BigInt(p.invested)))
                })));
            }
        } catch (e) { console.error(e); }
    };
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 5000);
    return () => clearInterval(interval);
  }, [address]);

  const handleRedeem = async (marketAddress: string) => {
      try {
          await toast.promise(
              writeClaim({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'claim' }),
              {
                  loading: 'Claiming winnings... ⏳',
                  success: 'Winnings Claimed! 🏆',
                  error: 'Claim failed or rejected ❌',
              }
          );
      } catch (e) {
          console.error(e);
      }
  };

  const handleMint = async () => {
      try {
          await toast.promise(
              writeMint({ 
                  address: MOCK_USDT_ADDRESS as `0x${string}`, 
                  abi: ERC20_ABI, 
                  functionName: 'mint', 
                  args: [address as `0x${string}`, parseEther('1000')] 
              }),
              {
                  loading: 'Minting Testnet USDC... 🖨️',
                  success: 'Funds Minted! 💰',
                  error: 'Minting failed ❌',
              }
          );
      } catch (e) {
          console.error(e);
      }
  };

  // --- FILTER & PAGINATION LOGIC ---
  const myMarkets = markets.filter(m => 
      userPositions.some(p => p.marketAddress.toLowerCase() === m.address.toLowerCase())
  );

  const totalPages = Math.ceil(myMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = myMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col">
      <UsernameManager onNameSet={setMyUsername} />

      <nav className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center py-2"><img src="/logo.png" className="h-10.5 w-auto object-contain" alt="PolyPulseBets Logo" /></Link>
          <div className="flex gap-4 items-center">
            <Link href="/portfolio" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Portfolio</Link>
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

      <div className="flex flex-1 max-w-7xl mx-auto w-full p-6 md:p-8">
        {!isConnected ? (
            <div className="flex flex-col items-center justify-center w-full py-20 text-center">
                <div className="text-6xl mb-6">🔒</div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                <p className="text-slate-400 mb-8">Please connect your wallet to view your positions.</p>
                <ConnectButton />
            </div>
        ) : (
            <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">Your Portfolio</h2>
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-3xl border border-slate-800 relative overflow-hidden group shadow-xl">
                        <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl group-hover:scale-110 transition-transform">💰</div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Available Cash</div>
                        <div className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">${formattedBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <button onClick={handleMint} className="mt-6 text-xs bg-slate-800 text-slate-300 px-4 py-2 rounded-lg hover:bg-emerald-900/30 hover:text-emerald-400 hover:border-emerald-500/50 border border-slate-700 transition-all font-bold flex items-center gap-2"><span>+</span> Mint $1,000 Testnet USDC</button>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col justify-center shadow-xl">
                         <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Portfolio Activity</div>
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">📊</div>
                            <div><div className="text-white font-bold text-lg">All Positions</div><div className="text-slate-500 text-sm">Active and Closed Bets</div></div>
                         </div>
                    </div>
                </div>
                <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="grid grid-cols-12 gap-4 p-4 bg-slate-950/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-5 pl-2">Market</div>
                        <div className="col-span-2 text-center">Outcome / Shares</div>
                        <div className="col-span-2 text-right">Value / Price</div>
                        <div className="col-span-2 text-right">P&L</div>
                        <div className="col-span-1 text-right">Status</div>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {paginatedMarkets.length > 0 ? (
                            paginatedMarkets.map(market => ( 
                                <PortfolioRow 
                                    key={market.address} 
                                    market={market} 
                                    positions={userPositions}
                                    onClick={() => router.push(`/market/${market.address}`)} 
                                    onRedeem={handleRedeem}
                                /> 
                            ))
                        ) : (
                            <div className="text-center py-10 text-slate-500">No positions found.</div>
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
        )}
      </div>
    </div>
  );
}