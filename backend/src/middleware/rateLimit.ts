import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
});

export const scoreRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.max / 2),
  message: { error: "Score rate limit exceeded" },
});
