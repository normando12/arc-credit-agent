import { NextRequest } from "next/server";
import { jsonOk } from "@/server/api-utils";
import { reputationService } from "@backend/services/reputationService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const agentIdParam = req.nextUrl.searchParams.get("agentId");
  const agentId = agentIdParam ? parseInt(agentIdParam, 10) : undefined;
  const reputation = await reputationService.getReputation(agentId);
  return jsonOk(reputation);
}
