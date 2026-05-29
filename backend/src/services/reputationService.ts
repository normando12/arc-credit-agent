import { ethers } from "ethers";
import { config } from "../config/index.js";
import {
  getAgentWallet,
  getReputationRegistry,
  getValidatorWallet,
} from "../blockchain/provider.js";
import { ipfsService } from "./ipfsService.js";
import * as repo from "../db/repository.js";
import { keccak256Json } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

export class ReputationService {
  async submitFeedback(params: {
    agentId: number;
    value: number;
    valueDecimals?: number;
    tag1?: string;
    tag2?: string;
    comment?: string;
    accuracy?: number;
  }): Promise<{ txHash: string }> {
    const validator = getValidatorWallet();
    if (!validator) {
      throw new Error("VALIDATOR_PRIVATE_KEY is required for reputation feedback");
    }

    const registry = getReputationRegistry(validator);
    const feedbackPayload = {
      agentId: params.agentId,
      validator: validator.address,
      value: params.value,
      accuracy: params.accuracy,
      comment: params.comment,
      createdAt: new Date().toISOString(),
    };

    const feedbackUri = await ipfsService.uploadJson(
      feedbackPayload,
      `feedback-${params.agentId}-${Date.now()}.json`
    );
    const feedbackHash = keccak256Json(feedbackPayload);

    const tx = await registry.giveFeedback(
      params.agentId,
      params.value,
      params.valueDecimals ?? 0,
      params.tag1 ?? "credit_scoring",
      params.tag2 ?? "validation",
      config.apiBaseUrl,
      feedbackUri,
      feedbackHash
    );
    const receipt = await tx.wait();

    await repo.saveReputationEntry({
      agentId: params.agentId,
      validatorAddress: validator.address,
      evaluationType: "feedback",
      score: params.value,
      accuracy: params.accuracy,
      feedbackUri,
      txHash: receipt.hash,
      metadata: { comment: params.comment },
    });

    logger.info("Reputation feedback submitted", { agentId: params.agentId });
    return { txHash: receipt.hash };
  }

  async getOnChainSummary(agentId: number, clientAddresses: string[]) {
    const registry = getReputationRegistry();
    if (clientAddresses.length === 0) {
      const clients: string[] = await registry.getClients(agentId);
      clientAddresses = clients.slice(0, 10);
    }
    if (clientAddresses.length === 0) {
      return { count: 0, summaryValue: 0, summaryValueDecimals: 0 };
    }

    const [count, summaryValue, summaryValueDecimals] =
      await registry.getSummary(agentId, clientAddresses, "credit_scoring", "");

    return {
      count: Number(count),
      summaryValue: Number(summaryValue),
      summaryValueDecimals: Number(summaryValueDecimals),
    };
  }

  async getReputation(agentId?: number) {
    const id = agentId ?? config.agent.agentId ?? (await repo.getAgentMetadata())?.agent_id;
    if (!id) {
      return {
        agentId: null,
        message: "Agent not registered",
        totalEvaluations: 0,
        successfulEvaluations: 0,
        averageAccuracy: 0,
        reputationScore: 0,
        validatorReviews: [],
      };
    }

    const metrics = await repo.getReputationMetrics(id);
    try {
      const clients = await getReputationRegistry().getClients(id);
      metrics.onChainSummary = await this.getOnChainSummary(id, clients.slice(0, 5));
    } catch {
      logger.warn("Could not fetch on-chain reputation summary");
    }

    return metrics;
  }
}

export const reputationService = new ReputationService();
