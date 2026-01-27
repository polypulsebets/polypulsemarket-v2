'use client';

import { useState, useEffect } from 'react';

export function LegalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Versioning the key ensures users must re-accept if terms change significantly
    const accepted = localStorage.getItem('hasAcceptedTerms_v1_full'); 
    if (!accepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('hasAcceptedTerms_v1_full', 'true');
    setIsOpen(false);
  };

  // Prevent SSR hydration mismatch
  if (!hasMounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="text-center mb-4 flex-shrink-0">
          <div className="text-4xl md:text-5xl mb-2">📜</div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Protocol Terms of Use</h2>
          <p className="text-slate-400 text-xs md:text-sm">Please read and accept to proceed.</p>
        </div>

        {/* Scrollable Legal Content Area */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mb-4 text-xs text-slate-300 overflow-y-auto custom-scrollbar flex-grow space-y-6 text-left leading-relaxed shadow-inner">
          
          <section>
            <h3 className="text-white font-bold text-sm mb-2 uppercase border-b border-slate-800 pb-1">Introduction</h3>
            <p className="mb-2"><strong>Last Updated: January 22, 2026</strong></p>
            <p>
              PolyPulseBets is a decentralized, open-source protocol. It is <strong>not</strong> operated by a registered business entity. It is developed and deployed by independent, pseudonymous developers. By accessing the Protocol, you agree to these Terms.
            </p>
          </section>

          <section className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg">
            <h3 className="text-red-400 font-bold text-xs mb-2 uppercase flex items-center gap-2">
              <span>🚫</span> 1. Restricted Jurisdictions
            </h3>
            <p className="mb-2 text-slate-200">
              Use of the Protocol is <strong>STRICTLY PROHIBITED</strong> for residents/citizens of:
            </p>
            <ul className="grid grid-cols-2 gap-1 list-disc pl-4 text-slate-200 font-semibold">
              <li>USA & UK</li>
              <li>France</li>
              <li>Ontario (CA)</li>
              <li>Singapore</li>
              <li>Poland</li>
              <li>Thailand</li>
              <li>Australia</li>
              <li>Belgium</li>
              <li>Taiwan</li>
              <li>Sanctioned Nations</li>
            </ul>
            <p className="mt-2 text-[10px] text-red-400/80 italic font-medium">
              Use of a VPN to circumvent these restrictions is strictly prohibited.
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">2. "AS-IS" Nature & Non-Custodial</h3>
            <p>
              The Protocol is <strong>experimental software</strong>. Developers <strong>do not</strong> have custody of your funds. We cannot reverse transactions or recover lost keys. The Site and Protocol are provided "AS IS" without warranties of any kind.
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">3. Risks & Sophistication</h3>
            <p>
              Prediction markets are speculative. <strong>YOU MAY LOSE 100% OF FUNDS.</strong> You represent that you have sufficient knowledge of PulseChain and smart contracts to understand these risks.
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">4. Oracle Resolution & "The Judge"</h3>
            <p>
              Outcomes are determined by the <strong>Optimistic Oracle</strong>. You explicitly waive any right to pursue legal action or claims against any specific Judge, Oracle, or Arbitrator. Errors in judgment are part of the game mechanics.
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold text-xs mb-1 uppercase border-b border-slate-800 pb-1">5. Liability & Class Action Waiver</h3>
            <p>
              Maximum liability of developers is limited to <strong>$100 USD</strong>. You agree that any dispute shall be resolved on an individual basis, and you <strong>waive your right to participate in a class action lawsuit.</strong>
            </p>
          </section>

          <p className="text-center text-slate-500 py-2 border-t border-slate-800">
            Contact: hello@polypulsebets.com
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 flex-shrink-0">
          <button 
            onClick={handleAccept}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] text-sm md:text-base"
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
               Full Legal Docs ↗
             </a>
             <a 
               href="https://google.com" 
               className="block w-full py-3 text-center bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 font-bold text-xs rounded-xl transition-all border border-slate-700"
             >
               Decline & Exit
             </a>
          </div>
        </div>

      </div>
    </div>
  );
}