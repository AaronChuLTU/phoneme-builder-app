/**
 * lib/health.ts
 *
 * One health check, used in two places: the /health endpoint and the
 * dashboard's status panel. Sharing it means the dashboard can never report
 * "healthy" using different logic from the endpoint Docker and JMeter poll.
 */

import { prisma } from "@/lib/prisma";

export type HealthResult = {
  status: "ok" | "error";
  database: "connected" | "unreachable";
  responseTimeMs: number;
  uptimeSeconds: number;
  timestamp: string;
};

export async function checkHealth(): Promise<HealthResult> {
  const startedAt = Date.now();
  let connected = true;

  try {
    // The cheapest query that still proves the database answers.
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Health check failed:", error);
    connected = false;
  }

  return {
    status: connected ? "ok" : "error",
    database: connected ? "connected" : "unreachable",
    responseTimeMs: Date.now() - startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
