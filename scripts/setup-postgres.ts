/**
 * PostgreSQL setup helper (Windows).
 * Requires postgres superuser password — default from EDB install: postgres
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const psql = "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe";
const sqlFile = path.join(__dirname, "setup-postgres.sql");

const superPassword = process.env.POSTGRES_PASSWORD ?? "postgres";

try {
  execSync(`"${psql}" -U postgres -h localhost -f "${sqlFile}"`, {
    env: { ...process.env, PGPASSWORD: superPassword },
    stdio: "inherit",
  });
  console.log("\n✅ PostgreSQL configured for ARC Credit Agent");
} catch {
  console.error("\n❌ Failed. Set POSTGRES_PASSWORD if different from 'postgres'");
  process.exit(1);
}
