import { jsonError, jsonOk, mapErrorStatus } from "@/server/api-utils";
import * as repo from "@backend/db/repository";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const score = await repo.getLatestScore(wallet);
    if (!score) {
      return jsonError("No score found for wallet", 404);
    }
    return jsonOk({
      wallet: score.wallet,
      credit_score: score.credit_score,
      risk_level: score.risk_level,
      confidence: score.confidence,
      explanation: score.explanation,
      scoredAt: score.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
