"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";
import { ScoreGauge } from "@/components/ScoreGauge";
import { AgentIdentityCard } from "@/components/AgentIdentityCard";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  api,
  type CreditScore,
  type WalletAnalysis,
  type AgentInfo,
  type ReputationMetrics,
} from "@/lib/api";
import type { ValidationRecord, ValidatorInfo } from "@/lib/validation";
import { ARC_CHAIN_ID, buildAnalysisConsentMessage } from "@/lib/arc-chain";

export default function Dashboard() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { switchChain } = useSwitchChain();

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [refreshingValidation, setRefreshingValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<CreditScore | null>(null);
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [reputation, setReputation] = useState<ReputationMetrics | null>(null);
  const [validatorInfo, setValidatorInfo] = useState<ValidatorInfo | null>(null);
  const [validation, setValidation] = useState<ValidationRecord | null>(null);
  const [health, setHealth] = useState<string>("checking");

  const onArcTestnet = chainId === ARC_CHAIN_ID;
  const wallet = address ?? "";

  const loadAgentData = useCallback(async () => {
    try {
      const [agentData, repData, healthData, validatorData] = await Promise.all([
        api.getAgent(),
        api.getReputation(),
        api.getHealth(),
        api.getValidatorInfo(),
      ]);
      setAgent(agentData);
      setReputation(repData);
      setHealth(healthData.status);
      setValidatorInfo(validatorData);
    } catch {
      setHealth("offline");
    }
  }, []);

  const refreshValidationStatus = useCallback(async () => {
    if (!validation?.requestHash) return;
    setRefreshingValidation(true);
    try {
      const updated = await api.getValidationStatus(validation.requestHash);
      setValidation(updated);
    } catch {
      /* keep current state */
    } finally {
      setRefreshingValidation(false);
    }
  }, [validation?.requestHash]);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

  useEffect(() => {
    if (!validation?.requestHash || validation.status !== "pending") return;
    const interval = setInterval(refreshValidationStatus, 15000);
    return () => clearInterval(interval);
  }, [validation?.requestHash, validation?.status, refreshValidationStatus]);

  useEffect(() => {
    setScore(null);
    setAnalysis(null);
    setValidation(null);
    setError(null);
  }, [address]);

  async function handleScore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError("Connect your wallet to analyze your on-chain credit profile.");
      return;
    }

    if (!onArcTestnet) {
      try {
        await switchChain({ chainId: ARC_CHAIN_ID });
      } catch {
        setError("Switch to Arc Testnet in your wallet before continuing.");
        return;
      }
    }

    setLoading(true);
    setValidation(null);

    try {
      await signMessageAsync({
        message: buildAnalysisConsentMessage(address),
      });

      const scoreData = await api.score(address);
      setScore(scoreData);
      setAnalysis(scoreData.analysis ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
        setError("Signature required to authorize the credit analysis.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleValidation() {
    if (!score?.analysisId || !wallet) return;
    setValidating(true);
    setError(null);
    try {
      const result = await api.requestValidation(wallet, score.analysisId);
      setValidation(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request validation";
      setError(
        msg.includes("AGENT_PRIVATE_KEY")
          ? "Server missing agent key. Configure AGENT_PRIVATE_KEY in Vercel and redeploy."
          : msg
      );
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-arc-950 via-[#070b14] to-[#070b14]">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ARC Credit Agent</h1>
            <p className="text-sm text-white/50 mt-0.5">
              ERC-8004 · Arc Testnet · Explainable Credit Scoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectWalletButton />
            <span
              className={`w-2 h-2 rounded-full ${
                health === "healthy" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-xs text-white/50 capitalize">{health}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={handleScore} className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <label htmlFor="wallet" className="block text-sm font-medium text-white/70 mb-1">
                Your Wallet
              </label>
              <p className="text-xs text-white/40">
                Connect MetaMask, switch to Arc Testnet, and sign to authorize analysis.
              </p>
            </div>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-arc-400 hover:text-arc-300 whitespace-nowrap"
            >
              Get testnet USDC →
            </a>
          </div>

          <div className="flex gap-3">
            <input
              id="wallet"
              type="text"
              readOnly
              value={isConnected ? wallet : ""}
              placeholder={isConnected ? wallet : "Connect wallet to continue"}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none placeholder:text-white/30 cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || !isConnected}
              className="px-6 py-3 rounded-xl bg-arc-600 hover:bg-arc-500 disabled:opacity-50 transition font-medium text-sm whitespace-nowrap"
            >
              {loading ? "Signing & analyzing..." : "Sign & Analyze"}
            </button>
          </div>

          {!isConnected && (
            <p className="text-amber-400 text-sm mt-3">
              Step 1: click <strong className="font-medium">Connect Wallet</strong> in the header.
            </p>
          )}
          {isConnected && !onArcTestnet && (
            <p className="text-amber-400 text-sm mt-3">
              Step 2: switch your wallet to <strong className="font-medium">Arc Testnet</strong> (Chain ID 5042002).
            </p>
          )}
          {isConnected && onArcTestnet && (
            <p className="text-white/40 text-sm mt-3">
              Step 3: click <strong className="font-medium text-white/60">Sign & Analyze</strong> — your wallet will ask you to sign a message on Arc Testnet.
            </p>
          )}

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {health === "offline" && (
            <p className="text-amber-400 text-sm mt-2">
              API offline. Configure DATABASE_URL, AGENT_PRIVATE_KEY, and VALIDATOR_PRIVATE_KEY in
              Vercel and redeploy.
            </p>
          )}
        </form>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {score ? (
              <div className="glass rounded-2xl p-6 flex justify-center">
                <ScoreGauge
                  score={score.credit_score}
                  riskLevel={score.risk_level}
                  confidence={score.confidence}
                />
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 h-72 flex items-center justify-center text-white/40 text-sm text-center px-4">
                Connect your wallet and sign to see your credit score
              </div>
            )}
            <AgentIdentityCard agent={agent} reputation={reputation} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <AnalysisPanel
              analysis={analysis}
              score={score}
              onRequestValidation={handleValidation}
              validating={validating}
              validationRequested={Boolean(validation)}
            />
            <ValidationPanel
              validation={validation}
              validatorInfo={validatorInfo}
              apiOffline={health === "offline"}
              onRefresh={validation ? refreshValidationStatus : undefined}
              refreshing={refreshingValidation}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-white/40 flex justify-between">
          <span>Arc Testnet · Chain ID 5042002</span>
          <span>ERC-8004 Trustless Agents</span>
        </div>
      </footer>
    </div>
  );
}
