'use client';

import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MARKET_MAKER_ABI } from './constants';

// --- SHARED TYPES ---
export type Market = {
  address: string;
  question: string;
  category: string;
  image?: string;
  optionA?: string; 
  optionB?: string; 
  deadline: number;
  volume: number;
  yes: number;
  no: number;
  resolved: boolean;
  cancelled?: boolean; 
  proposer?: string;
  proposedOutcome?: number;
  proposalTime?: number;
  isDisputed?: boolean;
};

export type UserPositionData = {
  marketAddress: string;
  side: 'YES' | 'NO';
  invested: number;
};

export type PricePoint = {
  timestamp: number;
  price: number;
};

// --- HELPER: TEXT PARSER  ---
export const parseQuestion = (raw: string) => {
  if (raw && raw.includes('~')) {
    const parts = raw.split('~');
    return {
      category: parts[0],
      question: parts[1],
      image: parts[2] && parts[2] !== '' ? parts[2] : undefined,
      optionA: parts[3] || 'YES',
      optionB: parts[4] || 'NO'
    };
  }
  // Fallback for old markets or errors
  return { category: 'Other', question: raw || 'Loading...', image: undefined, optionA: 'YES', optionB: 'NO' };
};

// --- COMPONENT: PRICE CHART ---
export function PriceChart({ data, yesPrice }: { data: PricePoint[], yesPrice: number }) {
  const isYesWinning = yesPrice >= 0.5;
  const color = isYesWinning ? '#10b981' : '#f43f5e'; 
  
  const chartData = data.length > 0 ? data : [
      { timestamp: Date.now() / 1000 - 86400, price: 0.5 },
      { timestamp: Date.now() / 1000, price: yesPrice }
  ];

  return (
    <div className="h-64 w-full mt-4 select-none opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
          <XAxis dataKey="timestamp" hide />
          <YAxis domain={[0, 1]} orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `$${val.toFixed(2)}`} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} labelFormatter={() => ''} formatter={(val: number) => [`$${val.toFixed(2)}`, "Price"]} itemStyle={{ color: color }} />
          <Area type="stepAfter" dataKey="price" stroke={color} fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- COMPONENT: FEED CARD ---
export function FeedMarketCard({ market, onClick }: { market: Market, onClick: () => void }) {
  const { data: resolved } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'resolved' });
  const { data: cancelled } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'cancelled' });
  const { data: isDisputed } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'isDisputed' });
  
  const { category, question, image, optionA, optionB } = market;
  const total = market.yes + market.no;
  const yesPct = total > 0 ? (market.yes / total) * 100 : 50;
  const noPct = total > 0 ? (market.no / total) * 100 : 50;
  const dateStr = new Date(market.deadline * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isExpired = Date.now() > market.deadline * 1000;

  let status = "LIVE";
  let statusColor = "text-emerald-400 bg-emerald-900/10 border-emerald-500/20 animate-pulse";

  if (cancelled) { 
      status = "CANCELLED"; 
      statusColor = "text-red-400 bg-red-900/10 border-red-500/20 animate-pulse"; 
  } else if (isDisputed) {
      status = "DISPUTED";
      statusColor = "text-orange-400 bg-orange-900/10 border-orange-500/20 animate-pulse";
  } else if (resolved) { 
      status = "ENDED"; 
      statusColor = "text-slate-400 bg-slate-800 border-slate-700 animate-pulse"; 
  } else if (isExpired) { 
      status = "AWAITING ORACLE"; 
      statusColor = "text-blue-400 bg-blue-900/10 border-blue-500/20 animate-pulse"; 
  }

  return (
    <div onClick={onClick} className="bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 group flex flex-col justify-between h-full relative overflow-hidden">
      {image && (
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-2xl pointer-events-none">
            <img src={image} className="w-full h-full object-cover" />
        </div>
      )}
      <div>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">{category}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusColor} flex items-center gap-1`}>
                        {status}
                    </span>
                </div>
            </div>
            {image && (
                <img 
                    src={image} 
                    alt="market" 
                    className="w-14 h-14 rounded-lg object-cover border border-slate-700 shadow-sm ml-2 bg-slate-800"
                />
            )}
        </div>
        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 mb-6 leading-snug line-clamp-3">{question}</h3>
      </div>
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-2">
            {/* UPDATED: Displays Option A Name (e.g., France) */}
            <div className="text-emerald-400 font-bold text-xl">{yesPct.toFixed(0)}% <span className="text-xs text-slate-500 font-normal uppercase">{optionA || 'YES'}</span></div>
            {/* UPDATED: Displays Option B Name (e.g., England) */}
            <div className="text-rose-400 font-bold text-xl">{noPct.toFixed(0)}% <span className="text-xs text-slate-500 font-normal uppercase">{optionB || 'NO'}</span></div>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex mb-3">
            <div style={{ width: `${yesPct}%` }} className="bg-emerald-500 transition-all duration-500"></div>
            <div style={{ width: `${noPct}%` }} className="bg-rose-500 transition-all duration-500"></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-3 mt-3">
            <span className="flex items-center gap-1">📊 ${market.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })} Vol</span>
            <span>Ends: {dateStr}</span>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: PORTFOLIO ITEM ---
