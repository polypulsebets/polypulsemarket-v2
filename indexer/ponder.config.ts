import { createConfig } from "@ponder/core";
import { http, fallback } from "viem";
import { PolypulseFactoryAbi } from "./abis/PolypulseFactoryAbi";
import { MarketMakerAbi } from "./abis/MarketMakerAbi";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
const rpc1 = process.env.PONDER_RPC_URL_1;
const rpc2 = process.env.PONDER_RPC_URL_2;
const rpc3 = process.env.PONDER_RPC_URL_3;

export default createConfig({
  networks: {
    pulseTestnet: {
      chainId: 943,
      transport: fallback([
        http(rpc1),
        http(rpc2),
        http(rpc3)
      ]), 
    },
  },
  contracts: {
    PolypulseFactory: {
      network: "pulseTestnet",
      abi: PolypulseFactoryAbi,
      address: FACTORY_ADDRESS, 
      startBlock: 23580000, 
    },
    MarketMaker: {
      network: "pulseTestnet",
      abi: MarketMakerAbi,
      factory: {
        address: FACTORY_ADDRESS,
        event: PolypulseFactoryAbi[1], 
        parameter: "marketAddress",
      },
      startBlock: 23580000,
    },
  },
});