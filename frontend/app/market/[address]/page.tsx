'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect, use } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';
import { MOCK_USDT_ADDRESS, ERC20_ABI, MARKET_MAKER_ABI, ADMIN_WALLETS } from '../../constants';
import { Market, PricePoint, parseQuestion, PriceChart } from '../../components';
import { MarketDiscussion } from '../../components/MarketDiscussion';
import { UsernameManager } from '../../components/UsernameManager';
import { useRouter } from 'next/navigation';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";

if (!GRAPHQL_URL) {
  console.error("❌ CRITICAL ERROR: NEXT_PUBLIC_GRAPHQL_URL is missing in .env file");
}

export default function MarketPage({ params }: { params: Promise<{ address: string }> }) {
  const resolvedParams = use(params);
  const marketAddress = resolvedParams.address;

  const { address, isConnected } = useAccount();
  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());
  const router = useRouter(); 
  
  // --- STATE ---
  const [market, setMarket] = useState<Market | null>(null);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [betAmount, setBetAmount] = useState('10');
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO' | null>(null);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY'); 
  const [userInvested, setUserInvested] = useState(0);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  // --- CONTRACT WRITES ---
  const { writeContract: writeApprove, isPending: isApproving } = useWriteContract();
  const { writeContract: writeBet, isPending: isBetting } = useWriteContract();
  const { writeContract: writeClaim, isPending: isClaiming } = useWriteContract();
  const { writeContract: writePropose, isPending: isProposing } = useWriteContract();
  const { writeContract: writeDispute, isPending: isDisputing } = useWriteContract();
  const { writeContract: writeFinalize, isPending: isFinalizing } = useWriteContract();

  // --- READS ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ 
    address: MOCK_USDT_ADDRESS as `0x${string}`, 
    abi: ERC20_ABI, 
    functionName: 'allowance', 
    args: [address as `0x${string}`, marketAddress as `0x${string}`], 
    query: { enabled: !!address } 
  });

  const { data: myYesBal } = useReadContract({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'yesBalances', args: [address as `0x${string}`], watch: true });
  const { data: myNoBal } = useReadContract({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'noBalances', args: [address as `0x${string}`], watch: true });

  // --- DATA FETCHING ---
  const fetchMarketData = async () => {
    if (!GRAPHQL_URL) return;
    try {
        const res = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: `query { market(id: "${marketAddress}") { id question category deadline totalVolume totalYes totalNo resolved cancelled proposer proposedOutcome proposalTime isDisputed } }` 
            })
        });
        const json = await res.json();
        if (json.data?.market) {
            const m = json.data.market;
            const { category, question, image, optionA, optionB } = parseQuestion(m.question);
            
            setMarket({
                address: m.id,
                question, category, image,
                optionA: (optionA || 'YES').toUpperCase(), 
                optionB: (optionB || 'NO').toUpperCase(), 
                deadline: Number(m.deadline),
                volume: Number(formatEther(BigInt(m.totalVolume))),
                yes: Number(formatEther(BigInt(m.totalYes))),
                no: Number(formatEther(BigInt(m.totalNo))),
                resolved: m.resolved,
                cancelled: m.cancelled,
                proposer: m.proposer,
                proposedOutcome: m.proposedOutcome ? Number(m.proposedOutcome) : 0,
                proposalTime: m.proposalTime ? Number(m.proposalTime) : 0,
                isDisputed: m.isDisputed
            });
        }
    } catch(e) { console.error(e); }
  };

  const fetchChart = async () => {
    if (!GRAPHQL_URL) return;
      try {
        const response = await fetch(GRAPHQL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query { pricePoints(where: { market: "${marketAddress}" }, orderBy: "timestamp", orderDirection: "asc") { items { timestamp yesPrice } } }` }) });
        const json = await response.json();
        if (json.data?.pricePoints) setChartData(json.data.pricePoints.items.map((p: any) => ({ timestamp: Number(p.timestamp), price: Number(formatEther(BigInt(p.yesPrice))) })));
      } catch (e) { console.error(e); }
  };

  const fetchUserPosition = async () => {
    if (!address || !marketAddress || !GRAPHQL_URL) return; 
    try {
        const res = await fetch(GRAPHQL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query { userPositions(where: { user: "${address.toLowerCase()}", market: "${marketAddress.toLowerCase()}" }) { items { invested } } }` }) });
        const json = await res.json();
        const total = json.data?.userPositions?.items ? json.data.userPositions.items.reduce((acc: number, item: any) => acc + Number(formatEther(BigInt(item.invested))), 0) : 0;
        setUserInvested(total);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
      fetchMarketData(); 
      fetchChart();
      const i = setInterval(() => { fetchMarketData(); fetchChart(); }, 5000); 
      return () => clearInterval(i); 
  }, [marketAddress]);

  useEffect(() => { fetchUserPosition(); }, [address, marketAddress]);

  // --- CALCULATIONS ---
  const yesPct = market ? ((market.yes + market.no) > 0 ? market.yes / (market.yes + market.no) : 0.5) : 0.5;
  const isApproved = allowance ? Number(formatEther(allowance as bigint)) >= Number(betAmount) : false;
  const hasTokensToClaim = (Number(myYesBal || 0n) + Number(myNoBal || 0n)) > 0;
  
  const hasProposal = market?.proposer && market.proposer !== '0x0000000000000000000000000000000000000000';
  const proposalTimestamp = market?.proposalTime || 0;
  const disputeDeadline = proposalTimestamp + 86400; 
  const nowSeconds = Math.floor(Date.now() / 1000);
  const canFinalize = hasProposal && !market?.isDisputed && nowSeconds > disputeDeadline;
  const isExpired = market ? Date.now() > (market.deadline * 1000) : false;

  const calculatePayout = () => {
    if (!selectedSide || !betAmount || !market) return { payout: 0, roi: 0 };
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) return { payout: 0, roi: 0 };
    const losingPool = selectedSide === 'YES' ? market.no : market.yes;
    const winningPool = selectedSide === 'YES' ? market.yes : market.no;
    const newWinningPool = winningPool + bet;
    const profit = (bet / newWinningPool) * losingPool;
    const payout = bet + profit;
    const roi = ((payout - bet) / bet) * 100;
    return { payout, roi };
  };
  const { payout, roi } = calculatePayout();

  // --- HANDLERS ---
  const handleApprove = () => { 
      writeApprove({ address: MOCK_USDT_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [marketAddress as `0x${string}`, parseEther('100000')] }, 
      { onSuccess: () => { alert("Approved!"); setTimeout(refetchAllowance, 2000); }});
  };

  const handleTrade = () => {
      if(!selectedSide) return;
      writeBet({ 
          address: marketAddress as `0x${string}`, 
          abi: MARKET_MAKER_ABI, 
          functionName: selectedSide === 'YES' ? 'buyYes' : 'buyNo', 
          args: [parseEther(betAmount)] 
      }, { onSuccess: () => { alert("Bet Placed!"); setTimeout(() => { fetchMarketData(); fetchChart(); }, 2000); setSelectedSide(null); } });
  };

  const handleClaim = () => {
      writeClaim({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'claim' },
      { onSuccess: () => alert("Funds Claimed!") });
  };

  const handlePropose = (outcome: number) => { 
      writePropose({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'proposeOutcome', args: [BigInt(outcome)] },
      { onSuccess: () => alert("Outcome Proposed!") }); 
  };
  
  const handleDispute = () => { 
      writeDispute({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'disputeOutcome' },
      { onSuccess: () => alert("Dispute Started!") }); 
  };
  
  const handleFinalize = () => { 
      writeFinalize({ address: marketAddress as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'finalize' },
      { onSuccess: () => alert("Market Finalized!") }); 
  };

  if (!market) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-500 animate-pulse">Loading Market Data...</div>;

  // --- CAPS LOCK ENFORCEMENT ---
  const labelA = (market.optionA || 'YES').toUpperCase();
  const labelB = (market.optionB || 'NO').toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col">
        <UsernameManager onNameSet={setMyUsername} />
        
        {/* NAVBAR */}
        <nav className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center py-2"><img src="/logo.png" className="h-9 w-auto object-contain" alt="PolyPulseBets Logo" /></Link>
            <div className="flex gap-4 items-center">
                <Link href="/portfolio" className="hidden md:block text-sm font-bold text-slate-400 hover:text-white transition-colors">Portfolio</Link>
                <Link href="/support" className="hidden md:block text-sm font-bold text-slate-400 hover:text-white transition-colors">Support</Link>
                <Link href="/leaderboard" className="text-sm font-bold text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">🏆 Leaderboard</Link>
                {isAdmin ? (
                    <Link href="/create" className="hidden md:block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 transition-all">+ Create</Link>
                ) : (
                    <Link href="/suggest" className="hidden md:block bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-bold text-sm">Suggest?</Link>
                )}

                <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                    <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                    <span className="text-xs font-bold text-slate-300">
                        {isConnected ? (myUsername ? `@${myUsername}` : 'Loading...') : 'User'}
                    </span>
                </div>
                
                <ConnectButton />
            </div>
            </div>
        </nav>

        <div className="max-w-3xl mx-auto w-full p-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-white mb-6 inline-flex items-center gap-2 text-sm font-bold transition-colors">← Back</button>
            
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
                {/* Background Image Effect */}
                {market.image && (
                    <div className="absolute top-0 right-0 w-full h-64 opacity-20 pointer-events-none">
                        <img src={market.image} className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }} />
                    </div>
                )}

                {/* --- HEADER  --- */}
                <div className="p-8 border-b border-slate-800 bg-slate-900/50 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>

                                <div className="text-emerald-400 text-3xl font-bold">{(yesPct * 100).toFixed(0)}% <span className="text-slate-400 text-sm font-normal">Chance of {labelA}</span></div>

                            <div className="flex items-center gap-4 text-sm text-slate-500 font-mono mb-2 mt-2">
                                <span>Ends: {new Date(market.deadline * 1000).toLocaleDateString()}</span>
                                <span className="text-emerald-500 border border-emerald-900/30 bg-emerald-900/10 px-2 py-0.5 rounded">Vol: ${market.volume.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                             {market.cancelled ? (
                                 <div className="text-red-400 font-bold border border-red-900 bg-red-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">CANCELLED</div>
                             ) : market.isDisputed ? (
                                 <div className="text-orange-400 font-bold border border-orange-900 bg-orange-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">DISPUTED</div>
                             ) : market.resolved ? (
                                 <div className="text-slate-400 font-bold border border-slate-700 bg-slate-800 px-4 py-2 rounded-lg text-xs animate-pulse">RESOLVED</div>
                             ) : isExpired ? (
                                 <div className="text-blue-400 font-bold border border-blue-900 bg-blue-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">AWAITING ORACLE</div>
                             ) : (
                                 <div className="text-emerald-400 font-bold border border-emerald-900 bg-emerald-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">LIVE MARKET</div>
                             )}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white leading-tight mt-4">{market.question}</h1>
                </div>

                {/* --- GRAPH --- */}
                <div className="px-8 pt-4 pb-0 bg-slate-900/30">
                    <PriceChart data={chartData} yesPrice={yesPct} />
                </div>

                {/* --- ACTION AREA --- */}
                {market.resolved ? (
                    <div className="p-8 bg-slate-950 border-t border-slate-800 text-center">
                        <div className="text-3xl mb-4">{market.cancelled ? "⚠️" : "🏆"}</div>
                        <h3 className="text-white font-bold text-lg mb-2">{market.cancelled ? "Market Cancelled" : "Outcome Decided"}</h3>
                        <p className="text-sm mb-6 text-slate-400">
                            {market.cancelled ? "This market was cancelled. Refunds available." : `Winner: ${market.winningOutcome === 1 ? labelA : labelB}`}
                        </p>
                        {hasTokensToClaim ? (
                            <button onClick={handleClaim} disabled={isClaiming} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg animate-pulse">
                                {market.cancelled ? "💰 Claim Refund" : "💰 Claim Winnings"}
                            </button>
                        ) : (
                            <div className="w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-xl border border-slate-700">
                                {userInvested > 0 ? "✅ Settlement Complete" : "🚫 Not Eligible"}
                            </div>
                        )}
                    </div>
                ) : isExpired ? (
                    <div className="p-8 bg-slate-950 border-t border-slate-800">
                        {!hasProposal ? (
                            <div className="text-center">
                                <div className="text-4xl mb-4">🔮</div>
                                <h3 className="text-white font-bold text-lg mb-2">Ready for Resolution</h3>
                                <p className="text-sm text-slate-400 mb-6">Voting is open. Stake 50 Tokens to propose the winner.</p>
                                <div className="flex gap-4">
                                    <button onClick={() => handlePropose(1)} disabled={isProposing || !isApproved} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">{labelA} WON</button>
                                    <button onClick={() => handlePropose(2)} disabled={isProposing || !isApproved} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl">{labelB} WON</button>
                                </div>
                                {!isApproved && (
                                    <button onClick={handleApprove} disabled={isApproving} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">Unlock to Propose</button>
                                )}
                            </div>
                        ) : market.isDisputed ? (
                            <div className="text-center">
                                <h3 className="text-white font-bold text-lg">Dispute in Progress</h3>
                                <p className="text-sm text-slate-400">Admins are reviewing the evidence.</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <h3 className="text-white font-bold text-lg mb-2">Proposal Pending</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Winning: <span className={`font-bold ${market.proposedOutcome === 1 ? "text-emerald-400" : "text-rose-400"}`}>{market.proposedOutcome === 1 ? labelA : labelB}</span>
                                </p>
                                {canFinalize ? (
                                    <button onClick={handleFinalize} disabled={isFinalizing} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">✅ Finalize Market</button>
                                ) : (
                                    <>
                                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-2">
                                            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${((nowSeconds - proposalTimestamp) / 86400) * 100}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 font-mono mb-4"><span>Challenge Window</span><span>{Math.max(0, Math.floor((disputeDeadline - nowSeconds) / 60))} mins left</span></div>
                                        <button onClick={handleDispute} disabled={isDisputing || !isApproved} className="w-full py-3 border border-red-500/50 text-red-400 hover:bg-red-950/30 font-bold rounded-xl">🚩 Dispute</button>
                                        {!isApproved && <button onClick={handleApprove} className="w-full mt-2 py-3 bg-slate-800 text-white font-bold rounded-xl">Unlock</button>}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* --- TABS --- */}
                        <div className="flex border-t border-slate-800">
                            <button onClick={() => setTradeMode('BUY')} className={`flex-1 py-4 font-bold text-sm tracking-wide ${tradeMode === 'BUY' ? 'bg-slate-900 text-white border-t-2 border-blue-500' : 'bg-slate-950 text-slate-500 hover:text-white'}`}>BUY</button>
                            <button onClick={() => setTradeMode('SELL')} className={`flex-1 py-4 font-bold text-sm tracking-wide ${tradeMode === 'SELL' ? 'bg-slate-900 text-white border-t-2 border-rose-500' : 'bg-slate-950 text-slate-500 hover:text-white'}`}>SELL</button>
                        </div>

                        <div className="p-8 grid md:grid-cols-2 gap-12 bg-slate-950 border-t border-slate-800">
                            {tradeMode === 'BUY' ? (
                                <>
                                    {/* --- LEFT: OUTCOMES --- */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-wider"><span>Outcome</span><span>Price</span></div>
                                        
                                        <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-emerald-500/20">
                                            <span className="text-emerald-400 font-bold">{labelA}</span>
                                            <span className="text-white">${yesPct.toFixed(2)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-rose-500/20">
                                            <span className="text-rose-400 font-bold">{labelB}</span>
                                            <span className="text-white">${(1 - yesPct).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* --- RIGHT: ACTIONS  --- */}
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                            <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 pl-8 pr-4 py-4 rounded-xl text-xl font-bold text-white outline-none focus:border-blue-500" />
                                        </div>

                                        {!isConnected ? (
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <p className="text-slate-400 mb-4 text-sm">Connect wallet to trade</p>
                                                <ConnectButton />
                                            </div>
                                        ) : (
                                            <>
                                                {!isApproved ? (
                                                    <button onClick={handleApprove} disabled={isApproving} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/20">
                                                        {isApproving ? "Unlocking..." : "🔓 Unlock Trading"}
                                                    </button>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <button onClick={() => setSelectedSide('YES')} className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${selectedSide === 'YES' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{labelA}</button>
                                                            <button onClick={() => setSelectedSide('NO')} className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${selectedSide === 'NO' ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{labelB}</button>
                                                        </div>
                                                        {selectedSide && (
                                                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs text-slate-400 uppercase font-bold">Est. Payout</span>
                                                                    <span className="text-emerald-400 font-mono font-bold text-lg">${payout.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-xs text-slate-400 uppercase font-bold">Profit</span>
                                                                    <span className={`font-mono font-bold text-sm ${roi > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>+{roi.toFixed(2)}%</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedSide && (
                                                            <button onClick={handleTrade} disabled={isBetting} className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${selectedSide === 'YES' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}>
                                                                {isBetting ? "Confirming..." : `CONFIRM ${selectedSide === 'YES' ? labelA : labelB}`}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-2 text-center py-10 px-4 bg-slate-900 rounded-2xl border border-slate-800 border-dashed">
                                    <div className="text-4xl mb-4">🔒</div>
                                    <h3 className="text-white font-bold text-lg mb-2">Selling Disabled</h3>
                                    <p className="text-slate-400 text-sm max-w-md mx-auto">This is a Parimutuel Market. Positions are locked until the event resolves.<br/><br/><span className="text-xs bg-slate-800 px-2 py-1 rounded">V1 Contract Limitation</span></p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <MarketDiscussion marketAddress={marketAddress} />
        </div>
    </div>
  );
}