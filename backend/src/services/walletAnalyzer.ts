import { ethers } from "ethers";
import { config } from "../config/index.js";
import {
  ERC20_ABI,
  getProvider,
} from "../blockchain/provider.js";
import {
  calculateStdDev,
  clamp,
  daysBetween,
  formatUsdcBalance,
  normalizeAddress,
} from "../utils/helpers.js";
import { logger } from "../utils/logger.js";
import type { WalletAnalysis } from "../types/index.js";

/** Known Arc Testnet protocol contracts for DeFi interaction detection */
const ARC_PROTOCOLS: Record<string, { name: string; category: string }> = {
  "0x3600000000000000000000000000000000000000": {
    name: "USDC",
    category: "stablecoin",
  },
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a": {
    name: "EURC",
    category: "stablecoin",
  },
  "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C": {
    name: "USYC",
    category: "yield",
  },
  "0x0077777d7EBA4688BDeF3E311b846F25870A19B9": {
    name: "GatewayWallet",
    category: "bridge",
  },
  "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA": {
    name: "TokenMessengerV2",
    category: "bridge",
  },
  "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A": {
    name: "USYCTeller",
    category: "lending",
  },
  "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8": {
    name: "FxEscrow",
    category: "defi",
  },
  "0x8004A818BFB912233c491871b3d84c89A494BD9e": {
    name: "ERC-8004 Identity",
    category: "governance",
  },
  "0x8004B663056A597Dffe9eCcC1965A193B7388713": {
    name: "ERC-8004 Reputation",
    category: "governance",
  },
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272": {
    name: "ERC-8004 Validation",
    category: "governance",
  },
};

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const MAX_BLOCKS_TO_SCAN = 50_000;
const BLOCK_CHUNK = 2_000;

interface TxActivity {
  timestamp: Date;
  to: string;
  from: string;
  isContract: boolean;
}

export class WalletAnalyzer {
  async analyze(walletAddress: string): Promise<WalletAnalysis> {
    const wallet = normalizeAddress(walletAddress);
    const provider = getProvider();

    logger.info("Analyzing wallet", { wallet });

    const [txCount, balance, logActivities, explorerActivities] = await Promise.all([
      provider.getTransactionCount(wallet),
      this.getUsdcBalance(wallet),
      this.fetchActivity(wallet),
      this.fetchArcscanActivity(wallet, provider),
    ]);

    const activities = this.mergeActivities(logActivities, explorerActivities);

    const timestamps = activities.map((a) => a.timestamp);
    const firstActivity = timestamps.length
      ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
      : null;
    const lastActivity = timestamps.length
      ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
      : null;

    const walletAgeDays = firstActivity
      ? daysBetween(firstActivity, new Date())
      : 0;

    const uniqueContracts = new Set(
      activities
        .filter((a) => a.isContract && a.to !== wallet)
        .map((a) => a.to.toLowerCase())
    );

    const defiProtocols = [...uniqueContracts]
      .map((addr) => ARC_PROTOCOLS[ethers.getAddress(addr)]?.name)
      .filter(Boolean) as string[];

    let staking = 0;
    let lending = 0;
    let liquidity = 0;
    let governance = 0;

    for (const addr of uniqueContracts) {
      const protocol = ARC_PROTOCOLS[ethers.getAddress(addr)];
      if (!protocol) continue;
      switch (protocol.category) {
        case "yield":
          staking++;
          break;
        case "lending":
          lending++;
          break;
        case "defi":
          liquidity++;
          break;
        case "governance":
          governance++;
          break;
      }
    }

    const diversificationScore = this.calculateDiversification(uniqueContracts.size, defiProtocols.length);
    const consistencyScore = this.calculateConsistency(activities);
    const { suspicious, flags } = this.detectSuspiciousActivity(
      txCount,
      walletAgeDays,
      activities,
      balance
    );

    return {
      wallet,
      transactionCount: txCount,
      walletAgeDays,
      firstActivityAt: firstActivity?.toISOString() ?? null,
      lastActivityAt: lastActivity?.toISOString() ?? null,
      balanceUsdc: balance,
      uniqueContracts: uniqueContracts.size,
      defiProtocols,
      stakingInteractions: staking,
      lendingInteractions: lending,
      liquidityPoolInteractions: liquidity,
      governanceInteractions: governance,
      assetDiversificationScore: diversificationScore,
      transactionConsistencyScore: consistencyScore,
      suspiciousActivity: suspicious,
      suspiciousFlags: flags,
      analyzedAt: new Date().toISOString(),
    };
  }

  private async getUsdcBalance(wallet: string): Promise<string> {
    const provider = getProvider();
    // Arc uses USDC as native gas token — getBalance returns 18-decimal USDC
    const balance = await provider.getBalance(wallet);
    return formatUsdcBalance(balance);
  }

  private async fetchActivity(wallet: string): Promise<TxActivity[]> {
    const provider = getProvider();
    const activities: TxActivity[] = [];
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - MAX_BLOCKS_TO_SCAN);
    const paddedAddress = ethers.zeroPadValue(wallet, 32);

