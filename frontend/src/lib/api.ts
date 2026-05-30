import type { ValidationRecord, ValidatorInfo } from "./validation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function getApiUrl(): string {
  return API_URL;
}

export interface CreditScore {
  wallet: string;
  credit_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  explanation: string[];
  analysisId?: string;
  analysis?: WalletAnalysis;
  scoredAt: string;
}

export interface WalletAnalysis {
  wallet: string;
  transactionCount: number;
  walletAgeDays: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  balanceUsdc: string;
  uniqueContracts: number;
  defiProtocols: string[];
  stakingInteractions: number;
  lendingInteractions: number;
  liquidityPoolInteractions: number;
  governanceInteractions: number;
  assetDiversificationScore: number;
  transactionConsistencyScore: number;
  suspiciousActivity: boolean;
  suspiciousFlags: string[];
  analyzedAt: string;
}

export interface AgentInfo {
  registered: boolean;
  agentId?: number;
  agentRegistry?: string;
  owner?: string;
  metadataUri?: string;
  name?: string;
  version?: string;
  capabilities?: string[];
  message?: string;
}

export interface ReputationMetrics {
  agentId: number | null;
  totalEvaluations: number;
  successfulEvaluations: number;
  averageAccuracy: number;
  reputationScore: number;
  validatorReviews: Array<{
    validatorAddress: string;
    score: number;
    accuracy: number;
    createdAt: string;
  }>;
  onChainSummary?: {
    count: number;
    summaryValue: number;
  };
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(
      `API indisponível em ${API_URL}. Configure NEXT_PUBLIC_API_URL na Vercel e suba o backend (Railway/Render).`
    );
  }

  let data: { error?: string; data?: T };
  try {
    data = await res.json();
  } catch {
    throw new Error(`Resposta inválida da API (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    throw new Error(data.error ?? "API request failed");
  }
  return (data.data ?? data) as T;
}

export const api = {
  analyze: (wallet: string) =>
    fetchApi<WalletAnalysis>("/api/v1/analyze", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),

  score: (wallet: string) =>
    fetchApi<CreditScore>("/api/v1/score", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),

  getAgent: () => fetchApi<AgentInfo>("/api/v1/agent"),

  getReputation: () => fetchApi<ReputationMetrics>("/api/v1/reputation"),

  requestValidation: (wallet: string, scoreId: string) =>
    fetchApi<ValidationRecord>("/api/v1/validate", {
      method: "POST",
      body: JSON.stringify({ wallet, scoreId }),
    }),

  getValidationStatus: (requestHash: string) =>
    fetchApi<ValidationRecord>(`/api/v1/validate/${requestHash}`),

  getValidatorInfo: () => fetchApi<ValidatorInfo>("/api/v1/validator"),

  getHealth: () => fetchApi<{ status: string; blockchain: { connected: boolean } }>("/api/v1/health"),
};

export function riskColor(level: string): string {
  switch (level) {
    case "LOW":
      return "text-emerald-400";
    case "MEDIUM":
      return "text-amber-400";
    case "HIGH":
      return "text-orange-400";
    case "CRITICAL":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function riskBg(level: string): string {
  switch (level) {
    case "LOW":
      return "bg-emerald-500/20 border-emerald-500/30";
    case "MEDIUM":
      return "bg-amber-500/20 border-amber-500/30";
    case "HIGH":
      return "bg-orange-500/20 border-orange-500/30";
    case "CRITICAL":
      return "bg-red-500/20 border-red-500/30";
    default:
      return "bg-gray-500/20 border-gray-500/30";
  }
}

export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
