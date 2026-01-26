'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

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
        .select(`*, users ( username )`) 
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

    return () => { supabase.removeChannel(channel); };
  }, [marketAddress]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || !address) return;

    const { error } = await supabase.from('comments').insert([{ 
          market_address: marketAddress, 
          user_address: address.toLowerCase(), 
          text: input,
          side: 'NEUTRAL' 
    }]);

    if (!error) {
      setInput(''); 
      toast.success("Posted!"); 
    } else {
      console.error(error);
      toast.error("Failed to post"); 
    }
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

        <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-2">
            💬 Discussion <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">{comments.length}</span>
        </h3>

        {/* INPUT AREA */}
        <form onSubmit={handlePost} className="flex gap-4 mb-8">
            <div className="flex-1 relative">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    type="text" 
                    placeholder={address ? "Add a comment..." : "Connect to chat"}
                    disabled={!address}
                    className="w-full bg-slate-950 border border-slate-700 p-4 pl-4 pr-20 rounded-2xl text-white text-sm outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                />
                <div className="absolute right-2 top-2 bottom-2">
                    <button disabled={!input || !address} className="h-full bg-blue-600 hover:bg-blue-500 disabled:opacity-0 text-white font-bold px-4 rounded-xl text-xs transition-all shadow-lg">
                        Post
                    </button>
                </div>
            </div>
        </form>

        {/* COMMENTS LIST */}
        <div className="space-y-3">
            {loading && <p className="text-slate-500 text-xs text-center py-4">Loading...</p>}
            {!loading && comments.length === 0 && (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-sm">No comments yet.</p>
                </div>
            )}

            {comments.map((c) => (
                <div key={c.id} className="flex gap-3 p-3 md:p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
                    <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border bg-slate-800 border-slate-700 text-slate-400">
                            {c.user_address.slice(2,4)}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold truncate pr-2 ${c.user_address === address?.toLowerCase() ? 'text-blue-400' : 'text-white'}`}>
                                {c.users?.username ? `@${c.users.username}` : `${c.user_address.slice(0,6)}...`}
                            </span>
                            <span className="text-[9px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed break-words">{c.text}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}