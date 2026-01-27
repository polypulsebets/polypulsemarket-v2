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

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

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
            setCurrentPage(1); // Reset to first page on new message
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

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(comments.length / ITEMS_PER_PAGE);
  const paginatedComments = comments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 overflow-hidden">
        
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

        {/* MESSAGES LIST (Chat Style) */}
        <div className="space-y-6">
            {loading && <p className="text-slate-500 text-xs text-center py-4">Loading...</p>}
            
            {!loading && comments.length === 0 && (
                <div className="text-center py-8 text-slate-500 bg-slate-950/30 rounded-xl">
                    <p className="text-sm">No comments yet.</p>
                </div>
            )}

            {paginatedComments.map((c) => {
                // Check if the comment belongs to the connected user
                const isOwn = address && c.user_address.toLowerCase() === address.toLowerCase();
                
                return (
                    <div key={c.id} className={`flex w-full gap-3 ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                        
                        {/* LEFT AVATAR (Others) */}
                        {!isOwn && (
                            <div className="flex-shrink-0 mt-auto">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border bg-slate-800 border-slate-700 text-slate-400 shadow-sm">
                                    {c.user_address.slice(2,4)}
                                </div>
                            </div>
                        )}

                        {/* MESSAGE CONTENT */}
                        <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            
                            {/* Metadata Row */}
                            <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <span className={`text-[10px] font-bold ${isOwn ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {c.users?.username ? `@${c.users.username}` : `${c.user_address.slice(0,6)}...`}
                                </span>
                                <span className="text-[9px] text-slate-600">
                                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {/* Speech Bubble */}
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                                isOwn 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                            }`}>
                                {c.text}
                            </div>
                        </div>

                        {/* RIGHT AVATAR (Self) */}
                        {isOwn && (
                            <div className="flex-shrink-0 mt-auto">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border bg-blue-900/30 border-blue-500/50 text-blue-400 shadow-sm">
                                    {c.user_address.slice(2,4)}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* PAGINATION CONTROLS */}
        {comments.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center mt-8 pt-2 px-2">
                <button 
                    onClick={handlePrev} 
                    disabled={currentPage === 1}
                    className="text-xs font-bold text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                >
                    ← Newer
                </button>
                
                <span className="text-[10px] font-mono text-slate-600">
                    {currentPage} / {totalPages}
                </span>

                <button 
                    onClick={handleNext} 
                    disabled={currentPage === totalPages}
                    className="text-xs font-bold text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                >
                    Older →
                </button>
            </div>
        )}
    </div>
  );
}