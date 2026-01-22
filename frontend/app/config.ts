import { http, fallback } from 'wagmi';
import { defineChain } from 'viem';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || ""; 
const rpc1 = process.env.NEXT_PUBLIC_RPC_URL_1 || "";
const rpc2 = process.env.NEXT_PUBLIC_RPC_URL_2 || "";
const rpc3 = process.env.NEXT_PUBLIC_RPC_URL_3 || "";

// Safety Check: If RPC 1 is missing, warn the developer
if (!rpc1) {
  console.error("⚠️ WARNING: NEXT_PUBLIC_RPC_URL_1 is missing in .env");
}

// 2. Define the Chain
export const pulseChainTestnet = defineChain({
  id: 943,
  name: 'PulseChain Testnet v4',
  nativeCurrency: { name: 'Test Pulse', symbol: 'tPLS', decimals: 18 },
  rpcUrls: {
    default: { http: [rpc1, rpc2, rpc3].filter(url => url !== "") }, 
  },
  blockExplorers: {
    default: { name: 'PulseScan', url: 'https://scan.v4.testnet.pulsechain.com' },
  },
  testnet: true,
});

// 3. Export Config
export const config = getDefaultConfig({
  appName: 'Polypulsemarket',
  projectId: projectId, 
  chains: [pulseChainTestnet],
  transports: {
    [pulseChainTestnet.id]: fallback(
      [rpc1, rpc2, rpc3]
        .filter(url => url !== "") // Filter out empty ones
        .map(url => http(url))     // Convert strings to http transports
    ),
  },
  ssr: true,
});