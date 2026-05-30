import { jsonError, jsonOk, mapErrorStatus } from "@/server/api-utils";
import * as repo from "@backend/db/repository";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const validations = await repo.getValidationsForWallet(wallet);
    return jsonOk(
      validations.map((v) => ({
        id: v.id,
        requestHash: v.request_hash,
        wallet: v.wallet,
        scoreId: v.score_id,
        validatorAddress: v.validator_address,
        status: v.status,
        response: v.response,
        txHash: v.tx_hash,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
