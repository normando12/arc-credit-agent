import { creditScoreEngine } from "../src/services/creditScoreEngine.js";
import type { WalletAnalysis } from "../src/types/index.js";

const baseAnalysis: WalletAnalysis = {
  wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  transactionCount: 150,
  walletAgeDays: 540,
  firstActivityAt: "2024-11-29T00:00:00.000Z",
  lastActivityAt: "2026-05-29T00:00:00.000Z",
  balanceUsdc: "1250.50",
  uniqueContracts: 12,
  defiProtocols: ["USDC", "GatewayWallet", "ERC-8004 Identity"],
  stakingInteractions: 1,
  lendingInteractions: 1,
  liquidityPoolInteractions: 2,
  governanceInteractions: 3,
  assetDiversificationScore: 70,
  transactionConsistencyScore: 85,
  suspiciousActivity: false,
  suspiciousFlags: [],
  analyzedAt: new Date().toISOString(),
};

describe("CreditScoreEngine", () => {
  it("generates score between 0 and 1000", () => {
    const result = creditScoreEngine.score(baseAnalysis);
    expect(result.credit_score).toBeGreaterThanOrEqual(0);
    expect(result.credit_score).toBeGreaterThan(500);
    expect(result.credit_score).toBeLessThanOrEqual(1000);
  });

  it("assigns LOW risk for high scores", () => {
    const result = creditScoreEngine.score(baseAnalysis);
    expect(result.risk_level).toBe("LOW");
  });

  it("includes explainable factors", () => {
    const result = creditScoreEngine.score(baseAnalysis);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.factors.length).toBe(7);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("penalizes suspicious activity", () => {
    const suspicious: WalletAnalysis = {
      ...baseAnalysis,
      suspiciousActivity: true,
      suspiciousFlags: ["Burst transaction pattern detected"],
    };
    const normal = creditScoreEngine.score(baseAnalysis);
    const flagged = creditScoreEngine.score(suspicious);
    expect(flagged.credit_score).toBeLessThan(normal.credit_score);
  });

  it("scores new wallets lower", () => {
    const newWallet: WalletAnalysis = {
      ...baseAnalysis,
      walletAgeDays: 3,
      transactionCount: 2,
      defiProtocols: [],
      uniqueContracts: 0,
      assetDiversificationScore: 0,
      transactionConsistencyScore: 0,
    };
    const result = creditScoreEngine.score(newWallet);
    expect(result.credit_score).toBeLessThan(400);
    expect(result.risk_level).toMatch(/HIGH|CRITICAL|MEDIUM/);
  });
});

describe("Wallet validation helpers", () => {
  it("validates Ethereum addresses", async () => {
    const { isValidAddress, normalizeAddress } = await import(
      "../src/utils/helpers.js"
    );
    expect(isValidAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")).toBe(true);
    expect(isValidAddress("not-an-address")).toBe(false);
    expect(normalizeAddress("0x742d35cc6634c0532925a3b844bc454e4438f44e")).toBe(
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    );
  });
});
