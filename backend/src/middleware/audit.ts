import type { Request, Response, NextFunction } from "express";
import * as repo from "../db/repository.js";

export function auditLog(action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      void repo.saveAuditLog({
        action,
        resource: req.originalUrl,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        metadata: {
          method: req.method,
          statusCode: res.statusCode,
          wallet: req.body?.wallet,
        },
      });
      return originalJson(body);
    };
    next();
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.message.includes("not found")
    ? 404
    : err.message.includes("required")
      ? 503
      : 500;

  res.status(status).json({
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
}
