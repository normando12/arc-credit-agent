import { v4 as uuidv4 } from "uuid";
import { ethers } from "ethers";
import { config } from "../config/index.js";
import {
  getAgentWallet,
  getValidationRegistry,
  getValidatorWallet,
} from "../blockchain/provider.js";
import { ipfsService } from "./ipfsService.js";
import * as repo from "../db/repository.js";
import { keccak256Json } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";
import type { ValidationRecord } from "../types/index.js";

interface ValidationRequestPayload {
  wallet: string;
  scoreId: string;
  creditScore: number;
  riskLevel: string;
  requestedAt: string;
}

export class ValidationService {
  private async buildValidationRequest(params: {
    wallet: string;
    scoreId: string;
    validatorAddress?: string;
  }): Promise<{
    requestHash: string;
    requestUri: string;
    validatorAddress: string;
    agentId: number;
    validationRegistry: string;
  }> {
    const agentWallet = getAgentWallet();
    if (!agentWallet) {
      throw new Error("AGENT_PRIVATE_KEY is required for validation requests");
    }

    const agentMeta = await repo.getAgentMetadata();
    const agentId = agentMeta?.agent_id ?? config.agent.agentId;
    if (!agentId) {
      throw new Error("Agent must be registered before requesting validation");
    }

    const score = await repo.getScoreById(params.scoreId);
    if (!score) {
      throw new Error("Credit score not found");
    }

    if (score.wallet.toLowerCase() !== params.wallet.toLowerCase()) {
      throw new Error("Score does not belong to the provided wallet");
    }

    const validatorAddress =
      params.validatorAddress ??
      getValidatorWallet()?.address ??
      agentWallet.address;

    const requestPayload: ValidationRequestPayload = {
      wallet: params.wallet,
      scoreId: params.scoreId,
      creditScore: score.credit_score,
      riskLevel: score.risk_level,
      requestedAt: new Date().toISOString(),
    };

    const requestUri = await ipfsService.uploadJson(
      requestPayload,
      `validation-request-${params.scoreId}.json`
    );
    const requestHash = keccak256Json(requestPayload);

    return {
      requestHash,
      requestUri,
      validatorAddress,
      agentId,
      validationRegistry: config.contracts.validationRegistry,
    };
  }

  async prepareValidationRequest(params: {
    wallet: string;
    scoreId: string;
    validatorAddress?: string;
  }) {
    return this.buildValidationRequest(params);
  }

