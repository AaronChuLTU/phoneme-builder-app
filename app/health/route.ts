/**
 * app/health/route.ts  ->  GET /health
 *
 * 200 when the app is running AND the database answers; 503 otherwise.
 * The check itself lives in lib/health.ts so the dashboard shows the same
 * result this endpoint returns.
 */

import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkHealth();
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
