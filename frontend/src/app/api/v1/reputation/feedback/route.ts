import { NextRequest } from "next/server";
import { audit, jsonError, jsonOk, mapErrorStatus } from "@/server/api-utils";
import { feedbackSchema } from "@backend/middleware/validation";
import { reputationService } from "@backend/services/reputationService";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }
    const result = await reputationService.submitFeedback(parsed.data);
    await audit("reputation.feedback", "/api/v1/reputation/feedback", { agentId: parsed.data.agentId });
    return jsonOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
