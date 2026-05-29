import { identityService } from "../src/services/identityService.js";
import { logger } from "../src/utils/logger.js";

async function main() {
  logger.info("Starting ERC-8004 agent registration...");
  const result = await identityService.register();
  console.log("\n✅ Agent registered successfully!");
  console.log(`   Agent ID:      ${result.agentId}`);
  console.log(`   Metadata URI:  ${result.metadataUri}`);
  console.log(`   TX Hash:       ${result.txHash}`);
  console.log(`\n   Add to .env:   AGENT_ID=${result.agentId}\n`);
}

main().catch((error) => {
  logger.error("Registration failed", { error: String(error) });
  process.exit(1);
});
