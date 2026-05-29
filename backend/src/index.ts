import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { eventListenerService } from "./services/eventListener.js";
import { logger } from "./utils/logger.js";

async function main() {
  const app = createApp();

  eventListenerService.start();

  app.listen(config.port, () => {
    logger.info(`ARC Credit Agent API running on port ${config.port}`, {
      chainId: config.arc.chainId,
      rpc: config.arc.rpcUrl,
    });
  });
}

main().catch((error) => {
  logger.error("Failed to start server", { error: String(error) });
  process.exit(1);
});
