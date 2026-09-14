/**
 * app/health/route.ts  ->  GET /health
 *
 * Liveness and readiness check. Returns 200 when the app is running AND can
 * reach the database; 503 when the app is up but the database is not.
 *
 * The distinction matters: a container that responds to HTTP but cannot query
 * its database is not actually able to serve requests, so reporting 200 in
 * that state would be a lie. Docker and orchestration tools use this endpoint
 * to decide whether a container is ready for traffic.
 *
 * Deliberately at /health rather than /api/health, because that is the
 * conventional location and what the assessment brief asks for.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never cache this: a cached health check would keep reporting the last known
// state instead of the current one.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    // The cheapest possible query that still proves the connection works.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
