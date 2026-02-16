'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect, use } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { MOCK_USDT_ADDRESS, ERC20_ABI, MARKET_MAKER_ABI, MOCK_ORACLE_ABI, MOCK_ORACLE_ADDRESS } from '../../constants';
import { Market, PricePoint, parseQuestion } from '../../components'; 
import { MarketDiscussion } from '../../components/MarketDiscussion';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast'; 

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";

if (!GRAPHQL_URL) {
  console.error("❌ CRITICAL ERROR: NEXT_PUBLIC_GRAPHQL_URL is missing in .env file");
}

// HELPER: Ignore "User denied transaction" errors
const isUserRejection = (err: any) => {
    return err?.message?.includes("User denied") || err?.message?.includes("User rejected");
};

function WinningSideChart({ data, yesPrice }: { data: PricePoint[], yesPrice: number }) {
  const isYesWinning = yesPrice >= 0.5;
  const color = isYesWinning ? '#10b981' : '#f43f5e'; 

  let chartData = data.map(p => ({
      timestamp: p.timestamp,
      price: isYesWinning ? p.price : (1 - p.price)
  }));

  if (chartData.length > 0) {
      chartData.push({ 
          timestamp: Date.now() / 1000, 
          price: isYesWinning ? yesPrice : (1 - yesPrice) 
      });
  } else {
      chartData = [
          { timestamp: Date.now() / 1000 - 86400, price: 0.5 },
          { timestamp: Date.now() / 1000, price: isYesWinning ? yesPrice : (1 - yesPrice) }
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
            formatter={(val: any) => [`$${Number(val).toFixed(2)}`, isYesWinning ? "YES Price" : "NO Price"]}
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

export default function MarketPage({ params }: { params: Promise<{ address: string }> }) {
  const resolvedParams = use(params);
  const marketAddress = resolvedParams.address as `0x${string}`;
  const { address, isConnected } = useAccount();
  const router = useRouter(); 
  
  // --- MAIN STATE ---
  const [market, setMarket] = useState<Market | null>(null);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [betAmount, setBetAmount] = useState('1'); 
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO' | null>(null);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY'); 
  const [userInvested, setUserInvested] = useState(0);
  
  // --- UI STATE ---
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [links, setLinks] = useState<string[]>(['']); 
  const [sliderValue, setSliderValue] = useState(0);

  // --- CONTRACT WRITES ---
  const { writeContractAsync: writeApprove, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: writeBet, isPending: isBetting } = useWriteContract();
  const { writeContractAsync: writeClaim, isPending: isClaiming } = useWriteContract();
  const { writeContractAsync: writeAddLiq, isPending: isAddingLiq } = useWriteContract();

  // --- CONTRACT READS ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ 
    address: MOCK_USDT_ADDRESS as `0x${string}`, 
    abi: ERC20_ABI, 
    functionName: 'allowance', 
    args: [address as `0x${string}`, marketAddress], 
    query: { enabled: !!address } 
  });

  const { data: usdtBalance } = useReadContract({ 
    address: MOCK_USDT_ADDRESS as `0x${string}`, 
    abi: ERC20_ABI, 
    functionName: 'balanceOf', 
    args: [address as `0x${string}`], 
    query: { enabled: !!address } 
  });

  const { data: owner } = useReadContract({ address: marketAddress, abi: MARKET_MAKER_ABI, functionName: 'owner' });
  const isOwner = owner && address && owner.toLowerCase() === address.toLowerCase();

  const { data: currentLiquidity } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'getLiquidity',
    query: { refetchInterval: 5000 } 
  });

  const potSize = currentLiquidity ? Number(formatEther(currentLiquidity as bigint)) : 0;

  const { data: myYesBal, refetch: refetchYes } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'yesBalances', 
    args: [address as `0x${string}`], 
    query: { refetchInterval: 5000, enabled: !!address } 
  });
  
  const { data: myNoBal, refetch: refetchNo } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'noBalances', 
    args: [address as `0x${string}`], 
    query: { refetchInterval: 5000, enabled: !!address } 
  });

  const valYes = myYesBal ? Number(formatEther(myYesBal as bigint)) : 0;
  const valNo = myNoBal ? Number(formatEther(myNoBal as bigint)) : 0;
  const valUsdt = usdtBalance ? Number(formatEther(usdtBalance as bigint)) : 0;

  const { data: liveReserveYes } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'reserveYes', 
    query: { refetchInterval: 2000 } 
  });
  
  const { data: liveReserveNo } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'reserveNo', 
    query: { refetchInterval: 2000 } 
  });

  const liveYes = liveReserveYes ? Number(formatEther(liveReserveYes as bigint)) : 0;
  const liveNo = liveReserveNo ? Number(formatEther(liveReserveNo as bigint)) : 0;

  // --- ORACLE READS ---
  const { data: assertionId } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'assertionId', 
    query: { refetchInterval: 5000 } 
  });
  
  const { data: assertedOutcome } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'assertedOutcome', 
    query: { refetchInterval: 5000 } 
  });
  
  const { data: isDisputed } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'isDisputed', 
    query: { refetchInterval: 5000 } 
  });
  
  const { data: resolved } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'resolved', 
    query: { refetchInterval: 5000 } 
  });
  
  const { data: winningOutcome } = useReadContract({ 
    address: marketAddress, 
    abi: MARKET_MAKER_ABI, 
    functionName: 'winningOutcome', 
    query: { refetchInterval: 5000 } 
  });

  const { data: assertionData } = useReadContract({
      address: MOCK_ORACLE_ADDRESS as `0x${string}`,
      abi: MOCK_ORACLE_ABI,
      functionName: 'getAssertion',
      args: [assertionId || "0x0000000000000000000000000000000000000000000000000000000000000000"],
      query: { enabled: !!assertionId && assertionId !== "0x0000000000000000000000000000000000000000000000000000000000000000" }
  });

  const timeLeft = assertionData ? Number(assertionData.expirationTime) - Math.floor(Date.now()/1000) : 0;
  const assertionLinks = assertionData?.assertionLinks || [];

  // --- HELPERS ---
  const getMaxAmount = () => {
      if (tradeMode === 'BUY') return valUsdt;
      if (selectedSide === 'YES') return valYes;
      if (selectedSide === 'NO') return valNo;
      return Math.max(valYes, valNo);
  };
  
  const hasNoShares = valYes < 0.0001 && valNo < 0.0001;
  const isEmpty = (liveYes === 0 && liveNo === 0);
  const hasAssertion = assertionId && assertionId !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  // --- TAB SWITCHING ---
  useEffect(() => {
      if (tradeMode === 'BUY') {
          setBetAmount('1'); 
          setSliderValue(0);
      } else {
          setSliderValue(0); 
          setBetAmount('0');
      }
  }, [tradeMode]);

  // --- AUTO SELECT ---
  useEffect(() => {
      if (tradeMode === 'SELL') {
          if (!selectedSide) {
             if (valYes > 0.0001 && valNo < 0.0001) setSelectedSide('YES');
             else if (valNo > 0.0001 && valYes < 0.0001) setSelectedSide('NO');
          }

          const max = selectedSide === 'YES' ? valYes : (selectedSide === 'NO' ? valNo : Math.max(valYes, valNo));
          
          if (sliderValue > 0 && max > 0) {
              setBetAmount(((max * sliderValue) / 100).toFixed(2));
          } else if (sliderValue === 0) {
              setBetAmount('0.00');
          } else if (Number(betAmount) > max) {
              setBetAmount(max > 0 ? (Math.floor(max * 100) / 100).toFixed(2) : "0.00");
              setSliderValue(100);
          }
      }
  }, [selectedSide, tradeMode, valYes, valNo, sliderValue]);

  // --- DATA FETCHING ---
  const fetchMarketData = async () => {
    if (!GRAPHQL_URL) return;
    try {
        const safeId = marketAddress.toLowerCase();
        const res = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: `query { market(id: "${safeId}") { id question category deadline totalVolume totalYes totalNo resolved cancelled proposer proposedOutcome proposalTime isDisputed } }` 
            })
        });
        const json = await res.json();
        if (json.data?.market) {
            const m = json.data.market;
            const { category, question, image, optionA, optionB, rules } = parseQuestion(m.question);
            setMarket({
                address: m.id,
                question, category, image,
                optionA: (optionA || 'YES').toUpperCase(), 
                optionB: (optionB || 'NO').toUpperCase(), 
                rules, 
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
        const response = await fetch(GRAPHQL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query { pricePoints(where: { market: "${marketAddress.toLowerCase()}" }, orderBy: "timestamp", orderDirection: "asc") { items { timestamp yesPrice } } }` }) });
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
  const yesPct = market ? ((market.yes + market.no) > 0 ? market.no / (market.yes + market.no) : 0.6) : 0.6;
  const isApproved = allowance ? Number(formatEther(allowance as bigint)) >= Number(betAmount) : false;
  const isLiqApproved = allowance ? Number(formatEther(allowance as bigint)) >= Number(1000) : false; 

  const hasTokensToClaim = (Number(myYesBal || BigInt(0)) + Number(myNoBal || BigInt(0))) > 0;
  
  const isExpired = market ? Date.now() > (market.deadline * 1000) : false;

  // --- ADMIN HANDLERS ---
  const [isLiquidityPanelOpen, setIsLiquidityPanelOpen] = useState(false);
  const [liquidityAmount, setLiquidityAmount] = useState('1000');

  const handleApproveLiquidity = async () => {
    try {
        await toast.promise(
            writeApprove({ address: MOCK_USDT_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [marketAddress, parseEther(liquidityAmount)] }), 
            {
                loading: 'Approving USDT... 🔓',
                success: 'Approved!',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Approval Failed ❌'
            }
        );
        setTimeout(refetchAllowance, 2000); 
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  const handleAddLiquidity = async () => {
    try {
        await toast.promise(
            writeAddLiq({ address: marketAddress, abi: MARKET_MAKER_ABI, functionName: 'addLiquidity', args: [parseEther(liquidityAmount)] }), 
            {
                loading: 'Adding Liquidity... 💧',
                success: 'Liquidity Added! ⚡',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Failed to add liquidity ❌'
            }
        );
        setTimeout(fetchMarketData, 2000); 
        setIsLiquidityPanelOpen(false); 
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  // --- INPUT HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      val = val.replace(/[^0-9.]/g, ''); 
      if (val === '') { setBetAmount(''); setSliderValue(0); return; }
      
      let numVal = Number(val);
      const max = getMaxAmount();

      if (numVal > max) {
          numVal = Math.floor(max * 100) / 100; 
          val = numVal.toString();
      }
      
      setBetAmount(val);

      if (max > 0) setSliderValue(Math.min(100, Math.max(0, (numVal / max) * 100)));
      else setSliderValue(0);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value);
      setSliderValue(pct);
      
      if (tradeMode === 'BUY') {
          const stops = [1, 5, 25, 50];
          if (pct < 4) setBetAmount(stops[pct].toString());
          else setBetAmount(Math.max(0, valUsdt).toFixed(2));
      } else {
          const max = getMaxAmount();
          if (max > 0) setBetAmount(((max * pct) / 100).toFixed(2));
      }
  };

  const handleAddAmount = (val: number) => {
      const current = Number(betAmount) || 0;
      setBetAmount((current + val).toString());
  };

  // --- ESTIMATED RETURN ---
  const getEstimatedReturn = () => {
      if (!market || !betAmount || isNaN(Number(betAmount))) {
          return { shares: 0, cash: 0, pricePerShare: 0, priceImpact: 0 };
      }
      
      const amount = Number(betAmount);
      if (amount <= 0) return { shares: 0, cash: 0, pricePerShare: 0, priceImpact: 0 };

      // Prevent division by zero
      const currentYes = (liveYes > 0 ? liveYes : market.yes) || 1;
      const currentNo = (liveNo > 0 ? liveNo : market.no) || 1;

      if (tradeMode === 'BUY') {
          const reserveIn = selectedSide === 'YES' ? currentNo : currentYes;
          const reserveOut = selectedSide === 'YES' ? currentYes : currentNo;

          const amountIn = amount; 
          const swapShares = (amountIn * reserveOut) / (reserveIn + amountIn);
          const totalShares = amount + swapShares;

          const oldPrice = reserveIn / (reserveIn + reserveOut);
          const newReserveIn = reserveIn + amountIn;
          const newReserveOut = reserveOut - swapShares;
          const newPrice = newReserveIn / (newReserveIn + newReserveOut);
          
          const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;

          return { 
              shares: totalShares, 
              cash: 0, 
              pricePerShare: totalShares > 0 ? amount / totalShares : 0, 
              priceImpact 
          };

      } else {
          // SELL LOGIC
          const reserveIn = selectedSide === 'YES' ? currentYes : currentNo;
          const reserveOut = selectedSide === 'YES' ? currentNo : currentYes;

          const cash = (amount * reserveOut) / (reserveIn + reserveOut + amount);

          const oldPrice = reserveOut / (reserveIn + reserveOut);
          const newPrice = reserveOut / (reserveIn + amount + reserveOut);
          const priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
          
          return { 
              shares: 0, 
              cash, 
              pricePerShare: amount > 0 ? cash / amount : 0, 
              priceImpact 
          };
      }
  };
  const est = getEstimatedReturn();

  // --- ORACLE HANDLERS ---
  const handleLinkChange = (index: number, val: string) => {
      const newLinks = [...links];
      newLinks[index] = val;
      setLinks(newLinks);
  };
  const addLinkField = () => setLinks([...links, '']);

  const handleAssert = async (isYes: boolean) => {
    const validLinks = links.filter(l => l.length > 0);
    try {
        await toast.promise(
            writeBet({ address: marketAddress, abi: MARKET_MAKER_ABI, functionName: 'assertMarket', args: [isYes, validLinks] }), 
            {
                loading: 'Asserting Market... ⚖️',
                success: 'Assertion Started! 📢',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Assertion Failed ❌'
            }
        );
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  const handleDispute = async () => {
    const validLinks = links.filter(l => l.length > 0);
    if (validLinks.length === 0) return toast.error("1 Link Mandatory for Dispute");
    try {
        await toast.promise(
            writeBet({ address: marketAddress, abi: MARKET_MAKER_ABI, functionName: 'disputeMarket', args: [validLinks] }),
            {
                loading: 'Initiating Dispute... ⚔️',
                success: 'Dispute Started! Timer Stopped. 🛑',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Dispute Failed ❌'
            }
        );
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  const handleSettle = async () => {
    try {
        await toast.promise(
            writeBet({ address: marketAddress, abi: MARKET_MAKER_ABI, functionName: 'settle', args: [] }), 
            {
                loading: 'Settling Market... 🏁',
                success: 'Market Settled! ✅',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Settlement Failed ❌'
            }
        );
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  const handleTrade = async () => {
      if (Number(betAmount) < 1 && tradeMode === 'BUY') return toast.error("Minimum buy is $1");
      if (est.cash < 1 && tradeMode === 'SELL') return toast.error("Minimum sell value is $1");
      if(!selectedSide) return;

      const func = tradeMode === 'BUY' ? (selectedSide === 'YES' ? 'buyYes' : 'buyNo') : (selectedSide === 'YES' ? 'sellYes' : 'sellNo');
      
      try {
          await toast.promise(
              writeBet({ 
                  address: marketAddress, abi: MARKET_MAKER_ABI, functionName: func, args: [parseEther(betAmount)] 
              }), 
              { 
                  loading: tradeMode === 'BUY' ? 'Processing Buy... 🛒' : 'Processing Sell... 💸',
                  success: tradeMode === 'BUY' ? "Trade Successful! 🚀" : "Position Sold! 💰",
                  error: (err: any) => {
                      if (isUserRejection(err)) return "Transaction cancelled";
                      if (err.message?.includes("Low Liquidity")) return "Trade Failed: Low Liquidity 💧";
                      return "Trade Failed ❌";
                  }
              }
          );
          setBetAmount('');
          setSliderValue(0);
          setTimeout(() => { 
              fetchMarketData(); 
              fetchChart(); 
              refetchYes(); 
              refetchNo(); 
              fetchUserPosition(); 
          }, 2000); 
          setSelectedSide(null); 
      } catch(e: any) {
          if (!isUserRejection(e)) console.error(e);
      }
  };

  const handleClaim = async () => {
    try {
        await toast.promise(
            writeClaim({ address: marketAddress, abi: MARKET_MAKER_ABI, functionName: 'claim' }), 
            {
                loading: 'Claiming Winnings... 🏆',
                success: 'Funds Claimed! 💰',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Claim Failed ❌'
            }
        );
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  const handleApprove = async (amt: string) => { 
    try {
        await toast.promise(
            writeApprove({ address: MOCK_USDT_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [marketAddress, parseEther(amt)] }), 
            {
                loading: 'Approving USDT... 🔓',
                success: 'Approved! Ready to Trade. ✅',
                error: (err) => isUserRejection(err) ? 'Transaction cancelled' : 'Approval Failed ❌'
            }
        );
        setTimeout(refetchAllowance, 2000);
    } catch(e: any) {
        if (!isUserRejection(e)) console.error(e);
    }
  };

  if (!market) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-500 animate-pulse">Loading Market Data...</div>;

  const labelA = (market.optionA || 'YES').toUpperCase();
  const labelB = (market.optionB || 'NO').toUpperCase();
  const maxSellAmount = getMaxAmount();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col">
        <div className="max-w-3xl mx-auto w-full p-4 md:p-6 pb-32 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-white mb-6 inline-flex items-center gap-2 text-sm font-bold transition-colors">← Back</button>
            
            {isOwner && isEmpty && (
                <div className="mb-8 bg-slate-900 border border-indigo-500/30 rounded-2xl overflow-hidden">
                    <button onClick={() => setIsLiquidityPanelOpen(!isLiquidityPanelOpen)} className="w-full p-4 flex justify-between items-center bg-indigo-900/20 hover:bg-indigo-900/30"><span className="font-bold text-indigo-400">⚡ Admin Tools (⚠️ MARKET EMPTY)</span></button>
                    {isLiquidityPanelOpen && (<div className="p-6 border-t border-indigo-500/20 flex gap-4"><input type="number" value={liquidityAmount} onChange={e => setLiquidityAmount(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none" />{!isLiqApproved ? <button onClick={handleApproveLiquidity} disabled={isApproving} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl">{isApproving ? "..." : "1. Approve"}</button> : <button onClick={handleAddLiquidity} disabled={isAddingLiq} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl">{isAddingLiq ? "..." : "2. Add"}</button>}</div>)}
                </div>
            )}

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
                <div className="relative p-8 border-b border-slate-800 bg-slate-900/60 z-10 backdrop-blur-sm overflow-hidden">
                    {market.image && (<div className="absolute inset-0 z-0 opacity-20 pointer-events-none"><img src={market.image} className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }} /></div>)}
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className={`text-2xl md:text-3xl font-bold ${yesPct >= 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>{(yesPct * 100).toFixed(0)}% <span className="text-slate-400 text-sm font-normal">Chance of {labelA}</span></div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-slate-500 font-mono mb-2 mt-2"><span>Ends: {new Date(market.deadline * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span><span className="text-emerald-500 border border-emerald-900/30 bg-emerald-900/10 px-2 py-0.5 rounded w-fit">Vol: ${potSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                            {market.cancelled ? <div className="text-red-400 font-bold border border-red-900 bg-red-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">CANCELLED</div> 
                            : market.resolved ? <div className="text-slate-400 font-bold border border-slate-700 bg-slate-800 px-4 py-2 rounded-lg text-xs animate-pulse">RESOLVED</div> 
                            : market.isDisputed ? <div className="text-orange-400 font-bold border border-orange-900 bg-orange-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">DISPUTED</div> 
                            : isExpired ? (
                                hasAssertion ? <div className="text-blue-400 font-bold border border-blue-900 bg-blue-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">ASSERTED</div>
                                : <div className="text-amber-400 font-bold border border-amber-900 bg-amber-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">AWAITING ASSERTION</div>
                            )
                            : <div className="text-emerald-400 font-bold border border-emerald-900 bg-emerald-900/20 px-4 py-2 rounded-lg text-xs animate-pulse">LIVE MARKET</div>}
                        </div>

                    </div>
                    <h1 className="relative z-10 text-xl md:text-2xl font-bold text-white leading-tight mt-4">{market.question}</h1>
                </div>
                <div className="px-4 md:px-8 pt-4 pb-0 bg-slate-900/30 relative z-10"><WinningSideChart data={chartData} yesPrice={yesPct} /></div>

                {market.resolved ? (
                    <div className="p-8 bg-slate-950 border-t border-slate-800 text-center relative z-10"><div className="text-3xl mb-4">🏆</div><h3 className="text-white font-bold text-lg mb-2">Market Resolved</h3><p className="text-sm mb-6 text-slate-400">Winner: {winningOutcome?.toString() === "1" ? labelA : labelB}</p>{hasTokensToClaim && <button onClick={handleClaim} disabled={isClaiming} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl animate-pulse">💰 Claim Winnings</button>}</div>
                ) : isExpired ? (
                    <div className="p-8 bg-slate-950 border-t border-slate-800 relative z-10">
                        {hasAssertion ? (
                            <div className="text-center">
                                {isDisputed ? (
                                    <div className="p-6 border border-red-900/50 bg-red-900/10 rounded-2xl mb-4"><div className="text-4xl mb-2">⚖️</div><h3 className="text-red-400 font-bold text-lg">Dispute In Progress</h3><p className="text-sm text-slate-400 mt-2">The assertion was challenged. <br/>Admins are reviewing the evidence provided by both sides.</p></div>
                                ) : (
                                    <>
                                        <h3 className="text-white font-bold text-lg mb-2">Assertion Pending</h3>
                                        <p className="text-sm text-slate-400 mb-4">Outcome: <span className={`font-bold ${assertedOutcome?.toString() === "1" ? 'text-emerald-400' : 'text-rose-400'}`}>{assertedOutcome?.toString() === "1" ? labelA : labelB}</span></p>
                                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-2"><div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, (1 - (timeLeft / 7200)) * 100))}%` }}></div></div>
                                        <div className="flex justify-between text-xs text-slate-500 font-mono mb-6"><span>Challenge Period</span><span>{timeLeft > 0 ? `${Math.floor(timeLeft/60)}m left` : "Ended"}</span></div>
                                        <div className="text-left mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800"><p className="text-xs font-bold text-slate-500 uppercase mb-2">Evidence Provided:</p>{assertionLinks.length > 0 ? assertionLinks.map((l: any, i: number) => (<a key={i} href={l} target="_blank" className="block text-blue-400 text-xs hover:underline truncate mb-1">🔗 {l}</a>)) : <span className="text-xs text-slate-600">No links provided.</span>}</div>
                                        {timeLeft <= 0 ? <button onClick={handleSettle} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg">✅ Settle Market</button> : (
                                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><p className="text-xs text-slate-400 mb-2 font-bold">Disagree? Post Bond & Link to Dispute.</p>
                                                {links.map((link, i) => (<div key={i} className="flex gap-2 mb-2"><input type="url" value={link} onChange={(e) => handleLinkChange(i, e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white text-xs outline-none focus:border-red-500" />{i === links.length - 1 && <button onClick={addLinkField} className="px-3 bg-slate-800 rounded-lg text-slate-400 text-xs">+</button>}</div>))}
                                                <button onClick={handleDispute} className="w-full py-2 border border-red-500/50 text-red-400 hover:bg-red-950/30 font-bold rounded-lg text-sm mt-2">🚩 Dispute (50 Bond)</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="text-4xl mb-4">📢</div><h3 className="text-white font-bold text-lg mb-2">Assert Outcome</h3><p className="text-sm text-slate-400 mb-6">Market is closed. Bond 50 MUSD to assert the winner.</p>
                                <div className="text-left mb-4"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Evidence (Recommended)</label>{links.map((link, i) => (<div key={i} className="flex gap-2 mb-2"><input type="url" value={link} onChange={(e) => handleLinkChange(i, e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white text-xs outline-none focus:border-blue-500" />{i === links.length - 1 && <button onClick={addLinkField} className="px-3 bg-slate-800 rounded-lg text-slate-400 text-xs">+</button>}</div>))}</div>
                                <div className="flex gap-4"><button onClick={() => handleAssert(true)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl">Assert {labelA}</button><button onClick={() => handleAssert(false)} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl">Assert {labelB}</button></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative z-10">
                        <div className="flex border-t border-slate-800"><button onClick={() => setTradeMode('BUY')} className={`flex-1 py-4 font-bold text-sm tracking-wide ${tradeMode === 'BUY' ? 'bg-slate-900 text-white border-t-2 border-blue-500' : 'bg-slate-950 text-slate-500 hover:text-white'}`}>BUY</button><button onClick={() => setTradeMode('SELL')} className={`flex-1 py-4 font-bold text-sm tracking-wide ${tradeMode === 'SELL' ? 'bg-slate-900 text-white border-t-2 border-rose-500' : 'bg-slate-950 text-slate-500 hover:text-white'}`}>SELL</button></div>
                        <div className="p-4 md:p-8 grid md:grid-cols-2 gap-8 md:gap-12 bg-slate-950 border-t border-slate-800">
                            {tradeMode === 'BUY' ? (
                                <>
                                    <div className="space-y-4"><div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-wider"><span>Outcome</span><span>Price</span></div><div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-emerald-500/20"><span className="text-emerald-400 font-bold">{labelA}</span><span className="text-white">${yesPct.toFixed(2)}</span></div><div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-rose-500/20"><span className="text-rose-400 font-bold">{labelB}</span><span className="text-white">${(1 - yesPct).toFixed(2)}</span></div></div>
                                    <div className="space-y-4">
                                        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                        <input 
                                            type="number" 
                                            value={betAmount} 
                                            onChange={handleInputChange} 
                                            className="w-full bg-slate-900 border border-slate-700 pl-8 pr-4 py-4 rounded-xl text-xl font-bold text-white outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                        />
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[1, 25, 50, 100].map((val) => (
                                                <button key={val} onClick={() => handleAddAmount(val)} className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all border border-slate-700 hover:border-slate-500">+${val}</button>
                                            ))}
                                        </div>
                                        {!isConnected ? <div className="flex flex-col items-center justify-center py-4"><p className="text-slate-400 mb-4 text-sm">Connect wallet to trade</p><ConnectButton /></div> : <>
                                            {!isApproved ? <button onClick={() => handleApprove(betAmount)} disabled={isApproving} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/20">{isApproving ? "Unlocking..." : "🔓 Unlock Trading"}</button> : (
                                                <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><button onClick={() => setSelectedSide('YES')} className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${selectedSide === 'YES' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{labelA}</button><button onClick={() => setSelectedSide('NO')} className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${selectedSide === 'NO' ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{labelB}</button></div>
                                                
                                                {/* ESTIMATED RETURN DISPLAY */}
                                                {selectedSide && est.shares > 0 && (
                                                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-center space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-1">
                                                            <span>Estimated Output</span>
                                                            <span className={est.priceImpact > 5 ? "text-red-500 animate-pulse" : est.priceImpact > 2 ? "text-amber-400" : "text-emerald-500"}>
                                                                Slippage: {est.priceImpact.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Buying</span>
                                                            <span className="text-white font-mono font-bold">{est.shares.toFixed(2)} Shares</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Avg Price</span>
                                                            <span className="text-white font-mono">${est.pricePerShare.toFixed(2)}</span>
                                                        </div>
                                                        {est.priceImpact > 5 && (
                                                            <div className="mt-2 text-[10px] bg-red-900/20 border border-red-500/50 p-2 rounded text-red-200 font-bold flex items-center gap-2">
                                                                <span>⚠️</span>
                                                                <span>High Slippage! You are moving the price by {est.priceImpact.toFixed(0)}%. Consider a smaller trade.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {selectedSide && <><button onClick={handleTrade} disabled={isBetting} className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${selectedSide === 'YES' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}>{isBetting ? "Confirming..." : `CONFIRM ${selectedSide === 'YES' ? labelA : labelB}`}</button><div className="text-[10px] text-slate-500 text-center mt-1">By confirming, you agree to the <a href="https://polypulsebets.mintlify.app/user-guide/tos/Terms-of-Use" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">Terms of Service</a>.</div></>}</div>
                                            )}</>}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {hasNoShares ? (
                                        <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-10 bg-slate-900/50 rounded-xl border border-slate-800">
                                            <div className="text-4xl mb-3">👻</div>
                                            <h3 className="text-slate-300 font-bold mb-1">No Positions to Sell</h3>
                                            <p className="text-xs text-slate-500">You don't own any shares in this market yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-4">
                                                <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-wider"><span>Your Position</span><span>Shares</span></div>
                                                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-emerald-500/20"><span className="text-emerald-400 font-bold">{labelA} Shares</span><span className="text-white font-mono text-lg">{valYes.toFixed(2)}</span></div>
                                                <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl border border-rose-500/20"><span className="text-rose-400 font-bold">{labelB} Shares</span><span className="text-white font-mono text-lg">{valNo.toFixed(2)}</span></div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">SHARES</span>
                                                <input 
                                                    type="number" 
                                                    value={betAmount} 
                                                    onChange={handleInputChange} 
                                                    className="w-full bg-slate-900 border border-slate-700 pl-20 pr-4 py-4 rounded-xl text-xl font-bold text-white outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                                    placeholder="0.00" 
                                                />
                                                </div>
                                                <div className="px-1">
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        step="1" 
                                                        value={sliderValue} 
                                                        onChange={handleSliderChange} 
                                                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-rose-500 hover:accent-rose-400" 
                                                    />
                                                    <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-2 font-mono"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>MAX</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button onClick={() => setSelectedSide('YES')} className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${selectedSide === 'YES' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Sell {labelA}</button>
                                                    <button onClick={() => setSelectedSide('NO')} className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${selectedSide === 'NO' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Sell {labelB}</button>
                                                </div>
                                                
                                                {/* SELL OUTPUT DISPLAY */}
                                                {selectedSide && est.cash > 0 && (
                                                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-center space-y-2 animate-in fade-in slide-in-from-top-2 mt-2">
                                                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-1">
                                                            <span>Estimated Output</span>
                                                            <span className={est.priceImpact > 5 ? "text-red-500 animate-pulse" : est.priceImpact > 2 ? "text-amber-400" : "text-emerald-500"}>
                                                                Slippage: {est.priceImpact.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Selling</span>
                                                            <span className="text-white font-mono font-bold">{betAmount} Shares</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Cash Out</span>
                                                            <span className="text-emerald-400 font-mono font-bold text-lg">${est.cash.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                                            <span>Price / Share</span>
                                                            <span>${est.pricePerShare.toFixed(2)}</span>
                                                        </div>
                                                        {est.priceImpact > 5 && (
                                                            <div className="mt-2 text-[10px] bg-red-900/20 border border-red-500/50 p-2 rounded text-red-200 font-bold flex items-center gap-2">
                                                                <span>⚠️</span>
                                                                <span>High Slippage! You are moving the price by {est.priceImpact.toFixed(0)}%.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {selectedSide && <><button onClick={handleTrade} disabled={isBetting} className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg bg-rose-600 hover:bg-rose-500 transition-all active:scale-95 disabled:opacity-50">{isBetting ? "Selling..." : `CONFIRM SELL ${selectedSide}`}</button><div className="text-[10px] text-slate-500 text-center mt-1">By confirming, you agree to the <a href="https://polypulsebets.mintlify.app/user-guide/tos/Terms-of-Use" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">Terms of Service</a>.</div></>}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📜 Resolution Rules</h3>
                <div className={`text-slate-400 text-sm whitespace-pre-wrap leading-relaxed font-mono relative ${!isRulesExpanded ? 'max-h-[100px] overflow-hidden' : ''}`}>{market.rules || "No specific rules were provided for this market. Standard market resolution rules apply based on the outcome of the event."}{!isRulesExpanded && (<div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-slate-900 to-transparent"></div>)}</div>
                <button onClick={() => setIsRulesExpanded(!isRulesExpanded)} className="mt-3 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors">{isRulesExpanded ? "Show Less" : "Show More"} {isRulesExpanded ? "▲" : "▼"}</button>
            </div>
            <MarketDiscussion marketAddress={marketAddress} />
        </div>
    </div>
  );
}