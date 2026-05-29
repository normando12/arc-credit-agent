import { query } from "../db/client.js";
import type { WalletAnalysis, CreditScoreResult, ValidationRecord, ReputationMetrics } from "../types/index.js";

export async function saveAnalysis(analysis: WalletAnalysis) {
  const result = await query<{ id: string }>(
    `INSERT INTO wallet_analyses (
      wallet, transaction_count, wallet_age_days, first_activity_at, last_activity_at,
      balance_usdc, unique_contracts, defi_protocols, staking_interactions,
      lending_interactions, liquidity_pool_interactions, governance_interactions,
      asset_diversification_score, transaction_consistency_score,
      suspicious_activity, suspicious_flags, raw_analysis
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING id`,
    [
      analysis.wallet,
      analysis.transactionCount,
      analysis.walletAgeDays,
      analysis.firstActivityAt,
      analysis.lastActivityAt,
      analysis.balanceUsdc,
      analysis.uniqueContracts,
      JSON.stringify(analysis.defiProtocols),
      analysis.stakingInteractions,
      analysis.lendingInteractions,
      analysis.liquidityPoolInteractions,
      analysis.governanceInteractions,
      analysis.assetDiversificationScore,
      analysis.transactionConsistencyScore,
      analysis.suspiciousActivity,
      JSON.stringify(analysis.suspiciousFlags),
      JSON.stringify(analysis),
    ]
  );
  return result.rows[0].id;
}

export async function saveCreditScore(
  score: CreditScoreResult,
  analysisId: string
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO credit_scores (
      analysis_id, wallet, credit_score, risk_level, confidence, explanation, factors
    ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      analysisId,
      score.wallet,
      score.credit_score,
      score.risk_level,
      score.confidence,
      JSON.stringify(score.explanation),
      JSON.stringify(score.factors),
    ]
  );
  return result.rows[0].id;
}

export async function getLatestScore(wallet: string) {
  const result = await query(
    `SELECT * FROM credit_scores WHERE wallet = $1 ORDER BY created_at DESC LIMIT 1`,
    [wallet.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function getLatestAnalysis(wallet: string) {
  const result = await query(
    `SELECT * FROM wallet_analyses WHERE wallet = $1 ORDER BY created_at DESC LIMIT 1`,
    [wallet.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function saveAgentMetadata(data: {
  agentId: number;
  name: string;
  version: string;
  description: string;
  metadataUri: string;
  metadataJson: object;
  ownerAddress: string;
  txHash?: string;
}) {
  await query(
    `INSERT INTO agent_metadata (agent_id, name, version, description, metadata_uri, metadata_json, owner_address, tx_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (agent_id) DO UPDATE SET
       metadata_uri = EXCLUDED.metadata_uri,
       metadata_json = EXCLUDED.metadata_json,
       updated_at = NOW()`,
    [
      data.agentId,
      data.name,
      data.version,
      data.description,
      data.metadataUri,
      JSON.stringify(data.metadataJson),
      data.ownerAddress,
      data.txHash ?? null,
    ]
  );
}

export async function getAgentMetadata() {
  const result = await query(`SELECT * FROM agent_metadata ORDER BY id DESC LIMIT 1`);
  return result.rows[0] ?? null;
}

export async function saveValidationRequest(record: {
  id: string;
  requestHash: string;
  scoreId: string;
  wallet: string;
  validatorAddress: string;
  requestUri: string;
  txHash?: string;
}) {
  await query(
    `INSERT INTO validation_requests (id, request_hash, score_id, wallet, validator_address, status, request_uri, tx_hash)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)`,
    [
      record.id,
      record.requestHash,
      record.scoreId,
      record.wallet,
      record.validatorAddress,
      record.requestUri,
      record.txHash ?? null,
    ]
  );
}

export async function updateValidationRequest(
  requestHash: string,
  data: Partial<ValidationRecord>
) {
  await query(
    `UPDATE validation_requests SET
      status = COALESCE($2, status),
      response = COALESCE($3, response),
      response_uri = COALESCE($4, response_uri),
      response_hash = COALESCE($5, response_hash),
      tx_hash = COALESCE($6, tx_hash),
      updated_at = NOW()
     WHERE request_hash = $1`,
    [
      requestHash,
      data.status ?? null,
      data.response ?? null,
      data.responseUri ?? null,
      data.responseHash ?? null,
      data.txHash ?? null,
    ]
  );
}

export async function getValidationByHash(requestHash: string) {
  const result = await query(
    `SELECT * FROM validation_requests WHERE request_hash = $1`,
    [requestHash]
  );
  return result.rows[0] ?? null;
}

export async function getValidationsForWallet(wallet: string) {
  const result = await query(
    `SELECT * FROM validation_requests WHERE wallet = $1 ORDER BY created_at DESC`,
    [wallet.toLowerCase()]
  );
  return result.rows;
}

export async function saveReputationEntry(data: {
  agentId: number;
  validatorAddress: string;
  evaluationType: string;
  score?: number;
  accuracy?: number;
  feedbackUri?: string;
  txHash?: string;
  metadata?: object;
}) {
  await query(
    `INSERT INTO reputation_history (agent_id, validator_address, evaluation_type, score, accuracy, feedback_uri, tx_hash, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      data.agentId,
      data.validatorAddress,
      data.evaluationType,
      data.score ?? null,
      data.accuracy ?? null,
      data.feedbackUri ?? null,
      data.txHash ?? null,
      JSON.stringify(data.metadata ?? {}),
    ]
  );
}

export async function getReputationHistory(agentId: number) {
  const result = await query(
    `SELECT * FROM reputation_history WHERE agent_id = $1 ORDER BY created_at DESC`,
    [agentId]
  );
  return result.rows;
}

export async function getReputationMetrics(agentId: number): Promise<ReputationMetrics> {
  const history = await getReputationHistory(agentId);
  const evaluations = history.filter((h) => h.evaluation_type === "validation");
  const successful = evaluations.filter((e) => (e.score ?? 0) >= 70);

  const validatorReviews = history.map((h) => ({
    validatorAddress: h.validator_address,
    score: Number(h.score ?? 0),
    accuracy: Number(h.accuracy ?? 0),
    comment: (h.metadata as { comment?: string })?.comment,
    createdAt: h.created_at,
  }));

  const avgAccuracy =
    validatorReviews.length > 0
      ? validatorReviews.reduce((s, r) => s + r.accuracy, 0) / validatorReviews.length
      : 0;

  const reputationScore = Math.min(
    100,
    Math.round(successful.length * 10 + avgAccuracy * 0.5)
  );

  return {
    agentId,
    totalEvaluations: evaluations.length,
    successfulEvaluations: successful.length,
    averageAccuracy: Math.round(avgAccuracy * 100) / 100,
    reputationScore,
    validatorReviews,
  };
}

export async function saveAuditLog(data: {
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: object;
}) {
  await query(
    `INSERT INTO audit_logs (action, resource, ip_address, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      data.action,
      data.resource,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      JSON.stringify(data.metadata ?? {}),
    ]
  );
}

export async function getScoreById(scoreId: string) {
  const result = await query(`SELECT * FROM credit_scores WHERE id = $1`, [scoreId]);
  return result.rows[0] ?? null;
}
