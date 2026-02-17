'use client';

import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MARKET_MAKER_ABI, MOCK_USDT_ADDRESS, ERC20_ABI } from './constants';

// --- SHARED TYPES ---
export type Market = {
  address: string;
  question: string;
  category: string;
  image?: string;
  optionA?: string; 
  optionB?: string; 
  rules?: string; 
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

// --- HELPER: TEXT PARSER ---
export const parseQuestion = (raw: string) => {
  if (raw && raw.includes('~')) {
    const parts = raw.split('~');
    return {
      category: parts[0],
      question: parts[1],
      image: parts[2] && parts[2] !== '' ? parts[2] : undefined,
      optionA: parts[3] || 'YES',
      optionB: parts[4] || 'NO',
      rules: parts[5] || undefined
    };
  }
  return { category: 'Other', question: raw || 'Loading...', image: undefined, optionA: 'YES', optionB: 'NO' };
};

// --- COMPONENT: SMOOTH DYNAMIC CHART ---
export function PriceChart({ data, yesPrice }: { data: PricePoint[], yesPrice: number }) {
  const currentPrice = data.length > 0 ? data[data.length - 1].price : yesPrice;
  const isYesWinning = currentPrice >= 0.5;
  const color = isYesWinning ? '#10b981' : '#f43f5e'; 

  let chartData = [...data];
  if (chartData.length === 1) {
      chartData.push({ timestamp: Date.now() / 1000, price: chartData[0].price });
  }
  if (chartData.length === 0) {
      chartData = [
          { timestamp: Date.now() / 1000 - 86400, price: 0.5 },
          { timestamp: Date.now() / 1000, price: yesPrice }
      ];
  }

  return (
    <div className="h-64 w-full mt-4 select-none opacity-90 transition-all duration-500">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
          
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          
          <YAxis 
            domain={[0, 1]} 
            orientation="right" 
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} 
            tickFormatter={(val) => `$${val.toFixed(2)}`} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: `1px solid ${color}`, borderRadius: '12px', color: '#fff' }} 
            labelFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleString()} 
            formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Price"]}
            itemStyle={{ color: color, fontWeight: 'bold' }} 
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- COMPONENT: FEED CARD ---
export function FeedMarketCard({ market, onClick }: { market: Market, onClick: () => void }) {
  const ABI_WITH_ASSERTION = [
    ...MARKET_MAKER_ABI,
    {
      inputs: [],
      name: "assertionId",
      outputs: [{ type: "bytes32", name: "" }],
      stateMutability: "view",
      type: "function"
    }
  ] as const;

  const { data: resolved } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'resolved' });
  const { data: cancelled } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'cancelled' });
  const { data: isDisputed } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'isDisputed' });
  const { data: assertionId } = useReadContract({ address: market.address as `0x${string}`, abi: ABI_WITH_ASSERTION, functionName: 'assertionId' });
  
  // Live Liquidity Fetch
  const { data: liquidity } = useReadContract({
    address: MOCK_USDT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [market.address as `0x${string}`],
    query: { refetchInterval: 10000 } 
  });

  const displayVol = liquidity ? Number(formatEther(liquidity as bigint)) : 0;

  const { category, question, image, optionA, optionB } = market;
  const total = market.yes + market.no;
  
  // Formula: Price(YES) = Reserve(NO) / Total
  // Default to 60/40 Split logic for empty markets
  const yesPct = total > 0 ? (market.no / total) * 100 : 60; 
  const noPct = total > 0 ? (market.yes / total) * 100 : 40; 
  
  const dateStr = new Date(market.deadline * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isExpired = Date.now() > market.deadline * 1000;
  
  const hasAssertion = assertionId && assertionId !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  let status = "LIVE";
  let statusColor = "text-emerald-400 bg-emerald-900/10 border-emerald-500/20 animate-pulse";

  if (resolved) { 
      status = "RESOLVED"; 
      statusColor = "text-slate-400 bg-slate-800 border-slate-700"; 
  } else if (cancelled) { 
      status = "CANCELLED"; 
      statusColor = "text-red-400 bg-red-900/10 border-red-500/20 animate-pulse"; 
  } else if (isDisputed) { 
      status = "DISPUTED"; 
      statusColor = "text-orange-400 bg-orange-900/10 border-orange-500/20 animate-pulse"; 
  } else if (isExpired) { 
      if (hasAssertion) {
          status = "ASSERTED";
          statusColor = "text-blue-400 bg-blue-900/10 border-blue-500/20 animate-pulse";
      } else {
          status = "AWAITING ASSERTION";
          statusColor = "text-amber-400 bg-amber-900/10 border-amber-500/20 animate-pulse";
      }
  }

  return (
    <div onClick={onClick} className="bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 group flex flex-col justify-between h-full relative overflow-hidden">
      {image && (<div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-2xl pointer-events-none"><img src={image} className="w-full h-full object-cover" /></div>)}
      <div>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">{category}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusColor} flex items-center gap-1`}>{status}</span>
                </div>
            </div>
            {image && (<img src={image} alt="market" className="w-14 h-14 rounded-lg object-cover border border-slate-700 shadow-sm ml-2 bg-slate-800" />)}
        </div>
        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 mb-6 leading-snug line-clamp-3">{question}</h3>
      </div>
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-2">
            <div className="text-emerald-400 font-bold text-xl">{yesPct.toFixed(0)}% <span className="text-xs text-slate-500 font-normal uppercase">{(optionA || 'YES').toUpperCase()}</span></div>
            <div className="text-rose-400 font-bold text-xl">{noPct.toFixed(0)}% <span className="text-xs text-slate-500 font-normal uppercase">{(optionB || 'NO').toUpperCase()}</span></div>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex mb-3">
            <div style={{ width: `${yesPct}%` }} className="bg-emerald-500 transition-all duration-500"></div>
            <div style={{ width: `${noPct}%` }} className="bg-rose-500 transition-all duration-500"></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-3 mt-3">
            <span className="flex items-center gap-1">📊 ${displayVol.toLocaleString(undefined, { maximumFractionDigits: 0 })} Vol</span>
            <span>Ends: {dateStr}</span>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: PORTFOLIO ITEM (FIXED) ---
export function PortfolioItem({ market, side, balance, invested, onClick, onRedeem }: { market: Market, side: 'YES' | 'NO', balance: number, invested: number, onClick: () => void, onRedeem: (addr: string) => void }) {
  const { data: resolved } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'resolved' });
  const { data: winningOutcome } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'winningOutcome' });
  const { data: cancelled } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'cancelled' });

  const { question, optionA, optionB } = market;
  
  const reserveYes = market.yes; 
  const reserveNo = market.no;
  
  let liquidationValue = 0;
  let spotPrice = 0;

  // 1. Calculate Spot Price
  const totalPool = reserveYes + reserveNo;
  if (totalPool > 0) {
      spotPrice = side === 'YES' ? (reserveNo / totalPool) : (reserveYes / totalPool);
  }

  // 2. Calculate Real Liquidation Value 
  if (cancelled) {
      liquidationValue = balance; 
  } else if (resolved) {
      const outcome = Number(winningOutcome);
      const isWinner = (outcome === 1 && side === 'YES') || (outcome === 2 && side === 'NO');
      liquidationValue = isWinner ? balance : 0;
  } else {
      if (balance > 0 && reserveYes > 0 && reserveNo > 0) {
          // NEW QUADRATIC SELL MATH
          const b = reserveYes + reserveNo + balance;
          const c = balance * (side === 'YES' ? reserveNo : reserveYes);
          const rawUsdtOut = (b - Math.sqrt(b * b - 4 * c)) / 2;
          
          // Deduct the 1% exit fee
          liquidationValue = rawUsdtOut * 0.99;
      }
  }

  const isClaimed = (resolved || cancelled) && balance < 0.0001 && invested > 0;
  const canClaim = (resolved || cancelled) && balance > 0.0001 && liquidationValue > 0;
  const outcome = Number(winningOutcome);
  const isWinner = resolved && ((outcome === 1 && side === 'YES') || (outcome === 2 && side === 'NO'));

  // FIX: Force Uppercase for Labels
  const label = side === 'YES' ? (optionA || 'YES').toUpperCase() : (optionB || 'NO').toUpperCase();

  return (
    <div onClick={onClick} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 md:items-center bg-slate-900/50 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer last:border-0 group">
      
      {/* Market Name */}
      <div className="col-span-6 md:pl-2">
        <div className="font-bold text-white text-sm line-clamp-2 md:truncate pr-4 group-hover:text-blue-400 transition-colors">{question}</div>
        <div className="text-[10px] text-slate-500 font-mono mt-1 hidden md:block">{market.address.slice(0, 6)}...{market.address.slice(-4)}</div>
      </div>
      
      {/* Mobile Row: Details */}
      <div className="flex justify-between items-center md:contents">
          
          {/* Outcome Badge */}
          <div className="col-span-2 text-left md:text-center">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border truncate inline-block ${side === 'YES' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {label}
              </span>
          </div>

          {/* Value & Price */}
          <div className="col-span-3 text-right">
              <div className="text-white font-mono font-bold text-sm">{isClaimed ? "-" : `$${liquidationValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}</div>
              {!resolved && !cancelled && <div className="text-[10px] text-slate-500">@ ${spotPrice.toFixed(2)}</div>}
          </div>
      </div>

      <div className="col-span-1 flex justify-end md:justify-end mt-2 md:mt-0 border-t border-slate-800/50 pt-2 md:border-0 md:pt-0">
        {canClaim ? (
            <button onClick={(e) => { e.stopPropagation(); onRedeem(market.address); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-4 py-1.5 rounded shadow-lg shadow-blue-500/20 animate-pulse">
                {cancelled ? "REFUND" : "CLAIM"}
            </button>
        ) : isClaimed ? (
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded">
                {cancelled ? "REFUNDED" : "CLAIMED"}
            </span>
        ) : resolved ? (
            <span className="text-[10px] font-bold text-slate-600 uppercase">{isWinner ? "WINNER" : "LOST"}</span>
        ) : (
            <div className="flex items-center gap-1.5 md:justify-end">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <span className="md:hidden text-[10px] font-bold text-emerald-500">Active</span>
            </div>
        )}
      </div>
    </div>
  );
}

export function PortfolioRow({ market, positions, onClick, onRedeem }: { market: Market, positions: UserPositionData[], onClick: () => void, onRedeem: (addr: string) => void }) {
  const { address } = useAccount();
  const { data: yesBal, isLoading: loadingYes } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'yesBalances', args: [address as `0x${string}`], query: { enabled: !!address } });
  const { data: noBal, isLoading: loadingNo } = useReadContract({ address: market.address as `0x${string}`, abi: MARKET_MAKER_ABI, functionName: 'noBalances', args: [address as `0x${string}`], query: { enabled: !!address } });
  const myYes = yesBal ? Number(formatEther(yesBal as bigint)) : 0;
  const myNo = noBal ? Number(formatEther(noBal as bigint)) : 0;
  
  if (loadingYes || loadingNo) return null;

  // Only show rows where user actually holds shares
  const showYes = myYes > 0.0001; 
  const showNo = myNo > 0.0001; 
  
  if (!showYes && !showNo) return null;
  return (
    <>
        {showYes && <PortfolioItem market={market} side="YES" balance={myYes} invested={0} onClick={onClick} onRedeem={onRedeem} />}
        {showNo && <PortfolioItem market={market} side="NO" balance={myNo} invested={0} onClick={onClick} onRedeem={onRedeem} />}
    </>
  );
}