    try {
      for (let start = fromBlock; start <= currentBlock; start += BLOCK_CHUNK) {
        const end = Math.min(start + BLOCK_CHUNK - 1, currentBlock);

        const [sentLogs, receivedLogs] = await Promise.all([
          provider.getLogs({
            address: config.arc.usdcAddress,
            topics: [TRANSFER_TOPIC, paddedAddress],
            fromBlock: start,
            toBlock: end,
          }),
          provider.getLogs({
            address: config.arc.usdcAddress,
            topics: [TRANSFER_TOPIC, null, paddedAddress],
            fromBlock: start,
            toBlock: end,
          }),
        ]);

        const allLogs = [...sentLogs, ...receivedLogs];
        const blockNumbers = [...new Set(allLogs.map((l) => l.blockNumber))];

        const blockTimestamps = new Map<number, Date>();
        await Promise.all(
          blockNumbers.map(async (bn) => {
            const block = await provider.getBlock(bn);
            if (block) blockTimestamps.set(bn, new Date(block.timestamp * 1000));
          })
        );

        for (const log of allLogs) {
          const to = ethers.getAddress("0x" + log.topics[2].slice(26));
          const from = ethers.getAddress("0x" + log.topics[1].slice(26));
          const counterparty = from.toLowerCase() === wallet.toLowerCase() ? to : from;
          const code = await provider.getCode(counterparty);
          activities.push({
            timestamp: blockTimestamps.get(log.blockNumber) ?? new Date(),
            to: counterparty,
            from,
            isContract: code !== "0x",
          });
        }
      }
    } catch (error) {
      logger.warn("Partial activity fetch — using on-chain counters only", {
        wallet,
        error: String(error),
      });
    }

    return activities;
  }

  private async fetchArcscanActivity(
    wallet: string,
    provider: ethers.Provider
  ): Promise<TxActivity[]> {
    const activities: TxActivity[] = [];
    const base = config.arc.explorerUrl.replace(/\/$/, "");
    const url = `${base}/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&sort=asc&page=1&offset=200`;

    try {
      const res = await fetch(url);
      if (!res.ok) return activities;

      const data = (await res.json()) as {
        status: string;
        result?: Array<{
          from: string;
          to: string;
          timeStamp: string;
          contractAddress?: string;
        }>;
      };

      if (data.status !== "1" || !Array.isArray(data.result)) return activities;

      const walletLower = wallet.toLowerCase();
      const contractCache = new Map<string, boolean>();

      for (const tx of data.result) {
        const timestamp = new Date(parseInt(tx.timeStamp, 10) * 1000);
        const from = tx.from?.toLowerCase() ?? "";
        const to = tx.to?.toLowerCase() ?? "";

        if (from === walletLower && to) {
          let isContract = contractCache.get(to);
          if (isContract === undefined) {
            const code = await provider.getCode(ethers.getAddress(to));
            isContract = code !== "0x";
            contractCache.set(to, isContract);
          }
          activities.push({
            timestamp,
            from: tx.from,
            to: ethers.getAddress(to),
            isContract,
          });
        } else if (to === walletLower && from) {
          let isContract = contractCache.get(from);
          if (isContract === undefined) {
            const code = await provider.getCode(ethers.getAddress(from));
            isContract = code !== "0x";
            contractCache.set(from, isContract);
          }
          activities.push({
            timestamp,
            from: tx.from,
            to: ethers.getAddress(from),
            isContract,
          });
        }

        if (tx.contractAddress) {
          activities.push({
            timestamp,
            from: tx.from,
            to: ethers.getAddress(tx.contractAddress),
            isContract: true,
          });
        }
      }
    } catch (error) {
      logger.warn("Arcscan activity fetch failed", { wallet, error: String(error) });
    }

    return activities;
  }

  private mergeActivities(a: TxActivity[], b: TxActivity[]): TxActivity[] {
    const map = new Map<string, TxActivity>();
    for (const item of [...a, ...b]) {
      const key = `${item.timestamp.getTime()}-${item.to.toLowerCase()}`;
      map.set(key, item);
    }
    return [...map.values()].sort(
      (x, y) => x.timestamp.getTime() - y.timestamp.getTime()
    );
  }

  private calculateDiversification(uniqueContracts: number, defiCount: number): number {
    const contractScore = clamp(uniqueContracts * 8, 0, 50);
    const defiScore = clamp(defiCount * 10, 0, 50);
    return clamp(contractScore + defiScore, 0, 100);
  }

  private calculateConsistency(activities: TxActivity[]): number {
    if (activities.length === 0) return 0;
    if (activities.length === 1) return 50;

    // Use one bucket per active day to avoid duplicate events skewing gaps
    const activeDays = [
      ...new Set(activities.map((a) => a.timestamp.toISOString().slice(0, 10))),
    ].sort();

    if (activeDays.length === 1) return 60;

    const gaps: number[] = [];
    for (let i = 1; i < activeDays.length; i++) {
      const prev = new Date(activeDays[i - 1]);
      const curr = new Date(activeDays[i]);
      gaps.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    }

    const stdDev = calculateStdDev(gaps);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avgGap === 0) return 30;

    const coefficient = stdDev / avgGap;
    const regularity = clamp(Math.round(100 - coefficient * 30), 0, 100);
    const coverage = clamp(Math.round((activeDays.length / gaps.length) * 40), 0, 40);
    return clamp(regularity + coverage, 0, 100);
  }

  private detectSuspiciousActivity(
    txCount: number,
    walletAgeDays: number,
    activities: TxActivity[],
    balance: string
  ): { suspicious: boolean; flags: string[] } {
    const flags: string[] = [];

    if (walletAgeDays < 7 && txCount > 100) {
      flags.push("High transaction volume on new wallet");
    }
    if (parseFloat(balance) === 0 && txCount > 50) {
      flags.push("High activity with zero balance");
    }

    const hourlyBuckets = new Map<string, number>();
    for (const a of activities) {
      const key = a.timestamp.toISOString().slice(0, 13);
      hourlyBuckets.set(key, (hourlyBuckets.get(key) ?? 0) + 1);
    }
    const maxHourly = Math.max(0, ...hourlyBuckets.values());
    if (maxHourly > 20) {
      flags.push("Burst transaction pattern detected");
    }

    return { suspicious: flags.length > 0, flags };
  }
}

export const walletAnalyzer = new WalletAnalyzer();
