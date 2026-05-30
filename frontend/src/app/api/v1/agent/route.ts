import { jsonOk } from "@/server/api-utils";
import { identityService } from "@backend/services/identityService";

export const runtime = "nodejs";

export async function GET() {
  const agent = await identityService.getAgentInfo();
  return jsonOk(agent);
}
