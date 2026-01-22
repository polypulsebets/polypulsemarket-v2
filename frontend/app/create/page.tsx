'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useRef, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract } from 'wagmi';
import Link from 'next/link';
import { FACTORY_ADDRESS, FACTORY_ABI, ADMIN_WALLETS } from '../constants';
import { UsernameManager } from '../components/UsernameManager'; 

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const isWalletAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());

  // --- USERNAME STATE ---
  const [myUsername, setMyUsername] = useState<string | null>(null);

  // 1. Check Admin Status On-Chain
  const { data: isAdmin, isLoading: checkingAdmin } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'admins',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  // Form State
  const [question, setQuestion] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Other');
  
  // --- NEW: CUSTOM OUTCOMES STATE ---
  const [isCustom, setIsCustom] = useState(false);
  const [outcomeA, setOutcomeA] = useState('');
  const [outcomeB, setOutcomeB] = useState('');
  
  // Image Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { writeContract, isPending } = useWriteContract();

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
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !date) return alert("Please fill all fields");
    if (isCustom && (!outcomeA || !outcomeB)) return alert("Please name both outcomes.");

    const durationSeconds = Math.floor((new Date(date).getTime() - Date.now()) / 1000);
    
    // --- PACK DATA (V2 Format) ---
    // Format: "Category~Question~Image~OptionA~OptionB"
    const finalA = isCustom ? outcomeA : 'YES';
    const finalB = isCustom ? outcomeB : 'NO';
    
    // We use ~ as separator. Make sure inputs don't contain it.
    const cleanQuestion = question.replace(/~/g, "-");
    const cleanA = finalA.replace(/~/g, "-");
    const cleanB = finalB.replace(/~/g, "-");

    const finalString = `${category}~${cleanQuestion}~${imageUrl || ''}~${cleanA}~${cleanB}`;
    
    const dummyId = "0x0000000000000000000000000000000000000000000000000000000000000000";

    writeContract({ 
        address: FACTORY_ADDRESS as `0x${string}`, 
        abi: FACTORY_ABI, 
        functionName: 'createMarket', 
        args: [finalString, dummyId, BigInt(durationSeconds)], 
    }, {
        onSuccess: () => { alert("Market Created Successfully!"); window.location.href = "/"; }
    });
  };

  const isDenied = !checkingAdmin && isAdmin === false;

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
             {isWalletAdmin ? (
                <Link href="/create" className="hidden md:block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 transition-all">+ Create</Link>
            ) : (
                <Link href="/suggest" className="hidden md:block bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all">Suggest?</Link>
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

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <Link href="/" className="text-slate-400 hover:text-white mb-6 inline-flex items-center gap-2 text-sm font-bold transition-colors">← Back</Link>
                <h1 className="text-3xl font-bold text-white mb-2">🚀 Launch a Market</h1>
            </div>

            {!isConnected ? (
                <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 text-center shadow-2xl">
                    <div className="text-4xl mb-4">🔐</div>
                    <p className="text-slate-400 mb-6">Connect your wallet to verify admin permissions.</p>
                    <div className="flex justify-center"><ConnectButton /></div>
                </div>
            ) : isDenied ? (
                <div className="bg-slate-900 p-10 rounded-3xl border border-red-900/30 text-center shadow-2xl">
                    <div className="text-4xl mb-4">🚫</div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-2">Your wallet is not an admin.</p>
                    <p className="text-xs text-slate-600 font-mono mb-6">{address}</p>
                    <Link href="/suggest" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all">Go to Suggestions</Link>
                </div>
            ) : (
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
                    {checkingAdmin && (
                        <div className="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center backdrop-blur-sm rounded-3xl">
                            <div className="text-blue-400 font-bold animate-pulse">Verifying Admin Status...</div>
                        </div>
                    )}
                    
                    <form onSubmit={handleCreate} className="space-y-6">
                        
                         {/* TOP ROW: Category & Deadline */}
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500 appearance-none text-sm font-bold">
                                    <option value="Crypto">Crypto</option>
                                    <option value="Politics">Politics</option>
                                    <option value="Tech">Tech</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Deadline</label>
                                <input value={date} onChange={(e) => setDate(e.target.value)} type="datetime-local" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500 text-sm font-bold" />
                            </div>
                        </div>

                        {/* QUESTION INPUT */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Question</label>
                            <input value={question} onChange={(e) => setQuestion(e.target.value)} type="text" placeholder="e.g. Will BTC hit $100k?" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 font-bold" />
                        </div>

                        {/* --- CUSTOM OUTCOMES TOGGLE --- */}
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-1">
                                <div>
                                    <label className="text-sm font-bold text-white block">Custom Outcomes</label>
                                    <p className="text-xs text-slate-500">Change "YES/NO" to custom names.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            
                            {isCustom && (
                                <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-[10px] text-emerald-500 font-bold mb-1 block uppercase tracking-wide">Outcome A (Replaces YES)</label>
                                        <input value={outcomeA} onChange={(e) => setOutcomeA(e.target.value)} type="text" placeholder="e.g. Trump" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white text-sm focus:border-emerald-500/50 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-rose-500 font-bold mb-1 block uppercase tracking-wide">Outcome B (Replaces NO)</label>
                                        <input value={outcomeB} onChange={(e) => setOutcomeB(e.target.value)} type="text" placeholder="e.g. Harris" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white text-sm focus:border-rose-500/50 outline-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* IMAGE UPLOAD */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Market Image (Optional)</label>
                            {!imageUrl ? (
                                <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${uploading ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}`}>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                    {uploading ? <div className="text-blue-400 font-bold animate-pulse">Uploading to IPFS...</div> : <><div className="text-3xl mb-2">🖼️</div><p className="text-sm text-slate-400">Click to upload image</p></>}
                                </div>
                            ) : (
                                <div className="relative group"><img src={imageUrl} className="w-full h-48 object-cover rounded-xl border border-slate-700" /><button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg text-xs font-bold shadow-lg">Remove</button></div>
                            )}
                        </div>

                        <button disabled={isPending || uploading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]">{isPending ? "Deploying..." : "Launch On-Chain"}</button>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}