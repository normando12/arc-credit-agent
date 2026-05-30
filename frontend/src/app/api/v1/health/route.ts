import { jsonOk } from "@/server/api-utils";
import { healthCheck } from "@backend/db/client";
import { getNetworkStatus } from "@backend/blockchain/provider";

export const runtime = "nodejs";

export async function GET() {
  const [dbOk, network] = await Promise.all([healthCheck(), getNetworkStatus()]);
  return jsonOk({
    status: dbOk && network.connected ? "healthy" : "degraded",
    database: dbOk,
    blockchain: network,
    timestamp: new Date().toISOString(),
  });
}
