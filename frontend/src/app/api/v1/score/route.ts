import { NextRequest } from "next/server";
import { audit, jsonError, jsonOk, mapErrorStatus } from "@/server/api-utils";
import { creditAgentService } from "@backend/services/creditAgentService";
import { walletSchema } from "@backend/middleware/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = walletSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }
    const score = await creditAgentService.scoreWallet(parsed.data.wallet);
    await audit("wallet.score", "/api/v1/score", { wallet: parsed.data.wallet });
    return jsonOk(score);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
