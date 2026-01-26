'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

export default function SuggestPage() {
  const { address } = useAccount(); 
  
  const [topic, setTopic] = useState('Other');
  const [idea, setIdea] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea || !reason) return toast.error("Please fill in your idea and reasoning.");
    if (!address) return toast.error("Please connect your wallet first.");

    setStatus('sending');
    const toastId = toast.loading("Sending suggestion... 💡"); 

    try {
        // 1. Save to Supabase (For Leaderboard Points and Backup)
        const { error: dbError } = await supabase.from('suggestions').insert({
            user_address: address.toLowerCase(),
            topic: topic,
            idea: idea,
            reason: reason,
            expected_date: date
        });

        if (dbError) {
            console.error("DB Error:", dbError);
            throw new Error("Failed to save suggestion.");
        }

        // 2. Send Email Notification 
        await fetch("https://formsubmit.co/ajax/hello@polypulsebets.com", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `New PolyPulseBets Idea: ${topic}`,
                User: address,
                Topic: topic,
                Idea: idea,
                Expected_Date: date || 'Flexible',
                Reasoning: reason,
                _template: "table",
                _captcha: "false"
            })
        });

        // Success State
        setStatus('success');
        setIdea('');
        setDate('');
        setReason('');
        toast.success("Suggestion Sent! (+1 Point) 🚀", { id: toastId }); 

    } catch (error) {
        console.error(error);
        setStatus('error');
        toast.error("Failed to send. Please try again.", { id: toastId }); 
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col w-full">
      
      <div className="flex flex-1 items-center justify-center p-4 md:p-6 pb-32">
        <div className="max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">💡 Suggest a Market</h1>
                <p className="text-slate-400">Have a great idea? Earn <span className="text-yellow-400 font-bold">+1 Point</span> for every suggestion.</p>
            </div>

            <div className="p-6 md:p-8 rounded-3xl border shadow-2xl bg-slate-900 border-slate-800 border-dashed">
                {status === 'success' ? (
                    <div className="text-center py-10">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Suggestion Sent!</h3>
                        <p className="text-slate-400 mb-6">Thanks for contributing to PolyPulseBets.</p>
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
                                <option value="Sports">Sports</option>
                                <option value="Economy">Economy</option>
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