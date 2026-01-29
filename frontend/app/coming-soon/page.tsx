'use client';

import { useState, useEffect } from 'react';

const TARGET_DATE = new Date('2026-02-17T14:00:00Z').getTime();

export default function ComingSoon() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = TARGET_DATE - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden text-center p-6 font-sans">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Testnet Incoming
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
          The Future of <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Prediction Markets
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          PolyPulseBets is launching on PulseChain Testnet. <br className="hidden md:block" />
          Get ready for the fastest, fairest, and most liquid decentralized betting experience.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 w-full max-w-3xl px-4">
          <TimeBox value={timeLeft.days} label="Days" />
          <TimeBox value={timeLeft.hours} label="Hours" />
          <TimeBox value={timeLeft.minutes} label="Minutes" />
          <TimeBox value={timeLeft.seconds} label="Seconds" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
           <a href="https://x.com/PolyPulseBets" target="_blank" className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-700 hover:border-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
             Follow Updates 🐦
           </a>
           <a href="https://discord.gg/YjZJdB5X" target="_blank" className="w-full sm:w-auto px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
             Join Discord 👾
           </a>
        </div>

      </div>

      <div className="absolute bottom-8 text-slate-600 text-[10px] md:text-xs font-mono opacity-50">
         GLOBAL ACCESS • TESTNET • V2
      </div>
    </div>
  );
}

function TimeBox({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-900/40 border border-slate-800 p-4 md:p-6 rounded-2xl backdrop-blur-sm shadow-xl">
      <span className="text-3xl md:text-6xl font-black text-white font-mono mb-1 md:mb-2 tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">{label}</span>
    </div>
  );
}