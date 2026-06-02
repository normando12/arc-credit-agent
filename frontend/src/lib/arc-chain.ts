import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.app",
    },
  },
});

export const ARC_CHAIN_ID = arcTestnet.id;

export function buildAnalysisConsentMessage(wallet: string): string {
  const timestamp = new Date().toISOString();
  return [
    "ARC Credit Agent — Credit Analysis Request",
    `Wallet: ${wallet}`,
    `Network: Arc Testnet (${ARC_CHAIN_ID})`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}
