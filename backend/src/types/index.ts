export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

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

export interface CreditScoreResult {
  wallet: string;
  credit_score: number;
  risk_level: RiskLevel;
  confidence: number;
  explanation: string[];
  factors: ScoreFactor[];
  analysisId?: string;
  analysis?: WalletAnalysis;
  scoredAt: string;
}

export interface ScoreFactor {
  name: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  description: string;
}

export interface AgentMetadata {
  type: string;
  name: string;
  version: string;
  description: string;
  image?: string;
  capabilities: string[];
  services: AgentService[];
  registrations: AgentRegistration[];
  supportedTrust: string[];
}

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
}

export interface AgentRegistration {
  agentId: number;
  agentRegistry: string;
}

export interface ValidationRequestPayload {
  wallet: string;
  scoreId: string;
  validatorAddress?: string;
}

export interface ValidationRecord {
  id: string;
  requestHash: string;
  wallet: string;
  scoreId: string;
  validatorAddress: string;
  status: "pending" | "approved" | "rejected" | "expired";
  response?: number;
  responseUri?: string;
  responseHash?: string;
  txHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReputationMetrics {
  agentId: number;
  totalEvaluations: number;
  successfulEvaluations: number;
  averageAccuracy: number;
  reputationScore: number;
  validatorReviews: ValidatorReview[];
  onChainSummary?: {
    count: number;
    summaryValue: number;
    summaryValueDecimals: number;
  };
}

export interface ValidatorReview {
  validatorAddress: string;
  score: number;
  accuracy: number;
  comment?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
