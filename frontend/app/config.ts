import { http, fallback, createConnector } from 'wagmi';
import { defineChain } from 'viem';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, rabbyWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { injected } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || ""; 
const rpc1 = process.env.NEXT_PUBLIC_RPC_URL_1 || "";
const rpc2 = process.env.NEXT_PUBLIC_RPC_URL_2 || "";
const rpc3 = process.env.NEXT_PUBLIC_RPC_URL_3 || "";

// Safety Check: If RPC 1 is missing, warn the developer
if (!rpc1) {
  console.error("⚠️ WARNING: NEXT_PUBLIC_RPC_URL_1 is missing in .env");
}

// 1. Define the Chain
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

// 2. Create the Custom Internet Money Wallet 
const internetMoneyWallet = () => ({
  id: 'internet-money',
  name: 'Internet Money',
  iconUrl: '/im-logo.png', 
  iconBackground: '#ffffff00',
  installed: typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum?.isInternetMoney,
  downloadUrls: {
    browserExtension: 'https://internetmoney.io/',
  },
  // Wraps the injected connector to satisfy Wagmi v2's strict typing
  createConnector: (walletDetails: any) => {
    const connector = injected();
    return createConnector((config) => ({
      ...connector(config),
      ...walletDetails,
    }));
  },
});

// 3. Export Config (With strict wallet ordering)
export const config = getDefaultConfig({
  appName: 'Polypulsebets',
  projectId: projectId, 
  chains: [pulseChainTestnet],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        internetMoneyWallet, // #1 Priority
        rabbyWallet,         // #2 Priority
        metaMaskWallet,      // #3 Priority
        walletConnectWallet  // Catch-all for mobile scanning
      ],
    },
  ],
  transports: {
    [pulseChainTestnet.id]: fallback(
      [rpc1, rpc2, rpc3]
        .filter(url => url !== "") 
        .map(url => http(url))     
    ),
  },
  ssr: true,
});