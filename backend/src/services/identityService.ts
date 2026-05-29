import { config, getAgentRegistry } from "../config/index.js";
import {
  getAgentWallet,
  getIdentityRegistry,
} from "../blockchain/provider.js";
import { ipfsService } from "./ipfsService.js";
import * as repo from "../db/repository.js";
import { logger } from "../utils/logger.js";

export class IdentityService {
  async register(): Promise<{ agentId: number; metadataUri: string; txHash: string }> {
    const wallet = getAgentWallet();
    if (!wallet) {
      throw new Error("AGENT_PRIVATE_KEY is required for on-chain registration");
    }

    const registry = getIdentityRegistry(wallet);
    const agentRegistry = getAgentRegistry();

    // Step 1: Register with placeholder URI to get agentId
    const placeholderUri = "ipfs://placeholder";
    logger.info("Registering agent on IdentityRegistry...");
    const tx = await registry.register(placeholderUri);
    const receipt = await tx.wait();

    const registeredEvent = receipt.logs
      .map((log: { topics: string[]; data: string }) => {
        try {
          return registry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: { name: string } | null) => e?.name === "Registered");

    const agentId = registeredEvent
      ? Number(registeredEvent.args.agentId)
      : await this.resolveAgentId(wallet.address);

    // Step 2: Build and upload full metadata
    const metadata = ipfsService.buildAgentMetadata(agentId, agentRegistry);
    const metadataUri = await ipfsService.uploadJson(
      metadata,
      `agent-${agentId}.json`
    );

    // Step 3: Update URI with full metadata
    const updateTx = await registry.setAgentURI(agentId, metadataUri);
    await updateTx.wait();

    await repo.saveAgentMetadata({
      agentId,
      name: config.agent.name,
      version: config.agent.version,
      description: config.agent.description,
      metadataUri,
      metadataJson: metadata,
      ownerAddress: wallet.address,
      txHash: receipt.hash,
    });

    logger.info("Agent registered successfully", { agentId, metadataUri });
    return { agentId, metadataUri, txHash: receipt.hash };
  }

  async upgradeMetadata(agentId: number): Promise<string> {
    const wallet = getAgentWallet();
    if (!wallet) {
      throw new Error("AGENT_PRIVATE_KEY is required");
    }

    const registry = getIdentityRegistry(wallet);
    const agentRegistry = getAgentRegistry();
    const metadata = ipfsService.buildAgentMetadata(agentId, agentRegistry);
    const metadataUri = await ipfsService.uploadJson(
      metadata,
      `agent-${agentId}-v${config.agent.version}.json`
    );

    const tx = await registry.setAgentURI(agentId, metadataUri);
    await tx.wait();

    await repo.saveAgentMetadata({
      agentId,
      name: config.agent.name,
      version: config.agent.version,
      description: config.agent.description,
      metadataUri,
      metadataJson: metadata,
      ownerAddress: wallet.address,
    });

    return metadataUri;
  }

  async getAgentInfo() {
    const stored = await repo.getAgentMetadata();
    const agentId = stored?.agent_id ?? config.agent.agentId;

    if (!agentId) {
      return {
        registered: false,
        metadata: ipfsService.buildAgentMetadata(0, getAgentRegistry()),
        message: "Agent not yet registered on-chain. Run npm run register:agent",
      };
    }

    const registry = getIdentityRegistry();
    let onChainUri = "";
    let owner = "";
    try {
      onChainUri = await registry.tokenURI(agentId);
      owner = await registry.ownerOf(agentId);
    } catch {
      logger.warn("Could not fetch on-chain agent data", { agentId });
    }

    return {
      registered: true,
      agentId,
      agentRegistry: getAgentRegistry(),
      owner,
      metadataUri: onChainUri || stored?.metadata_uri,
      metadata: stored?.metadata_json ?? ipfsService.buildAgentMetadata(agentId, getAgentRegistry()),
      name: stored?.name ?? config.agent.name,
      version: stored?.version ?? config.agent.version,
      capabilities: ["wallet_analysis", "credit_scoring", "risk_assessment"],
    };
  }

  private async resolveAgentId(ownerAddress: string): Promise<number> {
    const registry = getIdentityRegistry();
    const filter = registry.filters.Registered(null, null, ownerAddress);
    const events = await registry.queryFilter(filter);
    if (events.length === 0) {
      throw new Error("Could not resolve agentId from registration events");
    }
    const last = events[events.length - 1];
    if (!last || !("args" in last)) {
      throw new Error("Could not resolve agentId from registration events");
    }
    return Number(last.args[0]);
  }
}

export const identityService = new IdentityService();