export function PortfolioItem({ market, side, balance, invested, onClick, onRedeem }: { market: Market, side: 'YES' | 'NO', balance: number, invested: number, onClick: () => void, onRedeem: (addr: string) => void }) {
  const { data: resolved } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'resolved' });
  const { data: winningOutcome } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'winningOutcome' });
  const { data: cancelled } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'cancelled' });

  const { question, optionA, optionB } = market;
  const tYes = market.yes; const tNo = market.no;
  let currentValue = 0;
  
  // Custom Label Logic
  const label = side === 'YES' ? (optionA || 'YES') : (optionB || 'NO');

  if (balance > 0) {
      if (cancelled) {
          currentValue = balance;
      } else {
          if (side === 'YES') currentValue = tYes > 0 ? balance + (balance * tNo / tYes) : 0;
          if (side === 'NO') currentValue = tNo > 0 ? balance + (balance * tYes / tNo) : 0;
      }
  }
  
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  
  let canClaim = false; 
  let isWinner = false;
  
  if (cancelled) {
      if (balance > 0.0001) canClaim = true;
  } else if (resolved) {
      const outcome = Number(winningOutcome);
      if ((outcome === 1 && side === 'YES') || (outcome === 2 && side === 'NO')) { 
          isWinner = true; 
          if (balance > 0.0001) canClaim = true; 
      }
  }
  
  const isClaimed = (isWinner || cancelled) && balance < 0.0001 && invested > 0;

  return (
    <div onClick={onClick} className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-900/50 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer last:border-0 group">
      <div className="col-span-5 pl-2">
        <div className="font-bold text-white text-sm truncate pr-4 group-hover:text-blue-400 transition-colors">{question}</div>
        <div className="text-[10px] text-slate-500 font-mono mt-1">{market.address.slice(0, 6)}...{market.address.slice(-4)}</div>
      </div>
      
      {/* UPDATED: Shows Custom Label (France) instead of just YES */}
      <div className="col-span-2 text-center">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border truncate max-w-[80px] inline-block ${side === 'YES' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {label}
          </span>
      </div>

      <div className="col-span-2 text-right"><div className="text-white font-mono font-bold text-sm">{isClaimed ? "-" : `$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</div></div>
      <div className="col-span-2 text-right">
         {(invested > 0 && !isClaimed) ? (<><div className={`font-mono font-bold text-sm ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</div><div className={`text-[10px] ${pnl >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>{pnl >= 0 ? '▲' : '▼'} {Math.abs(pnlPercent).toFixed(1)}%</div></>) : (<div className="text-slate-600 text-xs">-</div>)}
      </div>
      <div className="col-span-1 flex justify-end">
        {canClaim ? (
            <button onClick={(e) => { e.stopPropagation(); onRedeem(market.address); }} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg shadow-blue-500/20 animate-pulse">
                {cancelled ? "REFUND" : "CLAIM"}
            </button>
        ) : isClaimed ? (
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded">
                {cancelled ? "REFUNDED" : "CLAIMED"}
            </span>
        ) : resolved ? (
            <span className="text-[10px] font-bold text-slate-600 uppercase">{isWinner ? "WINNER" : "LOST"}</span>
        ) : (
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENT: PORTFOLIO ROW ---
export function PortfolioRow({ market, positions, onClick, onRedeem }: { market: Market, positions: UserPositionData[], onClick: () => void, onRedeem: (addr: string) => void }) {
  const { address } = useAccount();
  
  const { data: yesBal, isLoading: loadingYes } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'yesBalances', args: [address as `0x${string}`], query: { enabled: !!address } });
  const { data: noBal, isLoading: loadingNo } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'noBalances', args: [address as `0x${string}`], query: { enabled: !!address } });
  
  const myYes = yesBal ? Number(formatEther(yesBal as bigint)) : 0;
  const myNo = noBal ? Number(formatEther(noBal as bigint)) : 0;
  const posYes = positions.find(p => p.marketAddress.toLowerCase() === market.address.toLowerCase() && p.side === 'YES');
  const posNo = positions.find(p => p.marketAddress.toLowerCase() === market.address.toLowerCase() && p.side === 'NO');
  const investedYes = posYes ? posYes.invested : 0;
  const investedNo = posNo ? posNo.invested : 0;
  
  if (loadingYes || loadingNo) return null;
  const showYes = myYes > 0.0001 || investedYes > 0;
  const showNo = myNo > 0.0001 || investedNo > 0;
  if (!showYes && !showNo) return null;
  return (
    <>
        {showYes && <PortfolioItem market={market} side="YES" balance={myYes} invested={investedYes} onClick={onClick} onRedeem={onRedeem} />}
        {showNo && <PortfolioItem market={market} side="NO" balance={myNo} invested={investedNo} onClick={onClick} onRedeem={onRedeem} />}
    </>
  );
}