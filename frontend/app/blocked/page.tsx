'use client';

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 text-center font-sans">
      
      <div className="text-7xl mb-6 animate-pulse">🚫</div>
      
      <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
        Access Restricted
      </h1>
      
      <div className="max-w-lg mx-auto mb-8">
        <p className="text-slate-400 text-lg leading-relaxed mb-3">
          We are sorry, but we are not available in your jurisdiction due to local laws and regulatory restrictions.
        </p>
        <a 
          href="https://polypulsebets.mintlify.app/user-guide/faqs/Geographic-Restrictions" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 font-bold text-sm border-b border-blue-400/30 hover:border-blue-300 transition-all"
        >
          Read Official Policy ↗
        </a>
      </div>
      
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-500 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
          <span>Status</span>
          <span className="text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded">Blocked</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Reason</span>
          <span className="text-slate-300">Geographic Restriction</span>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-center">
          <p>If you believe this is an error, please contact compliance:</p>
          <a href="mailto:hello@polypulsebets.com" className="text-blue-500 hover:text-blue-400 font-bold mt-1 block transition-colors">
            hello@polypulsebets.com
          </a>
        </div>
      </div>
    </div>
  );
}