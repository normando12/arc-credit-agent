import { clamp, riskLevelFromScore } from "../utils/helpers.js";
import type { CreditScoreResult, ScoreFactor, WalletAnalysis } from "../types/index.js";

interface FactorConfig {
  name: string;
  weight: number;
  score: (analysis: WalletAnalysis) => number;
  describe: (analysis: WalletAnalysis, rawScore: number) => string;
}

const FACTORS: FactorConfig[] = [
  {
    name: "Wallet Longevity",
    weight: 0.2,
    score: (a) => clamp((a.walletAgeDays / 730) * 100, 0, 100),
    describe: (a) =>
      a.walletAgeDays > 0
        ? `Wallet active for ${Math.round(a.walletAgeDays / 30)} months.`
        : "No on-chain activity history detected.",
  },
  {
    name: "Transaction Frequency",
    weight: 0.15,
    score: (a) => {
      if (a.transactionCount === 0) return 0;
      if (a.transactionCount < 5) return 30;
      if (a.transactionCount < 50) return 60;
      if (a.transactionCount < 200) return 85;
      return 95;
    },
    describe: (a) => `${a.transactionCount} total transactions recorded.`,
  },
  {
    name: "Portfolio Diversification",
    weight: 0.15,
    score: (a) => a.assetDiversificationScore,
    describe: (a) =>
      a.defiProtocols.length > 0
        ? `Interacted with ${a.defiProtocols.length} protocols/assets.`
        : "Limited asset diversification detected.",
  },
  {
    name: "Historical Activity",
    weight: 0.15,
    score: (a) => a.transactionConsistencyScore,
    describe: (a) =>
      a.transactionConsistencyScore >= 70
        ? "Consistent transaction history."
        : "Irregular transaction patterns detected.",
  },
  {
    name: "DeFi Participation",
    weight: 0.15,
    score: (a) => {
      const total =
        a.stakingInteractions +
        a.lendingInteractions +
        a.liquidityPoolInteractions +
        a.governanceInteractions;
      return clamp(total * 15, 0, 100);
    },
    describe: (a) => {
      const parts: string[] = [];
      if (a.stakingInteractions) parts.push(`${a.stakingInteractions} staking`);
      if (a.lendingInteractions) parts.push(`${a.lendingInteractions} lending`);
      if (a.liquidityPoolInteractions) parts.push(`${a.liquidityPoolInteractions} liquidity`);
      if (a.governanceInteractions) parts.push(`${a.governanceInteractions} governance`);
      return parts.length
        ? `DeFi activity: ${parts.join(", ")} interactions.`
        : "No DeFi protocol interactions detected.";
    },
  },
  {
    name: "Smart Contract Quality",
    weight: 0.1,
    score: (a) => clamp(a.uniqueContracts * 5, 0, 100),
    describe: (a) =>
      `${a.uniqueContracts} unique smart contract interactions.`,
  },
  {
    name: "Risk Indicators",
    weight: 0.1,
    score: (a) => (a.suspiciousActivity ? 20 : 100),
    describe: (a) =>
      a.suspiciousActivity
        ? `Suspicious activity: ${a.suspiciousFlags.join("; ")}.`
        : "No suspicious activity detected.",
  },
];

export class CreditScoreEngine {
  score(analysis: WalletAnalysis): CreditScoreResult {
    const factors: ScoreFactor[] = FACTORS.map((factor) => {
      const rawScore = factor.score(analysis);
      return {
        name: factor.name,
        weight: factor.weight,
        rawScore,
        weightedScore: rawScore * factor.weight,
        description: factor.describe(analysis, rawScore),
      };
    });

    const normalizedScore = factors.reduce((sum, f) => sum + f.weightedScore, 0);
    const creditScore = Math.round(clamp(normalizedScore * 10, 0, 1000));

    const dataPoints =
      (analysis.transactionCount > 0 ? 1 : 0) +
      (analysis.walletAgeDays > 0 ? 1 : 0) +
      (analysis.uniqueContracts > 0 ? 1 : 0) +
      (analysis.defiProtocols.length > 0 ? 1 : 0) +
      (analysis.lastActivityAt ? 1 : 0);

    const confidence = clamp(
      Math.round(40 + dataPoints * 10 + (analysis.transactionCount > 10 ? 10 : 0)),
      0,
      100
    );

    const explanation = factors.map((f) => f.description);

    return {
      wallet: analysis.wallet,
      credit_score: creditScore,
      risk_level: riskLevelFromScore(creditScore),
      confidence,
      explanation,
      factors,
      scoredAt: new Date().toISOString(),
    };
  }
}

export const creditScoreEngine = new CreditScoreEngine();
