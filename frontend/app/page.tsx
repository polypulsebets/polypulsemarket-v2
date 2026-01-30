'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import Link from 'next/link';
import { Market, parseQuestion, FeedMarketCard } from './components';

type SortOption = 'NEWEST' | 'ENDING' | 'VOLUME' | 'CONTROVERSIAL';
const ITEMS_PER_PAGE = 12;

export default function Home() {
  const { address } = useAccount();

  // --- FEED STATE ---
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showExpired, setShowExpired] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);

  // --- MODALS ---
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showRampModal, setShowRampModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // --- DATA FETCHING ---
  const fetchIndexerData = async () => {
    const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || "";
    if (!GRAPHQL_URL) return;

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { markets(orderBy: "createdTimestamp", orderDirection: "desc") { items { id question category deadline totalVolume totalYes totalNo resolved cancelled } } }`
        }),
      });
      const json = await response.json();
      if (json.data?.markets?.items) {
          const loadedMarkets = json.data.markets.items.map((m: any) => {
            const { category, question, image, optionA, optionB } = parseQuestion(m.question);
            return {
                address: m.id,
                question, category, image, optionA, optionB,
                deadline: Number(m.deadline),
                volume: Number(formatEther(BigInt(m.totalVolume))),
                yes: Number(formatEther(BigInt(m.totalYes))),
                no: Number(formatEther(BigInt(m.totalNo))),
                resolved: m.resolved, 
                cancelled: m.cancelled,
            };
          });
          setMarkets(loadedMarkets);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
      fetchIndexerData(); 
      const i = setInterval(fetchIndexerData, 5000); 
      return () => clearInterval(i); 
  }, []);

  useEffect(() => { setCurrentPage(1); }, [search, activeCategory, showExpired, sortBy]);

  // --- FILTERING ---
  const filteredMarkets = markets
    .filter(m => {
        const matchesSearch = m.question.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'All' || m.category === activeCategory;
        const isExpired = Date.now() > m.deadline * 1000;
        if (!showExpired && (isExpired || m.resolved || m.cancelled)) return false;
        return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
        switch (sortBy) {
            case 'ENDING': return a.deadline - b.deadline;
            case 'VOLUME': return b.volume - a.volume;
            case 'CONTROVERSIAL':
                const aTotal = a.yes + a.no || 1;
                const bTotal = b.yes + b.no || 1;
                const aSplit = Math.abs((a.yes / aTotal) - 0.5);
                const bSplit = Math.abs((b.yes / bTotal) - 0.5);
                return aSplit - bSplit; 
            case 'NEWEST': default: return 0; 
        }
    });

  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-[#0F172A] flex justify-center w-full h-full"> 
        <div className="flex flex-1 max-w-7xl w-full h-full md:h-[calc(100vh-64px)] overflow-hidden flex-col md:flex-row">
            
            <aside className="hidden md:flex flex-col w-64 py-8 border-r border-slate-800 pr-6 shrink-0 h-full overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Topics</h3>
                <div className="space-y-1 mb-8">
                    {['All', 'Crypto', 'Politics', 'Tech', 'Sports', 'Economy', 'Other'].map(cat => ( 
                        <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)} 
                            className={`w-full text-left px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${activeCategory === cat ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
                        >
                            {cat}
                        </button> 
                    ))}
                </div>

                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">History</h3>
                <label className="flex items-center gap-3 px-4 py-2 cursor-pointer group mb-6">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showExpired ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'}`}>
                        {showExpired && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} className="hidden" />
                    <span className={`text-sm font-medium transition-colors ${showExpired ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>Show Expired</span>
                </label>

                <div className="mt-8 pt-8 border-t border-slate-800 px-4 space-y-3">
                    <button onClick={() => setShowSwapModal(true)} className="flex items-center gap-2 text-slate-300 text-xs hover:text-white w-full p-2 bg-slate-800 rounded-lg border border-slate-700 font-bold justify-center transition-all">🔄 Get Funds (Swap)</button>
                    <button onClick={() => setShowRampModal(true)} className="flex items-center gap-2 text-slate-300 text-xs hover:text-white w-full p-2 bg-slate-800 rounded-lg border border-slate-700 font-bold justify-center transition-all">💳 Buy Crypto</button>
                    <button onClick={() => setShowDocsModal(true)} className="flex items-center gap-2 text-slate-300 text-xs hover:text-white w-full p-2 bg-slate-800 rounded-lg border border-slate-700 font-bold justify-center transition-all">📚 Read Documentation</button>
                </div>

                <div className="mt-auto px-4 pt-6 border-t border-slate-800">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Community</h4>
                    <div className="flex flex-wrap gap-2">
                        <a href="https://x.com/polypulsebets" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                        <a href="https://discord.gg/n4pZ4ynSdp" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg></a>
                        <a href="https://www.instagram.com/polypulsebets/" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.948-.2-4.354-2.618-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
                        <a href="https://www.tiktok.com/@polypulsebets" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0 7.7 7.74V10.2a9.66 9.66 0 0 0 6 .66v3.17Z"/></svg></a>
                        <a href="https://github.com/polypulsebets?tab=repositories" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg></a>
                        <a href="https://www.youtube.com/@PolyPulseBets" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/></svg></a>
                        <a href="https://t.me/@polypulsebets" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg></a>
                        <a href="https://linktr.ee/polypulsebets" target="_blank" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13.736 5.853L10.26 2.377 6.784 5.853h6.952zM10.26 8.79L13.422 11.953h-2.22l2.67 2.67H10.26v2.54h3.61v2.85h-3.61v3.61h-2.85v-3.61H3.8v-2.85h3.61v-2.54H3.8l2.67-2.67H4.25l3.162-3.163 2.848 2.849z"/></svg></a>
                    </div>
                </div>
            </aside>

            {/* --- MAIN FEED CONTENT --- */}
            <main className="flex-1 flex flex-col w-full overflow-hidden">
                
                {/* Header Area */}
                <div className="p-4 md:p-8 pb-0">
                    
                    {/* Banner */}
                    <div className="relative mb-6 md:mb-8 p-6 md:p-8 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 relative group shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-blue-600/20 blur-3xl opacity-50"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-3xl md:text-4xl animate-bounce">🔥</span>
                                <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">{activeCategory === 'All' ? 'All Markets' : `${activeCategory} Markets`}</h2>
                            </div>
                            <div className="hidden md:flex gap-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm shadow-inner">
                                <div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Markets</div><div className="text-white font-mono font-bold text-2xl">{markets.length}</div></div>
                                <div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</div><div className="text-emerald-400 font-mono font-bold text-2xl flex items-center justify-end gap-2"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>LIVE</div></div>
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                        {['All', 'Crypto', 'Politics', 'Tech', 'Sports', 'Economy', 'Other'].map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-colors ${activeCategory === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Search & Sort */}
                    <div className="flex flex-col md:flex-row gap-4 mb-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                            <input 
                                type="text" 
                                placeholder="Search markets..." 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)} 
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-all" 
                            />
                        </div>
                        <div className="flex gap-2">
                            {/* Mobile Toggle for Expired */}
                            <button 
                                onClick={() => setShowExpired(!showExpired)}
                                className={`md:hidden px-4 rounded-2xl border font-bold text-xl flex items-center justify-center ${showExpired ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                            >
                                History
                            </button>

                            <div className="relative min-w-[160px] flex-1 md:flex-none">
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="w-full h-full appearance-none bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold cursor-pointer outline-none focus:border-blue-500 hover:bg-slate-800 transition-all"
                                >
                                    <option value="NEWEST">✨ Newest</option>
                                    <option value="ENDING">⏳ Ending</option>
                                    <option value="VOLUME">💰 Volume</option>
                                    <option value="CONTROVERSIAL">🌶️ Hot</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden grid grid-cols-3 gap-2 mt-2 mb-4">
                        <button onClick={() => setShowSwapModal(true)} className="py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs font-bold text-blue-400 border border-slate-800">🔄 Swap</button>
                        <button onClick={() => setShowRampModal(true)} className="py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs font-bold text-emerald-400 border border-slate-800">💳 Buy</button>
                        <button onClick={() => setShowDocsModal(true)} className="py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 border border-slate-800">📚 Docs</button>
                    </div>
                </div>

                {/* Market Grid (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 pb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {paginatedMarkets.length === 0 ? (
                            <div className="col-span-1 md:col-span-3 text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                {markets.length === 0 ? "Syncing with Blockchain..." : "No markets found matching filters."}
                            </div>
                        ) : (
                            paginatedMarkets.map(m => ( 
                                <Link href={`/market/${m.address}`} key={m.address} className="block h-full">
                                    <FeedMarketCard market={m} onClick={() => {}} /> 
                                </Link>
                            ))
                        )}
                    </div>

                    <div className="md:hidden mt-8 border-t border-slate-800 pt-6">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">Community</h4>
                        <div className="flex justify-center flex-wrap gap-3">
                            <a href="https://x.com/polypulsebets" target="_blank" className="p-3 bg-slate-900 rounded-xl text-slate-400 border border-slate-800"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                            <a href="https://discord.gg/n4pZ4ynSdp" target="_blank" className="p-3 bg-slate-900 rounded-xl text-slate-400 border border-slate-800"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg></a>
                            <a href="https://www.instagram.com/polypulsebets/" target="_blank" className="p-3 bg-slate-900 rounded-xl text-slate-400 border border-slate-800"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.948-.2-4.354-2.618-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
                            <a href="https://www.tiktok.com/@polypulsebets" target="_blank" className="p-3 bg-slate-900 rounded-xl text-slate-400 border border-slate-800"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0 7.7 7.74V10.2a9.66 9.66 0 0 0 6 .66v3.17Z"/></svg></a>
                            <a href="https://github.com/polypulsebets?tab=repositories" target="_blank" className="p-3 bg-slate-900 rounded-xl text-slate-400 border border-slate-800"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg></a>
                            <a href="https://linktr.ee/polypulsebets" target="_blank" className="p-3 bg-slate-900 rounded-xl text-slate-400 border border-slate-800"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13.736 5.853L10.26 2.377 6.784 5.853h6.952zM10.26 8.79L13.422 11.953h-2.22l2.67 2.67H10.26v2.54h3.61v2.85h-3.61v3.61h-2.85v-3.61H3.8v-2.85h3.61v-2.54H3.8l2.67-2.67H4.25l3.162-3.163 2.848 2.849z"/></svg></a>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-10">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-slate-800 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                            >
                                ← Prev
                            </button>
                            <span className="text-sm text-slate-400 font-bold bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-slate-800 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>

      {/* --- MODALS (Shared) --- */}
      {showSwapModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative text-center">
                <button onClick={() => setShowSwapModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-2">✕</button>
                <div className="text-5xl mb-4">🔄</div>
                <h2 className="text-2xl font-bold text-white mb-2">Get Funds</h2>
                <p className="text-slate-400 mb-6">Swap your PLS for other tokens on PulseX.</p>
                <a href="https://app.pulsex.com/swap" target="_blank" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 mb-3 transition-all">Go to PulseX</a>
                <p className="text-xs text-slate-600">You are leaving PolyPulseBets</p>
            </div>
        </div>
      )}

      {showDocsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative text-center">
                <button onClick={() => setShowDocsModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-2">✕</button>
                <div className="text-5xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-white mb-2">Documentation</h2>
                <p className="text-slate-400 mb-6">Learn how to trade, deposit, and resolve markets.</p>
                <a href="/docs" target="_blank" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 mb-3 transition-all">Go to Docs</a>
                <p className="text-xs text-slate-600">You are leaving PolyPulseBets</p>
            </div>
        </div>
      )}

      {showRampModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative text-center">
                <button onClick={() => setShowRampModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-2">✕</button>
                <div className="text-5xl mb-4">💳</div>
                <h2 className="text-2xl font-bold text-white mb-2">Buy Crypto</h2>
                <p className="text-slate-400 mb-6">Choose a provider to buy crypto with your card.</p>
                <div className="space-y-3">
                    <a href="https://0xcoast.com/" target="_blank" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all">0xCoast</a>
                    <a href="https://internetmoney.io/" target="_blank" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all">Internet Money</a>
                </div>
                <p className="text-xs text-slate-600 mt-4">These are third-party services.</p>
            </div>
        </div>
      )}
    </div>
  );
}