import { NextResponse } from 'next/server';
import { formatEther } from 'viem';
import { createClient } from '@supabase/supabase-js';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL;

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  console.log("🔍 NEWSLETTER GENERATOR STARTED");

  if (!GRAPHQL_URL) {
      return new NextResponse("Error: Configuration Missing", { status: 500 });
  }

  const query = `
    query {
      hotMarkets: markets(limit: 3, orderBy: "totalVolume", orderDirection: "desc") {
        items {
          id
          question
          totalVolume
        }
      }
      coldMarkets: markets(limit: 3, orderBy: "totalVolume", orderDirection: "asc") {
        items {
          id
          question
          totalVolume
        }
      }
      topUsers: users(limit: 3, orderBy: "points", orderDirection: "desc") {
        items {
          id
          points 
        }
      }
    }
  `;

  try {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        cache: 'no-store',
    });
    
    const json = await res.json();
    
    // Extract Items
    const hotMarkets = json.data?.hotMarkets?.items || [];
    const coldMarkets = json.data?.coldMarkets?.items || [];
    const topUsersRaw = json.data?.topUsers?.items || [];
    
    // We must query 'wallet_address', not 'address'
    const addresses = topUsersRaw.map((u: any) => u.id.toLowerCase());
    
    const { data: profiles } = await supabase
        .from('users') 
        .select('wallet_address, username') 
        .in('wallet_address', addresses);

    // Create Map: wallet_address -> username
    const usernameMap = new Map();
    if (profiles) {
        profiles.forEach((p: any) => {
            if (p.wallet_address && p.username) {
                usernameMap.set(p.wallet_address.toLowerCase(), p.username);
            }
        });
    }

    const formatName = (addr: string) => {
        const lowerAddr = addr.toLowerCase();
        // Check if we found a username in Supabase
        if (usernameMap.has(lowerAddr)) {
            return `@${usernameMap.get(lowerAddr)}`; 
        }
        // Fallback to short address
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`; 
    };

    // Helper: Cleans up the ugly question string
    const cleanQuestion = (raw: string) => {
        if (!raw) return "Unknown Market";
        const parts = raw.split('~');
        return parts.length >= 2 ? parts[1] : raw;
    };

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #0f172a; color: #ffffff;">
            <div style="background-color: #0f172a; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
            
            <h1 style="margin-bottom: 10px; font-size: 28px;">
                <span style="color: #ffffff;">Poly</span><span style="color: #3b82f6;">Pulse</span><span style="color: #d4af37;">Bets</span>
                <span style="color: #94a3b8; font-size: 18px; font-weight: normal;"> | Monthly</span>
            </h1>
            <p style="color: #94a3b8; font-size: 16px; margin-bottom: 30px; border-bottom: 1px solid #334155; padding-bottom: 20px;">
                The latest stats from the prediction layer.
            </p>
            
            <h2 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px;">🔥 Top 3 Hot Markets</h2>
            ${hotMarkets.length > 0 ? hotMarkets.map((m: any) => `
                <div style="background-color: #1e293b; padding: 15px; margin-bottom: 12px; border-radius: 8px; border: 1px solid #334155;">
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px; color: #e2e8f0;">
                        ${cleanQuestion(m.question)}
                    </div>
                    <div style="color: #10b981; font-size: 14px; font-weight: bold;">Vol: $${Number(formatEther(BigInt(m.totalVolume || 0))).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div style="margin-top: 8px;">
                        <a href="https://polypulsebets.com/market/${m.id}" style="color: #60a5fa; text-decoration: none; font-size: 14px; font-weight: bold;">Bet Now →</a>
                    </div>
                </div>
            `).join('') : '<p style="color: #64748b;">No active markets yet.</p>'}

            <h2 style="color: #94a3b8; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">🧊 The Coldest (Lowest Vol)</h2>
            ${coldMarkets.length > 0 ? coldMarkets.map((m: any) => `
                <div style="background-color: #1e293b; padding: 15px; margin-bottom: 12px; border-radius: 8px; border: 1px solid #334155; opacity: 0.8;">
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px; color: #cbd5e1;">
                         ${cleanQuestion(m.question)}
                    </div>
                    <div style="color: #94a3b8; font-size: 14px;">Vol: $${Number(formatEther(BigInt(m.totalVolume || 0))).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div style="margin-top: 8px;">
                        <a href="https://polypulsebets.com/market/${m.id}" style="color: #64748b; text-decoration: none; font-size: 14px;">View Market →</a>
                    </div>
                </div>
            `).join('') : '<p style="color: #64748b;">No cold markets found.</p>'}

            <h2 style="color: #d4af37; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">🏆 Leaderboard (Top 3)</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #1e293b; border-radius: 8px; overflow: hidden;">
                ${topUsersRaw.length > 0 ? topUsersRaw.map((u: any, index: number) => `
                <tr style="border-bottom: 1px solid #334155;">
                    <td style="padding: 12px 15px; color: #fbbf24; font-weight: bold; width: 30px;">
                        ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td style="padding: 12px 0; font-family: sans-serif; color: #e2e8f0; font-weight: bold;">
                        ${formatName(u.id)}
                    </td>
                    <td style="padding: 12px 15px; text-align: right; color: #facc15; font-weight: bold; font-family: monospace; font-size: 14px;">
                        ${u.points} PTS
                    </td>
                </tr>
                `).join('') : '<tr><td style="padding: 15px; color: #64748b;">No user data yet.</td></tr>'}
            </table>

            <h2 style="color: #3b82f6; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">🚀 Project Updates</h2>
            <ul style="line-height: 1.8; color: #e2e8f0; padding-left: 20px;">
                <li><strong>Testnet is LIVE!</strong> – Go mint your free tokens now.</li>
                <li><strong>Leaderboard:</strong> View the full rankings on the site.</li>
            </ul>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 12px;">
                <p style="margin-bottom: 10px;">Sent with 💙 by the PolyPulseBets Team.</p>
                <p>
                    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #64748b; text-decoration: underline;">
                        Unsubscribe
                    </a>
                </p>
                <p style="margin-top: 10px; font-size: 10px; opacity: 0.6;">
                    PolyPulseBets • Decentralized Prediction Layer
                </p>
            </div>
            
            </div>
        </body>
        </html>
    `;

    return new NextResponse(html, { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (e: any) {
    console.error("❌ ERROR:", e);
    return new NextResponse(`Error: ${e.message}`, { status: 500 });
  }
}