'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function DonatePage() {
  const wallets = [
    {
      network: 'Ethereum',
      symbol: 'ETH',
      address: '0x1281E027A2F97378e76e812F1c627B1CD69f5477',
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-900/10'
    },
    {
      network: 'Solana',
      symbol: 'SOL',
      address: 'FGwDiwfag7yxXJc6MSzhNHRGdgWMv1qrePhXjZnMaTJb',
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-900/10'
    },
    {
      network: 'Tron',
      symbol: 'TRX',
      address: 'TZHcFnQeyhffrckbexZ3Gw8Lhjf3i8WcZT',
      color: 'text-red-400',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-900/10'
    }
  ];

  const handleCopy = (text: string, network: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${network} Address! 📋`);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col w-full">
      {/* Hide Scrollbar CSS */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="flex flex-1 items-center justify-center p-4 md:p-6 pb-32">
        <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="text-center mb-8 md:mb-12">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">🙏 Support the Devs</h1>
                <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-lg px-4">
                    If you enjoy using PolyPulseBets, consider donating to support server costs and future development.
                </p>
            </div>

            <div className="space-y-4 md:space-y-6">
                {wallets.map((wallet) => (
                    <div 
                        key={wallet.network} 
                        className={`relative group bg-slate-900 border ${wallet.borderColor} rounded-2xl p-5 md:p-8 transition-all hover:shadow-xl hover:-translate-y-1`}
                    >
                        {/* Flex Container: Stacks on mobile, Row on Large Screens */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 relative z-10">
                            
                            {/* Network Icon & Name */}
                            <div className="flex items-center gap-4 min-w-[200px]">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-bold ${wallet.bgColor} ${wallet.color} border border-slate-800 shrink-0`}>
                                    {wallet.symbol.split('/')[0].trim().slice(0, 1)}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg md:text-xl ${wallet.color}`}>{wallet.network}</h3>
                                    <p className="text-xs md:text-sm text-slate-500 font-mono">Network: {wallet.symbol}</p>
                                </div>
                            </div>

                            {/* Address & Button Container */}
                            <div className="flex-1 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end">
                                
                                {/* Address Box: Scrollable but hidden scrollbar */}
                                <div className="no-scrollbar flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 md:py-4 font-mono text-xs md:text-base text-slate-300 whitespace-nowrap overflow-x-auto text-center sm:text-left shadow-inner">
                                    {wallet.address}
                                </div>

                                {/* Copy Button */}
                                <button 
                                    onClick={() => handleCopy(wallet.address, wallet.network)}
                                    className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 md:py-4 px-6 md:px-8 rounded-xl transition-all border border-slate-700 hover:border-slate-500 hover:shadow-lg active:scale-95"
                                >
                                    Copy 📋
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 md:mt-16 text-center">
                <p className="text-xs md:text-sm text-slate-500">
                    Thank you for your support! ❤️ <br/>
                    <span className="opacity-50 font-bold mt-1 block">PolyPulseBets Team</span>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}