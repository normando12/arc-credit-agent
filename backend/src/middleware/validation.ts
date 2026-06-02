import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { isValidAddress, normalizeAddress } from "../utils/helpers.js";

export const walletSchema = z.object({
  wallet: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

export const scoreRequestSchema = walletSchema;

export const validateRequestSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  scoreId: z.string().uuid(),
  validatorAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
});

export const submitValidationSchema = z.object({
  requestHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  approved: z.boolean(),
  accuracy: z.number().min(0).max(100).optional(),
  comment: z.string().max(500).optional(),
});

export const confirmValidationSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  scoreId: z.string().uuid(),
  requestHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  validatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  requestUri: z.string().min(1),
});

export const feedbackSchema = z.object({
  agentId: z.number().int().positive(),
  value: z.number(),
  valueDecimals: z.number().int().min(0).max(18).optional(),
  tag1: z.string().optional(),
  tag2: z.string().optional(),
  comment: z.string().max(500).optional(),
  accuracy: z.number().min(0).max(100).optional(),
});

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function verifyWalletParam(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const wallet = req.body?.wallet ?? req.params?.wallet;
  if (!wallet || !isValidAddress(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  try {
    if (req.body?.wallet) req.body.wallet = normalizeAddress(wallet);
    if (req.params?.wallet) req.params.wallet = normalizeAddress(wallet);
    next();
  } catch {
    res.status(400).json({ error: "Invalid wallet address checksum" });
  }
}
