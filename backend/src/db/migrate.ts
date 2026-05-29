import { pool, query } from "./client.js";
import { SCHEMA_SQL } from "./schema.js";
import { logger } from "../utils/logger.js";

async function migrate(): Promise<void> {
  logger.info("Running database migrations...");
  await pool.query(SCHEMA_SQL);
  logger.info("Database migrations completed successfully");
  await pool.end();
}

migrate().catch((error) => {
  logger.error("Migration failed", { error: String(error) });
  process.exit(1);
});
