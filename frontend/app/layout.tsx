import type { Metadata } from "next";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./providers";
import { LegalModal } from "./components/LegalModal";

// --- METADATA CONFIGURATION ---
export const metadata: Metadata = {
  title: "PolyPulseBets | Decentralized Prediction Protocol",
  description: "Bet on Crypto, Politics, and Sports with zero intermediaries.",
  icons: {
    icon: '/logo.png', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Added classes for sticky footer layout */}
      <body className="bg-[#0F172A] min-h-screen flex flex-col">
        <LegalModal />
        
        <Providers>
          {/* Main Content Wrapper (pushes footer down) */}
          <div className="flex-grow">
            {children}
          </div>

          {/* GLOBAL FOOTER */}
          <footer className="w-full py-8 text-center border-t border-slate-900 mt-auto bg-[#0F172A]">
            <div className="text-slate-600 text-xs font-bold">
              &copy; {new Date().getFullYear()} PolyPulseBets. All rights reserved.
            </div>
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-700 font-bold uppercase tracking-wider">
              <a href="https://polypulsebets.mintlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Docs</a>
              <span>•</span>
              <a href="/support" className="hover:text-blue-500 transition-colors">Support</a>
              <span>•</span>
              <a href="https://polypulsebets.mintlify.app/user-guide/tos/Terms-of-Use" className="hover:text-blue-500 transition-colors">Terms</a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}