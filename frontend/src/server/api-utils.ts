import { NextResponse } from "next/server";
import * as repo from "@backend/db/repository";

export const apiRuntime = "nodejs";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function mapErrorStatus(message: string): number {
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("Validation failed")) {
    return message.includes("Validation failed") ? 400 : 503;
  }
  return 500;
}

export async function audit(action: string, resource: string, metadata?: object) {
  try {
    await repo.saveAuditLog({
      action,
      resource,
      metadata: metadata ?? {},
    });
  } catch {
    /* non-blocking on serverless */
  }
}
