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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh]">
        <div className="text-center mb-6 flex-shrink-0">
          <div className="text-5xl mb-4">📜</div>
          <h2 className="text-2xl font-bold text-white mb-2">Protocol Terms of Use</h2>
          <p className="text-slate-400 text-sm">Please read the full agreement before proceeding.</p>
        </div>

        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 mb-6 text-xs text-slate-300 overflow-y-auto custom-scrollbar flex-grow space-y-6 text-left leading-relaxed shadow-inner">
          
          {/* Section 1: Introduction */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2 uppercase border-b border-slate-800 pb-1">1. Introduction & No Legal Entity</h3>
            <p className="mb-2">
              These Terms constitute a binding agreement between you and the developers of the <strong>PolyPulseBets</strong> protocol ("The Protocol"). 
            </p>
            <p>
              The Protocol is <strong>experimental, open-source software</strong> running on the PulseChain blockchain. It is <strong>NOT</strong> a registered company, bank, or investment firm. It is developed and deployed by independent, pseudonymous developers. The Protocol is provided <strong>"AS IS"</strong> without warranty of any kind.
            </p>
          </div>

          {/* Section 2: Restricted Jurisdictions */}
          <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg">
            <h3 className="text-red-400 font-bold text-sm mb-2 uppercase flex items-center gap-2">
              <span>🚫</span> 2. Restricted Jurisdictions
            </h3>
            <p className="mb-2">
              <strong>USE OF THIS PROTOCOL IS STRICTLY PROHIBITED</strong> if you are a resident, citizen, or located in:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-200 font-semibold">
              <li>United States of America</li>
              <li>United Kingdom</li>
              <li>France</li>
              <li>Ontario (Canada)</li>
              <li>Singapore, Poland, Thailand, Australia, Belgium, Taiwan</li>
              <li>Any sanctioned jurisdiction (e.g., North Korea, Iran, Syria)</li>
            </ul>
            <p className="mt-3 text-red-300 font-bold">
              Use of a VPN to circumvent these restrictions is strictly prohibited and constitutes a violation of these terms.
            </p>
          </div>

          {/* Section 3: Risks */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2 uppercase border-b border-slate-800 pb-1">3. Risk of Loss & Liability</h3>
            <p className="mb-2">
              You acknowledge that prediction markets are highly speculative. <strong>YOU MAY LOSE 100% OF YOUR FUNDS.</strong>
            </p>
            <p className="mb-2">
              The Developers <strong>do not have custody</strong> of your funds at any time. You are interacting directly with smart contracts. We cannot reverse transactions, recover lost private keys, or fix user errors.
            </p>
            <p>
              You agree to hold the open-source developers, contributors, and affiliates harmless for any financial losses arising from smart contract bugs, oracle failures (UMA), market manipulation, or regulatory actions.
            </p>
          </div>

          {/* Section 4: Dispute Resolution */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2 uppercase border-b border-slate-800 pb-1">4. Governance & Disputes</h3>
            <p>
              Market outcomes are determined solely by the <strong>UMA Optimistic Oracle</strong> mechanism defined in the immutable smart contract code ("Code is Law"). These on-chain results are final.
            </p>
            <p className="mt-2">
              <strong>Class Action Waiver:</strong> You agree to waive your right to participate in any class action lawsuit or class-wide arbitration against the developers or the Protocol.
            </p>
          </div>

        </div>

        <div className="space-y-3 flex-shrink-0">
          <button 
            onClick={handleAccept}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
          >
            I Agree to All Terms & Enter
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <a 
               href="https://polypulsebets.mintlify.app/user-guide/tos/Terms-of-Use" 
               target="_blank" 
               rel="noopener noreferrer"
               className="block w-full py-3 text-center bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-700"
             >
               View Docs Page ↗
             </a>
             <a 
               href="https://google.com" 
               className="block w-full py-3 text-center bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 font-bold text-xs rounded-xl transition-all border border-slate-700 hover:border-red-500/30"
             >
               I Disagree (Exit)
             </a>
          </div>
        </div>

      </div>
    </div>
  );
}