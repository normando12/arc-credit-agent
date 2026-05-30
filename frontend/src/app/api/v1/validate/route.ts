import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit, jsonError, mapErrorStatus } from "@/server/api-utils";
import {
  validateRequestSchema,
  submitValidationSchema,
} from "@backend/middleware/validation";
import { validationService } from "@backend/services/validationService";

export const runtime = "nodejs";
export const maxDuration = 60;

const validateActionSchema = z.union([validateRequestSchema, submitValidationSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    await audit("validation", "/api/v1/validate");

    if ("requestHash" in parsed.data) {
      const result = await validationService.submitValidation(parsed.data);
      return NextResponse.json({ success: true, data: result, action: "submit" });
    }

    const result = await validationService.requestValidation(parsed.data);
    return NextResponse.json({ success: true, data: result, action: "request" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, mapErrorStatus(message));
  }
}
