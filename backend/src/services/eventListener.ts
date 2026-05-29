import {
  getValidationRegistry,
  getReputationRegistry,
  getIdentityRegistry,
  getWsProvider,
} from "../blockchain/provider.js";
import * as repo from "../db/repository.js";
import { logger } from "../utils/logger.js";

export class EventListenerService {
  private listening = false;

  start(): void {
    if (this.listening) return;
    this.listening = true;

    try {
      const ws = getWsProvider();

      const validationRegistry = getValidationRegistry(ws);
      validationRegistry.on(
        "ValidationResponse",
        async (
          validatorAddress: string,
          agentId: bigint,
          requestHash: string,
          response: number
        ) => {
          logger.info("ValidationResponse event", {
            validatorAddress,
            agentId: Number(agentId),
            requestHash,
            response,
          });

          const status = response > 0 ? "approved" : "rejected";
          await repo.updateValidationRequest(requestHash, {
            status,
            response,
          });
        }
      );

      const reputationRegistry = getReputationRegistry(ws);
      reputationRegistry.on(
        "NewFeedback",
        async (
          agentId: bigint,
          clientAddress: string,
          feedbackIndex: bigint,
          value: bigint
        ) => {
          logger.info("NewFeedback event", {
            agentId: Number(agentId),
            clientAddress,
            feedbackIndex: Number(feedbackIndex),
            value: Number(value),
          });
        }
      );

      const identityRegistry = getIdentityRegistry(ws);
      identityRegistry.on(
        "Registered",
        async (agentId: bigint, agentURI: string, owner: string) => {
          logger.info("Agent Registered event", {
            agentId: Number(agentId),
            agentURI,
            owner,
          });
        }
      );

      ws.on("error", (error: Error) => {
        logger.error("WebSocket provider error", { error: error.message });
      });

      logger.info("Blockchain event listeners started");
    } catch (error) {
      logger.warn("Could not start WebSocket listeners — HTTP-only mode", {
        error: String(error),
      });
    }
  }
}

export const eventListenerService = new EventListenerService();
