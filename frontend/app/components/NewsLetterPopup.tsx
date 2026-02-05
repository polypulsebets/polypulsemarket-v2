'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    // 1. Check if user has seen this before
    const hasSeen = localStorage.getItem('polypulse_newsletter_seen');
    
    if (!hasSeen) {
      // 2. Wait 5 seconds before showing (better UX)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Mark as seen so it doesn't show again
    localStorage.setItem('polypulse_newsletter_seen', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // We will build this API route in Step 2
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Failed');

      setHasSubmitted(true);
      toast.success("Welcome to the inner circle! 🚀");
      
      // Close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      toast.error("Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden group">
        
        {/* Cool Background Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

        {!hasSubmitted ? (
          <>
            <div className="text-4xl mb-4">📨</div>
            <h2 className="text-2xl font-bold text-white mb-2">Don't Miss the Alpha</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Join the PolyPulseBets list. Get monthly updates on the 
              <span className="text-emerald-400 font-bold"> Top 3 Hot Markets</span>, 
              <span className="text-rose-400 font-bold"> Biggest Upsets</span>, and 
              Testnet/Mainnet launch alerts.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input 
                type="email" 
                placeholder="you@polypulsebets.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Newsletter'}
              </button>
            </form>
            <p className="text-[10px] text-slate-600 mt-4 text-center">
              No spam. Unsubscribe anytime. We only send stats.
            </p>
          </>
        ) : (
          <div className="text-center py-8 animate-in zoom-in duration-300">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-white">You're in!</h3>
            <p className="text-slate-400 text-sm mt-2">Keep an eye on your inbox.</p>
          </div>
        )}
      </div>
    </div>
  );
}