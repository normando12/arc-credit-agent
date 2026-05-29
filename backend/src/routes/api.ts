import { Router } from "express";
import { z } from "zod";
import { config } from "../config/index.js";
import { creditAgentService } from "../services/creditAgentService.js";
import { identityService } from "../services/identityService.js";
import { reputationService } from "../services/reputationService.js";
import { validationService } from "../services/validationService.js";
import {
  validateBody,
  walletSchema,
  validateRequestSchema,
  submitValidationSchema,
  feedbackSchema,
} from "../middleware/validation.js";
import { auditLog } from "../middleware/audit.js";
import { scoreRateLimiter } from "../middleware/rateLimit.js";
import * as repo from "../db/repository.js";

const router = Router();

/** POST /analyze — Analyze wallet activity */
router.post(
  "/analyze",
  scoreRateLimiter,
  validateBody(walletSchema),
  auditLog("wallet.analyze"),
  async (req, res, next) => {
    try {
      const analysis = await creditAgentService.analyzeWallet(req.body.wallet);
      res.json({ success: true, data: analysis });
    } catch (error) {
      next(error);
    }
  }
);

/** POST /score — Generate credit score */
router.post(
  "/score",
  scoreRateLimiter,
  validateBody(walletSchema),
  auditLog("wallet.score"),
  async (req, res, next) => {
    try {
      const score = await creditAgentService.scoreWallet(req.body.wallet);
      res.json({ success: true, data: score });
    } catch (error) {
      next(error);
    }
  }
);

const validateActionSchema = z.union([validateRequestSchema, submitValidationSchema]);

/** POST /validate — Request or submit validation */
router.post(
  "/validate",
  (req, res, next) => {
    const result = validateActionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  },
  auditLog("validation"),
  async (req, res, next) => {
    try {
      if ("requestHash" in req.body) {
        const result = await validationService.submitValidation(req.body);
        res.json({ success: true, data: result, action: "submit" });
      } else {
        const result = await validationService.requestValidation(req.body);
        res.json({ success: true, data: result, action: "request" });
      }
    } catch (error) {
      next(error);
    }
  }
);

/** GET /validate/:requestHash — Get validation status */
router.get("/validate/:requestHash", async (req, res, next) => {
  try {
    const status = await validationService.getValidationStatus(req.params.requestHash);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/** GET /agent — Agent identity information */
router.get("/agent", async (_req, res, next) => {
  try {
    const agent = await identityService.getAgentInfo();
    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

/** GET /reputation — Reputation metrics */
router.get("/reputation", async (req, res, next) => {
  try {
    const agentId = req.query.agentId
      ? parseInt(req.query.agentId as string, 10)
      : undefined;
    const reputation = await reputationService.getReputation(agentId);
    res.json({ success: true, data: reputation });
  } catch (error) {
    next(error);
  }
});

/** POST /reputation/feedback — Submit validator feedback (on-chain) */
router.post(
  "/reputation/feedback",
  validateBody(feedbackSchema),
  auditLog("reputation.feedback"),
  async (req, res, next) => {
    try {
      const result = await reputationService.submitFeedback(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /wallet/:wallet/score — Latest score for wallet */
router.get("/wallet/:wallet/score", async (req, res, next) => {
  try {
    const score = await repo.getLatestScore(req.params.wallet);
    if (!score) {
      res.status(404).json({ error: "No score found for wallet" });
      return;
    }
    res.json({
      success: true,
      data: {
        wallet: score.wallet,
        credit_score: score.credit_score,
        risk_level: score.risk_level,
        confidence: score.confidence,
        explanation: score.explanation,
        scoredAt: score.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** GET /validator — Validator role info (no private keys) */
router.get("/validator", async (_req, res) => {
  const { getValidatorWallet, getAgentWallet } = await import(
    "../blockchain/provider.js"
  );
  const validator = getValidatorWallet();
  const agent = getAgentWallet();

  res.json({
    success: true,
    data: {
      validatorAddress: validator?.address ?? null,
      agentOwnerAddress: agent?.address ?? null,
      validationRegistry: config.contracts.validationRegistry,
      description:
        "O validador é uma wallet separada do dono do agente (regra ERC-8004). " +
        "Somente esta wallet pode chamar validationResponse() para aprovar ou rejeitar scores.",
      configured: Boolean(validator),
    },
  });
});

/** GET /wallet/:wallet/validations — Validation history for wallet */
router.get("/wallet/:wallet/validations", async (req, res, next) => {
  try {
    const validations = await repo.getValidationsForWallet(req.params.wallet);
    res.json({
      success: true,
      data: validations.map((v) => ({
        id: v.id,
        requestHash: v.request_hash,
        wallet: v.wallet,
        scoreId: v.score_id,
        validatorAddress: v.validator_address,
        status: v.status,
        response: v.response,
        txHash: v.tx_hash,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** GET /health — Health check */
router.get("/health", async (_req, res) => {
  const { healthCheck } = await import("../db/client.js");
  const { getNetworkStatus } = await import("../blockchain/provider.js");
  const [dbOk, network] = await Promise.all([healthCheck(), getNetworkStatus()]);
  res.json({
    status: dbOk && network.connected ? "healthy" : "degraded",
    database: dbOk,
    blockchain: network,
    timestamp: new Date().toISOString(),
  });
});

export default router;
