import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/server/api-utils";
import { pool } from "@backend/db/client";
import { SCHEMA_SQL } from "@backend/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return jsonError("SETUP_SECRET not configured", 503);
  }

  const provided = req.headers.get("x-setup-secret");
  if (provided !== secret) {
    return jsonError("Unauthorized", 401);
  }

  try {
    await pool.query(SCHEMA_SQL);
    return jsonOk({ migrated: true, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return jsonError(message, 500);
  }
}
