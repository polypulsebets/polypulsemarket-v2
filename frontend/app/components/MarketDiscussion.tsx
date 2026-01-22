'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../supabaseClient'; 

type Comment = {
  id: number;
  user_address: string;
  text: string;
  created_at: string;
  side?: string;
  users?: {
      username: string;
  };
};

export function MarketDiscussion({ marketAddress }: { marketAddress: string }) {
  const { address } = useAccount();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select(`
            *,
            users ( username )
        `) 
        .eq('market_address', marketAddress) 
        .order('created_at', { ascending: false });

      if (data) setComments(data as any);
      setLoading(false);
    };

    fetchComments();

    const channel = supabase
      .channel('realtime comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        if (payload.new.market_address === marketAddress) {
            const { data: userData } = await supabase.from('users').select('username').eq('wallet_address', payload.new.user_address).single();
            
            const newComment: Comment = {
                ...payload.new as any,
                users: userData ? { username: userData.username } : undefined
            };
            
            setComments((prev) => [newComment, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketAddress]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || !address) return;

    const { error } = await supabase
      .from('comments')
      .insert([
        { 
          market_address: marketAddress, 
          user_address: address.toLowerCase(), 
          text: input,
          side: 'NEUTRAL' 
        }
      ]);

    if (!error) {
      setInput(''); 
    } else {
      console.error(error);
      alert("Failed to post comment");
    }
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            💬 Market Discussion <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">{comments.length}</span>
        </h3>

        {/* INPUT AREA */}
        <form onSubmit={handlePost} className="flex gap-4 mb-8">
            <div className="flex-1 relative">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    type="text" 
                    placeholder={address ? "What do you think?..." : "Connect wallet to chat"}
                    disabled={!address}
                    className="w-full bg-slate-950 border border-slate-700 p-4 pl-6 rounded-2xl text-white outline-none focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                />
                <div className="absolute right-2 top-2">
                    <button disabled={!input || !address} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-0 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-blue-900/20">
                        Post
                    </button>
                </div>
            </div>
        </form>

        {/* COMMENTS LIST */}
        <div className="space-y-3">
            {loading && <p className="text-slate-500 text-sm text-center py-4">Loading discussion...</p>}
            
            {!loading && comments.length === 0 && (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    <div className="text-2xl mb-2">💭</div>
                    <p className="text-sm">No comments yet. Be the first!</p>
                </div>
            )}

            {comments.map((c) => (
                <div key={c.id} className="flex gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800/30 transition-colors animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border bg-slate-800 border-slate-700 text-slate-400 shadow-sm">
                            {c.user_address.slice(2,4)}
                        </div>
                    </div>

                    {/* TEXT CONTENT */}
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col mb-1">
                                <span className={`text-sm font-bold ${c.user_address === address?.toLowerCase() ? 'text-blue-400' : 'text-white'}`}>
                                    {c.users?.username ? `@${c.users.username}` : `${c.user_address.slice(0,6)}...`}
                                </span>
                                {c.users?.username && (
                                    <span className="text-[10px] text-slate-600 font-mono">
                                        {c.user_address.slice(0,6)}...{c.user_address.slice(-4)}
                                    </span>
                                )}
                            </div>

                            <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        
                        <p className="text-slate-300 text-sm leading-relaxed mt-1">{c.text}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}