  async confirmValidationRequest(params: {
    wallet: string;
    scoreId: string;
    requestHash: string;
    txHash: string;
    validatorAddress: string;
    requestUri: string;
  }): Promise<ValidationRecord> {
    const existing = await repo.getValidationByHash(params.requestHash);
    if (existing) {
      throw new Error("Validation request already recorded");
    }

    const score = await repo.getScoreById(params.scoreId);
    if (!score) {
      throw new Error("Credit score not found");
    }

    if (score.wallet.toLowerCase() !== params.wallet.toLowerCase()) {
      throw new Error("Score does not belong to the provided wallet");
    }

    const id = uuidv4();
    await repo.saveValidationRequest({
      id,
      requestHash: params.requestHash,
      scoreId: params.scoreId,
      wallet: params.wallet,
      validatorAddress: params.validatorAddress,
      requestUri: params.requestUri,
      txHash: params.txHash,
    });

    logger.info("Validation confirmed from client tx", {
      requestHash: params.requestHash,
      wallet: params.wallet,
      txHash: params.txHash,
    });

    return {
      id,
      requestHash: params.requestHash,
      wallet: params.wallet,
      scoreId: params.scoreId,
      validatorAddress: params.validatorAddress,
      status: "pending",
      txHash: params.txHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async requestValidation(params: {
    wallet: string;
    scoreId: string;
    validatorAddress?: string;
  }): Promise<ValidationRecord> {
    const agentWallet = getAgentWallet();
    if (!agentWallet) {
      throw new Error("AGENT_PRIVATE_KEY is required for validation requests");
    }

    const prepared = await this.buildValidationRequest(params);

    const registry = getValidationRegistry(agentWallet);
    const tx = await registry.validationRequest(
      prepared.validatorAddress,
      prepared.agentId,
      prepared.requestUri,
      prepared.requestHash
    );
    const receipt = await tx.wait();

    const id = uuidv4();
    await repo.saveValidationRequest({
      id,
      requestHash: prepared.requestHash,
      scoreId: params.scoreId,
      wallet: params.wallet,
      validatorAddress: prepared.validatorAddress,
      requestUri: prepared.requestUri,
      txHash: receipt.hash,
    });

    logger.info("Validation requested", { requestHash: prepared.requestHash, wallet: params.wallet });

    return {
      id,
      requestHash: prepared.requestHash,
      wallet: params.wallet,
      scoreId: params.scoreId,
      validatorAddress: prepared.validatorAddress,
      status: "pending",
      txHash: receipt.hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async submitValidation(params: {
    requestHash: string;
    approved: boolean;
    accuracy?: number;
    comment?: string;
  }): Promise<ValidationRecord> {
    const validator = getValidatorWallet();
    if (!validator) {
      throw new Error("VALIDATOR_PRIVATE_KEY is required to submit validation");
    }

    const existing = await repo.getValidationByHash(params.requestHash);
    if (!existing) {
      throw new Error("Validation request not found");
    }

    const responsePayload = {
      requestHash: params.requestHash,
      approved: params.approved,
      accuracy: params.accuracy,
      comment: params.comment,
      validatedAt: new Date().toISOString(),
    };

    const responseUri = await ipfsService.uploadJson(
      responsePayload,
      `validation-response-${params.requestHash.slice(0, 10)}.json`
    );
    const responseHash = keccak256Json(responsePayload);
    const responseCode = params.approved ? 1 : 0;

    const registry = getValidationRegistry(validator);
    const tx = await registry.validationResponse(
      params.requestHash,
      responseCode,
      responseUri,
      responseHash,
      "credit_scoring"
    );
    const receipt = await tx.wait();

    const status = params.approved ? "approved" : "rejected";
    await repo.updateValidationRequest(params.requestHash, {
      status,
      response: responseCode,
      responseUri,
      txHash: receipt.hash,
    });

    const agentMeta = await repo.getAgentMetadata();
    if (agentMeta?.agent_id) {
      await repo.saveReputationEntry({
        agentId: agentMeta.agent_id,
        validatorAddress: validator.address,
        evaluationType: "validation",
        score: params.approved ? 100 : 0,
        accuracy: params.accuracy,
        feedbackUri: responseUri,
        txHash: receipt.hash,
        metadata: { comment: params.comment, requestHash: params.requestHash },
      });
    }

    return {
      id: existing.id,
      requestHash: params.requestHash,
      wallet: existing.wallet,
      scoreId: existing.score_id,
      validatorAddress: validator.address,
      status,
      response: responseCode,
      responseUri,
      txHash: receipt.hash,
      createdAt: existing.created_at,
      updatedAt: new Date().toISOString(),
    };
  }

  async getValidationStatus(requestHash: string): Promise<ValidationRecord & { onChain?: unknown }> {
    const stored = await repo.getValidationByHash(requestHash);
    if (!stored) {
      throw new Error("Validation request not found");
    }

    let onChain;
    try {
      const registry = getValidationRegistry();
      const status = await registry.getValidationStatus(requestHash);
      onChain = {
        validatorAddress: status.validatorAddress,
        agentId: Number(status.agentId),
        response: Number(status.response),
        responseHash: status.responseHash,
        tag: status.tag,
        lastUpdate: Number(status.lastUpdate),
      };

      if (Number(status.response) > 0 && stored.status === "pending") {
        await repo.updateValidationRequest(requestHash, {
          status: "approved",
          response: Number(status.response),
        });
        stored.status = "approved";
      }
    } catch {
      logger.warn("Could not fetch on-chain validation status", { requestHash });
    }

    return {
      id: stored.id,
      requestHash: stored.request_hash,
      wallet: stored.wallet,
      scoreId: stored.score_id,
      validatorAddress: stored.validator_address,
      status: stored.status,
      response: stored.response,
      responseUri: stored.response_uri,
      txHash: stored.tx_hash,
      createdAt: stored.created_at,
      updatedAt: stored.updated_at,
      onChain,
    };
  }
}

export const validationService = new ValidationService();
