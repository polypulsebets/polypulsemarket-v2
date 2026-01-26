'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function UsernameManager({ onNameSet }: { onNameSet: (name: string) => void }) {
  const { address, isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkUser() {
      if (!isConnected || !address) return;
      const { data } = await supabase.from('users').select('username').eq('wallet_address', address.toLowerCase()).single();
      if (data) {
        onNameSet(data.username);
      } else {
        setIsOpen(true); 
      }
    }
    checkUser();
  }, [address, isConnected]);

  const handleSubmit = async () => {
    if (!username || username.length < 3) {
      setError("Min 3 chars");
      return;
    }
    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('users').insert([
        { wallet_address: address?.toLowerCase(), username: username }
    ]);

    if (insertError) {
      if (insertError.code === '23505') setError("Name taken");
      else setError("Error saving");
    } else {
      setIsOpen(false);
      onNameSet(username);
      toast.success(`Welcome @${username}!`); 
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <h2 className="text-xl font-bold text-white mb-2">Create Identity 🆔</h2>
        <p className="text-slate-400 text-sm mb-6">Pick a handle for the leaderboard.</p>
        
        <div className="space-y-4">
          <div>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="CryptoKing99" 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-bold text-lg placeholder:font-normal placeholder:text-slate-600"
              maxLength={15}
            />
            {error && <p className="text-red-400 text-xs mt-2 font-bold">{error}</p>}
          </div>
          
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? "Checking..." : "Set Username"}
          </button>
        </div>
      </div>
    </div>
  );
}