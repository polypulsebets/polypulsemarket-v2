'use client';

import { useState, useEffect } from 'react';

export function LegalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const accepted = localStorage.getItem('hasAcceptedTerms_v1_full'); 
    if (!accepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('hasAcceptedTerms_v1_full', 'true');
    setIsOpen(false);
  };

  if (!hasMounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        
        <div className="text-center mb-4 flex-shrink-0">
          <div className="text-4xl md:text-5xl mb-2">📜</div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Protocol Terms of Use</h2>
          <p className="text-slate-400 text-xs md:text-sm">Please read before proceeding.</p>
        </div>

        {/* Scrollable Content Area */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mb-4 text-xs text-slate-300 overflow-y-auto custom-scrollbar flex-grow space-y-4 text-left leading-relaxed shadow-inner">
          
          <div>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">1. Introduction & No Legal Entity</h3>
            <p>
              These Terms constitute a binding agreement between you and the developers of the <strong>PolyPulseBets</strong> protocol. The Protocol is <strong>experimental software</strong> provided "AS IS".
            </p>
          </div>

          <div className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg">
            <h3 className="text-red-400 font-bold text-xs mb-1 uppercase flex items-center gap-2">
              <span>🚫</span> 2. Restricted Jurisdictions
            </h3>
            <p className="mb-1">
              <strong>STRICTLY PROHIBITED</strong> for residents of:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-200 font-semibold">
              <li>USA, UK, France, Ontario (Canada)</li>
              <li>Singapore, Australia, Sanctioned Nations</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">3. Risks</h3>
            <p>
              Prediction markets are speculative. <strong>YOU MAY LOSE 100% OF FUNDS.</strong> We do not have custody of funds.
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">4. Governance</h3>
            <p>
              Outcomes are determined by the UMA Optimistic Oracle. <strong>Class Action Waiver:</strong> You waive rights to class actions.
            </p>
          </div>

        </div>

        <div className="space-y-3 flex-shrink-0">
          <button 
            onClick={handleAccept}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
          >
            I Agree & Enter
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <a 
               href="https://polypulsebets.mintlify.app/user-guide/tos/Terms-of-Use" 
               target="_blank" 
               rel="noopener noreferrer"
               className="block w-full py-3 text-center bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-700"
             >
               Read Docs ↗
             </a>
             <a 
               href="https://google.com" 
               className="block w-full py-3 text-center bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 font-bold text-xs rounded-xl transition-all border border-slate-700"
             >
               Exit
             </a>
          </div>
        </div>

      </div>
    </div>
  );
}