import { jsonError, jsonOk, mapErrorStatus } from "@/server/api-utils";
import { validationService } from "@backend/services/validationService";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ requestHash: string }> }
) {
  try {
    const { requestHash } = await params;
    const status = await validationService.getValidationStatus(requestHash);
    return jsonOk(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
