import type { Metadata } from "next";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./providers";
import { LegalModal } from "./components/LegalModal";
import { Toaster } from 'react-hot-toast';
import { Navbar } from "./components/NavBar"; 
import Link from "next/link";
import { Analytics } from '@vercel/analytics/next'; 

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
      <body className="bg-[#0F172A] min-h-screen flex flex-col overscroll-none text-slate-200">
        <LegalModal />
        
        <Providers>
          <Navbar />

          <Toaster 
            position="bottom-right" 
            toastOptions={{
              style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }} 
          />

          {/* Main Content */}
          <div className="flex-grow bg-[#0F172A] w-full">
            {children}
          </div>

          <footer className="w-full py-8 text-center border-t border-slate-900 mt-auto bg-[#0F172A] pb-24 md:pb-8">
            <div className="text-slate-600 text-xs font-bold">
              &copy; {new Date().getFullYear()} PolyPulseBets. All rights reserved.
            </div>
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-700 font-bold uppercase tracking-wider">
              <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Docs</a>
              <span>•</span>
              <Link href="/support" className="hover:text-blue-500 transition-colors">Support</Link>
              <span>•</span>
              <a href="/docs/user-guide/tos/Terms-of-Use" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Terms</a>
              <span>•</span>
              <a href="/donate" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Donate</a>
            </div>
          </footer>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}