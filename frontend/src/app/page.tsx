"use client";

import { useState, useEffect, useCallback } from "react";
import { ScoreGauge } from "@/components/ScoreGauge";
import { AgentIdentityCard } from "@/components/AgentIdentityCard";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import {
  api,
  type CreditScore,
  type WalletAnalysis,
  type AgentInfo,
  type ReputationMetrics,
} from "@/lib/api";
import type { ValidationRecord, ValidatorInfo } from "@/lib/validation";

export default function Dashboard() {
  const [wallet, setWallet] = useState("");
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
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setError("Informe um endereço Ethereum válido");
      return;
    }

    setLoading(true);
    setError(null);
    setValidation(null);

    try {
      const scoreData = await api.score(wallet);
      setScore(scoreData);
      setAnalysis(scoreData.analysis ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na análise");
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
      const msg = err instanceof Error ? err.message : "Falha ao solicitar validação";
      setError(
        msg.includes("AGENT_PRIVATE_KEY")
          ? "Servidor sem chave do agente configurada. Reinicie a API após configurar o .env."
          : msg
      );
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-arc-950 via-[#070b14] to-[#070b14]">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ARC Credit Agent</h1>
            <p className="text-sm text-white/50 mt-0.5">
              ERC-8004 · Arc Testnet · Explainable Credit Scoring
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          <label htmlFor="wallet" className="block text-sm font-medium text-white/70 mb-2">
            Endereço da Wallet
          </label>
          <div className="flex gap-3">
            <input
              id="wallet"
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-arc-500/50 placeholder:text-white/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-arc-600 hover:bg-arc-500 disabled:opacity-50 transition font-medium text-sm whitespace-nowrap"
            >
              {loading ? "Analisando..." : "Analisar & Score"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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
              <div className="glass rounded-2xl p-6 h-72 flex items-center justify-center text-white/40 text-sm">
                Nenhum score ainda
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
