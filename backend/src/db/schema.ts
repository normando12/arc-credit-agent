export const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agent_metadata (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER UNIQUE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  metadata_uri TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  owner_address VARCHAR(42),
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet VARCHAR(42) NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  wallet_age_days INTEGER NOT NULL DEFAULT 0,
  first_activity_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  balance_usdc NUMERIC(36, 18) NOT NULL DEFAULT 0,
  unique_contracts INTEGER NOT NULL DEFAULT 0,
  defi_protocols JSONB NOT NULL DEFAULT '[]',
  staking_interactions INTEGER NOT NULL DEFAULT 0,
  lending_interactions INTEGER NOT NULL DEFAULT 0,
  liquidity_pool_interactions INTEGER NOT NULL DEFAULT 0,
  governance_interactions INTEGER NOT NULL DEFAULT 0,
  asset_diversification_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  transaction_consistency_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  suspicious_activity BOOLEAN NOT NULL DEFAULT FALSE,
  suspicious_flags JSONB NOT NULL DEFAULT '[]',
  raw_analysis JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_analyses_wallet ON wallet_analyses (wallet);
CREATE INDEX IF NOT EXISTS idx_wallet_analyses_created ON wallet_analyses (created_at DESC);

CREATE TABLE IF NOT EXISTS credit_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES wallet_analyses(id) ON DELETE SET NULL,
  wallet VARCHAR(42) NOT NULL,
  credit_score INTEGER NOT NULL CHECK (credit_score >= 0 AND credit_score <= 1000),
  risk_level VARCHAR(20) NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  explanation JSONB NOT NULL DEFAULT '[]',
  factors JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_scores_wallet ON credit_scores (wallet);
CREATE INDEX IF NOT EXISTS idx_credit_scores_created ON credit_scores (created_at DESC);

CREATE TABLE IF NOT EXISTS validation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_hash VARCHAR(66) UNIQUE NOT NULL,
  score_id UUID REFERENCES credit_scores(id) ON DELETE CASCADE,
  wallet VARCHAR(42) NOT NULL,
  validator_address VARCHAR(42) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  request_uri TEXT,
  response INTEGER,
  response_uri TEXT,
  response_hash VARCHAR(66),
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_wallet ON validation_requests (wallet);
CREATE INDEX IF NOT EXISTS idx_validation_status ON validation_requests (status);

CREATE TABLE IF NOT EXISTS reputation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  validator_address VARCHAR(42) NOT NULL,
  evaluation_type VARCHAR(50) NOT NULL,
  score NUMERIC(10, 2),
  accuracy NUMERIC(5, 2),
  feedback_uri TEXT,
  tx_hash VARCHAR(66),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_agent ON reputation_history (agent_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
`;
