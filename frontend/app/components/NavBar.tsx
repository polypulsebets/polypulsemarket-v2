'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { ADMIN_WALLETS } from '../constants';
import { UsernameManager } from './UsernameManager';

// List of paths where Navbar should be hidden (e.g. Blocked page)
const HIDDEN_PATHS = ['/blocked']; 

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());
  const [myUsername, setMyUsername] = useState<string | null>(null);

  // Helper to check active link
  const isActive = (path: string) => pathname === path;

  // IF CURRENT PAGE IS IN HIDDEN LIST, RENDER NOTHING
  if (HIDDEN_PATHS.includes(pathname)) {
      return null;
  }

  return (
    <>
      {/* --- 1. GLOBAL LOGIC (Runs once) --- */}
      <UsernameManager onNameSet={setMyUsername} />

      {/* --- 2. DESKTOP TOP BAR (Hidden on Mobile) --- */}
      <nav className="hidden md:block border-b border-slate-800 bg-[#0F172A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center py-2">
            <img src="/logo.png" className="h-10 w-auto object-contain" alt="Logo" />
          </Link>
          
          <div className="flex gap-6 items-center">
            <Link href="/portfolio" className={`text-sm font-bold transition-colors ${isActive('/portfolio') ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Portfolio</Link>
            <Link href="/leaderboard" className={`text-sm font-bold transition-colors ${isActive('/leaderboard') ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Leaderboard</Link>
            <Link href="/support" className={`text-sm font-bold transition-colors ${isActive('/support') ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Support</Link>
            
            {isAdmin ? (
                <Link href="/create" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 transition-all">+ Create</Link>
            ) : (
                <Link href="/suggest" className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all">Suggest?</Link>
            )}

            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}></div>
                <span className="text-xs font-bold text-slate-300">
                    {isConnected ? (myUsername ? `@${myUsername}` : 'Loading...') : '@User'}
                </span>
            </div>

            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </nav>

      {/* --- 3. MOBILE TOP BAR (Logo + Connect Only) --- */}
      <nav className="md:hidden border-b border-slate-800 bg-[#0F172A] sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
         <Link href="/" className="flex items-center">
            <img src="/logo.png" className="h-8 w-auto object-contain" alt="Logo" />
         </Link>
         <div className="flex items-center gap-2">
            {/* Small User Badge for Mobile */}
            {isConnected && (
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-slate-300 max-w-[80px] truncate">
                        {myUsername ? `@${myUsername}` : '@User'}
                    </span>
                </div>
            )}
            <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
         </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-slate-800 z-50 pb-safe">
        <div className="grid grid-cols-4 h-16">
            <Link href="/" className={`flex flex-col items-center justify-center gap-1 ${isActive('/') ? 'text-blue-500' : 'text-slate-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                <span className="text-[10px] font-bold">Home</span>
            </Link>
            <Link href="/portfolio" className={`flex flex-col items-center justify-center gap-1 ${isActive('/portfolio') ? 'text-blue-500' : 'text-slate-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="text-[10px] font-bold">Portfolio</span>
            </Link>
            <Link href="/leaderboard" className={`flex flex-col items-center justify-center gap-1 ${isActive('/leaderboard') ? 'text-blue-500' : 'text-slate-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                <span className="text-[10px] font-bold">Rank</span>
            </Link>
            <Link href={isAdmin ? "/create" : "/suggest"} className={`flex flex-col items-center justify-center gap-1 ${isActive('/suggest') || isActive('/create') ? 'text-blue-500' : 'text-slate-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                <span className="text-[10px] font-bold">{isAdmin ? 'Create' : 'Suggest'}</span>
            </Link>
        </div>
      </nav>
    </>
  );
}