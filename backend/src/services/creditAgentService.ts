import { walletAnalyzer } from "./walletAnalyzer.js";
import { creditScoreEngine } from "./creditScoreEngine.js";
import * as repo from "../db/repository.js";
import type { CreditScoreResult, WalletAnalysis } from "../types/index.js";

export class CreditAgentService {
  async analyzeWallet(wallet: string): Promise<WalletAnalysis> {
    const analysis = await walletAnalyzer.analyze(wallet);
    await repo.saveAnalysis(analysis);
    return analysis;
  }

  async scoreWallet(wallet: string, existingAnalysis?: WalletAnalysis): Promise<CreditScoreResult> {
    const analysis = existingAnalysis ?? (await walletAnalyzer.analyze(wallet));
    const analysisId = await repo.saveAnalysis(analysis);
    const score = creditScoreEngine.score(analysis);
    const scoreId = await repo.saveCreditScore(score, analysisId);
    return { ...score, analysisId: scoreId, analysis };
  }

  async analyzeAndScore(wallet: string): Promise<{
    analysis: WalletAnalysis;
    score: CreditScoreResult;
  }> {
    const analysis = await walletAnalyzer.analyze(wallet);
    const analysisId = await repo.saveAnalysis(analysis);
    const score = creditScoreEngine.score(analysis);
    const scoreId = await repo.saveCreditScore(score, analysisId);
    return {
      analysis,
      score: { ...score, analysisId: scoreId, analysis },
    };
  }
}

export const creditAgentService = new CreditAgentService();
