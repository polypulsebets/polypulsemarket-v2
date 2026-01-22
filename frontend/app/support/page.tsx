'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ADMIN_WALLETS } from '../constants';
import { UsernameManager } from '../components/UsernameManager'; 

export default function SupportPage() {
  const { address, isConnected } = useAccount(); 
  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());

  // --- USERNAME STATE ---
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  
  // Image Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Reuse the Pinata Upload Logic
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (data.url) setImageUrl(data.url);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return alert("Please fill in the title and message.");

    setStatus('sending');

    try {
        const response = await fetch("https://formsubmit.co/ajax/hello@polypulsebets.com", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `⚠️ Support Ticket: ${title}`,
                Title: title,
                Message: message,
                Image_Attachment: imageUrl || "No Image Attached",
                _template: "table",
                _captcha: "false"
            })
        });

        if (response.ok) {
            setStatus('success');
            setTitle('');
            setMessage('');
            setImageUrl('');
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
                <h1 className="text-3xl font-bold text-white mb-2">🛠️ Support Center</h1>
                <p className="text-slate-400">Found a bug or need help? Let us know.</p>
            </div>

            <div className="p-8 rounded-3xl border shadow-2xl bg-slate-900 border-slate-800">
                {status === 'success' ? (
                    <div className="text-center py-10">
                        <div className="text-5xl mb-4">📨</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Message Received!</h3>
                        <p className="text-slate-400 mb-6">Our team will check your ticket shortly.</p>
                        <button onClick={() => setStatus('idle')} className="text-blue-500 hover:text-blue-400 font-bold">Open another ticket?</button>
                    </div>
                ) : (
                    <form onSubmit={handleSendSupport} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Issue Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="e.g. Cannot claim winnings" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Message</label>
                            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your problem in detail..." className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 h-32 resize-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Screenshot (Optional)</label>
                            {!imageUrl ? (
                                <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}`}>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    {uploading ? <div className="text-blue-400 font-bold animate-pulse">Uploading...</div> : <><div className="text-2xl mb-1">📷</div><p className="text-xs text-slate-400">Click to upload screenshot</p></>}
                                </div>
                            ) : (
                                <div className="relative group p-2 border border-slate-700 rounded-xl bg-slate-950">
                                    <img src={imageUrl} className="w-full h-32 object-contain rounded-lg" />
                                    <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-lg">✕</button>
                                </div>
                            )}
                        </div>

                        <button 
                            disabled={status === 'sending' || uploading}
                            className={`w-full py-4 font-bold rounded-xl border transition-all flex items-center justify-center gap-2 ${
                                (status === 'sending' || uploading)
                                ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-900/20'
                            }`}
                        >
                            {status === 'sending' ? "Sending..." : "Submit Ticket"}
                        </button>
                        
                        {status === 'error' && <p className="text-red-400 text-sm text-center">Failed to send. Try again later.</p>}
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