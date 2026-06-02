"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { ScoreGauge } from "@/components/ScoreGauge";
import { AgentIdentityCard } from "@/components/AgentIdentityCard";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  api,
  truncateAddress,
  type CreditScore,
  type WalletAnalysis,
  type AgentInfo,
  type ReputationMetrics,
} from "@/lib/api";
import type { ValidationRecord, ValidatorInfo } from "@/lib/validation";
import {
  ARC_CHAIN_ID,
  VALIDATION_REGISTRY_ABI,
} from "@/lib/arc-chain";
import { wagmiConfig } from "@/lib/wagmi";

function addressesMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export default function Dashboard() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [walletInput, setWalletInput] = useState("");
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
  const analyzedWallet = score?.wallet ?? walletInput;
  const canRequestValidation =
    isConnected &&
    !!address &&
    !!analyzedWallet &&
    addressesMatch(address, analyzedWallet) &&
    onArcTestnet;

  const validationHint = (() => {
    if (!score?.analysisId || validation) return null;
    if (!isConnected) {
      return "Connect the analyzed wallet to request on-chain validation on Arc Testnet.";
    }
    if (!address || !addressesMatch(address, analyzedWallet)) {
      return `Connected wallet must match ${truncateAddress(analyzedWallet)}.`;
    }
    if (!onArcTestnet) {
      return "Switch to Arc Testnet to sign the validation transaction.";
    }
    return null;
  })();

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

  async function handleScore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletInput)) {
      setError("Enter a valid Ethereum address");
      return;
    }

    setLoading(true);
    setValidation(null);

    try {
      const scoreData = await api.score(walletInput);
      setScore(scoreData);
      setAnalysis(scoreData.analysis ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function ensureArcTestnet(): Promise<boolean> {
    if (onArcTestnet) return true;
    try {
      await switchChain({ chainId: ARC_CHAIN_ID });
      return true;
    } catch {
      setError("Switch to Arc Testnet to sign the validation transaction.");
      return false;
    }
  }

  async function handleValidation() {
    if (!score?.analysisId || !analyzedWallet) return;

    if (!isConnected || !address) {
      setError("Connect the analyzed wallet to request on-chain validation.");
      return;
    }

    if (!addressesMatch(address, analyzedWallet)) {
      setError(`Connect wallet ${truncateAddress(analyzedWallet)} to submit the on-chain request.`);
      return;
    }

    if (!(await ensureArcTestnet())) return;

    setValidating(true);
    setError(null);

    try {
      const prepared = await api.prepareValidation(analyzedWallet, score.analysisId);

      const txHash = await writeContractAsync({
        address: prepared.validationRegistry as `0x${string}`,
        abi: VALIDATION_REGISTRY_ABI,
        functionName: "validationRequest",
        args: [
          prepared.validatorAddress as `0x${string}`,
          BigInt(prepared.agentId),
          prepared.requestUri,
          prepared.requestHash as `0x${string}`,
        ],
        chainId: ARC_CHAIN_ID,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: txHash });

      const result = await api.confirmValidation({
        wallet: analyzedWallet,
        scoreId: score.analysisId,
        requestHash: prepared.requestHash,
        txHash,
        validatorAddress: prepared.validatorAddress,
        requestUri: prepared.requestUri,
      });

      setValidation(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request validation";
      if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
        setError("Transaction signature required to submit on-chain validation.");
      } else {
        setError(msg);
      }
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
                Wallet Address
              </label>
              <p className="text-xs text-white/40">
                Enter any address to analyze. Wallet connection is optional and only required for
                on-chain validation.
              </p>
            </div>
            {isConnected && address && (
              <button
                type="button"
                onClick={() => setWalletInput(address)}
                className="text-xs text-arc-400 hover:text-arc-300 whitespace-nowrap"
              >
                Use connected wallet
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <input
              id="wallet"
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-arc-500/50 placeholder:text-white/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-arc-600 hover:bg-arc-500 disabled:opacity-50 transition font-medium text-sm whitespace-nowrap"
            >
              {loading ? "Analyzing..." : "Analyze & Score"}
            </button>
          </div>

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
                Enter a wallet address to see the credit score
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
              canRequestValidation={canRequestValidation}
              validationHint={validationHint}
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
