import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit, jsonError, mapErrorStatus } from "@/server/api-utils";
import { validateRequestSchema } from "@backend/middleware/validation";
import { validationService } from "@backend/services/validationService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    await audit("validation.prepare", "/api/v1/validate/prepare");
    const result = await validationService.prepareValidationRequest(parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
