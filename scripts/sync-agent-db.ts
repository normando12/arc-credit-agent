/**
 * Sync on-chain agent metadata to PostgreSQL after deploy.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const { identityService } = await import("../backend/src/services/identityService.js");
  const { getAgentWallet, getIdentityRegistry } = await import(
    "../backend/src/blockchain/provider.js"
  );
  const repo = await import("../backend/src/db/repository.js");
  const { config, getAgentRegistry } = await import("../backend/src/config/index.js");
  const { ipfsService } = await import("../backend/src/services/ipfsService.js");

  const agentId = config.agent.agentId;
  if (!agentId) throw new Error("AGENT_ID not set in .env");

  const wallet = getAgentWallet();
  const registry = getIdentityRegistry();
  const metadataUri = await registry.tokenURI(agentId);
  const agentRegistry = getAgentRegistry();
  const metadata = ipfsService.buildAgentMetadata(agentId, agentRegistry);

  await repo.saveAgentMetadata({
    agentId,
    name: config.agent.name,
    version: config.agent.version,
    description: config.agent.description,
    metadataUri,
    metadataJson: metadata,
    ownerAddress: wallet?.address ?? "",
  });

  console.log(`✅ Agent metadata synced to PostgreSQL (agentId: ${agentId})`);
  await import("../backend/src/db/client.js").then((m) => m.pool.end());
}

main().catch((err) => {
  console.error("Sync failed:", err.message ?? err);
  process.exit(1);
});
