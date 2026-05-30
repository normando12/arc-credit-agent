import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Monorepo root .env (arc-credit-agent/.env)
const rootEnv = path.resolve(__dirname, "../../../.env");
// Fallback: backend/.env
const backendEnv = path.resolve(__dirname, "../../.env");

if (!process.env.VERCEL) {
  dotenv.config({ path: rootEnv });
  if (!process.env.AGENT_PRIVATE_KEY) {
    dotenv.config({ path: backendEnv });
  }
}

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function resolveDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_POSTGRES_URL,
    process.env.DATABASE_POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
  ];
  for (const value of candidates) {
    if (value?.trim()) return value.trim();
  }
  return "postgresql://arc_agent:arc_agent_dev@localhost:5432/arc_credit_agent";
}

export const config = {
  port: parseInt(optionalEnv("PORT", "3001"), 10),
  apiBaseUrl: optionalEnv(
    "API_BASE_URL",
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3001"
  ),
  corsOrigin: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),
  corsOrigins: optionalEnv("CORS_ORIGIN", "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  arc: {
    rpcUrl: optionalEnv("ARC_RPC_URL", "https://rpc.testnet.arc.network"),
    wsUrl: optionalEnv("ARC_WS_URL", "wss://rpc.testnet.arc.network"),
    chainId: parseInt(optionalEnv("ARC_CHAIN_ID", "5042002"), 10),
    explorerUrl: optionalEnv("ARC_EXPLORER_URL", "https://testnet.arcscan.app"),
    usdcAddress: "0x3600000000000000000000000000000000000000",
  },

  contracts: {
    identityRegistry: optionalEnv(
      "IDENTITY_REGISTRY",
      "0x8004A818BFB912233c491871b3d84c89A494BD9e"
    ),
    reputationRegistry: optionalEnv(
      "REPUTATION_REGISTRY",
      "0x8004B663056A597Dffe9eCcC1965A193B7388713"
    ),
    validationRegistry: optionalEnv(
      "VALIDATION_REGISTRY",
      "0x8004Cb1BF31DAf7788923b405b754f57acEB4272"
    ),
  },

  agent: {
    privateKey: process.env.AGENT_PRIVATE_KEY ?? "",
    validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY ?? "",
    name: optionalEnv("AGENT_NAME", "ARC Credit Agent"),
    version: optionalEnv("AGENT_VERSION", "1.0.0"),
    description: optionalEnv(
      "AGENT_DESCRIPTION",
      "AI-powered on-chain credit scoring agent."
    ),
    agentId: process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : null,
  },

  database: {
    url: resolveDatabaseUrl(),
  },

  ipfs: {
    pinataJwt: process.env.PINATA_JWT ?? "",
    gateway: optionalEnv("IPFS_GATEWAY", "https://gateway.pinata.cloud/ipfs/"),
  },

  rateLimit: {
    windowMs: parseInt(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000"), 10),
    max: parseInt(optionalEnv("RATE_LIMIT_MAX", "100"), 10),
  },
} as const;

export function getAgentRegistry(): string {
  return `eip155:${config.arc.chainId}:${config.contracts.identityRegistry}`;
}
