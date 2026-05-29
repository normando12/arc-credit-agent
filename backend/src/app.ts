import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import apiRoutes from "./routes/api.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/audit.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use(apiRateLimiter);

  app.use("/api/v1", apiRoutes);

  app.get("/", (_req, res) => {
    res.json({
      name: config.agent.name,
      version: config.agent.version,
      description: config.agent.description,
      endpoints: [
        "POST /api/v1/analyze",
        "POST /api/v1/score",
        "POST /api/v1/validate",
        "GET  /api/v1/validate/:requestHash",
        "GET  /api/v1/agent",
        "GET  /api/v1/reputation",
        "GET  /api/v1/health",
      ],
    });
  });

  app.use(errorHandler);

  return app;
}
