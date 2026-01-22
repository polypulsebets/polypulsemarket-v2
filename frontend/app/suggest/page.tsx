'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ADMIN_WALLETS } from '../constants';
import { UsernameManager } from '../components/UsernameManager'; 

export default function SuggestPage() {
  const { address, isConnected } = useAccount(); 
  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());

  // --- USERNAME STATE ---
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const [topic, setTopic] = useState('Crypto');
  const [idea, setIdea] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea || !reason) return alert("Please fill in your idea and reasoning.");

    setStatus('sending');

    try {
        const response = await fetch("https://formsubmit.co/ajax/hello@polypulsebets.com", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `New PolyPulse Idea: ${topic}`,
                Topic: topic,
                Idea: idea,
                Expected_Date: date || 'Flexible',
                Reasoning: reason,
                _template: "table",
                _captcha: "false"
            })
        });

        if (response.ok) {
            setStatus('success');
            setIdea('');
            setDate('');
            setReason('');
        } else {
            setStatus('error');
        }
    } catch (error) {
        console.error(error);
        setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col">
      <UsernameManager onNameSet={setMyUsername} />

      {/* NAVBAR */}
      <nav className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center py-2"><img src="/logo.png" className="h-9 w-auto object-contain" alt="PolyPulseBets Logo" /></Link>
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

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <Link href="/" className="text-slate-400 hover:text-white mb-6 inline-flex items-center gap-2 text-sm font-bold transition-colors">← Back</Link>
                <h1 className="text-3xl font-bold text-white mb-2">💡 Suggest a Market</h1>
                <p className="text-slate-400">Have a great idea? Send us a proposal directly.</p>
            </div>

            <div className="p-8 rounded-3xl border shadow-2xl bg-slate-900 border-slate-800 border-dashed">
                {status === 'success' ? (
                    <div className="text-center py-10">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Suggestion Sent!</h3>
                        <p className="text-slate-400 mb-6">Thanks for contributing to PolyPulse.</p>
                        <button onClick={() => setStatus('idle')} className="text-blue-500 hover:text-blue-400 font-bold">Send another?</button>
                    </div>
                ) : (
                    <form onSubmit={handleSuggest} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Topic</label>
                            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 appearance-none">
                                <option value="Crypto">Crypto</option>
                                <option value="Politics">Politics</option>
                                <option value="Tech">Tech</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Market Idea</label>
                            <input value={idea} onChange={(e) => setIdea(e.target.value)} type="text" placeholder="e.g. Who wins the Super Bowl?" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Expected Date</label>
                            <input value={date} onChange={(e) => setDate(e.target.value)} type="text" placeholder="e.g. Next Month" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Why?</label>
                            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this market would be popular..." className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-32 resize-none" />
                        </div>

                        <button 
                            disabled={status === 'sending'}
                            className={`w-full py-4 font-bold rounded-xl border transition-all flex items-center justify-center gap-2 ${
                                status === 'sending' 
                                ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-900/20'
                            }`}
                        >
                            {status === 'sending' ? (
                                <><span>⏳</span> Sending...</>
                            ) : (
                                <><span>🚀</span> Submit Suggestion</>
                            )}
                        </button>
                        
                        {status === 'error' && (
                            <p className="text-red-400 text-sm text-center">Something went wrong. Please try again.</p>
                        )}
                    </form>
                )}
                <div className="text-center mt-6 text-slate-500 text-xs">
                Having trouble? You can also email us directly at <br/>
                <span className="text-blue-500 font-bold">hello@polypulsebets.com</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}