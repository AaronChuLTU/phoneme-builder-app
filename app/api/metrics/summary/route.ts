/**
 * app/api/metrics/summary/route.ts  ->  GET /api/metrics/summary
 *
 * The dashboard's data as JSON, for monitoring tools and load testing.
 * Uses the same getDashboardSummary() as the /dashboard page, so the page a
 * person reads and the JSON a tool reads always agree.
 */

import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/health";
import { getDashboardSummary } from "@/lib/metrics-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkHealth();
  try {
    const summary = await getDashboardSummary(health);
    return NextResponse.json(
      { data: { health, ...summary } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Summary failed:", error);
    return NextResponse.json(
      { error: "Could not build the metrics summary", health },
      { status: 500 }
    );
  }
}
