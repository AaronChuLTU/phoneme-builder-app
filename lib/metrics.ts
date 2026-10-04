/**
 * lib/metrics.ts
 *
 * Writing usage events.
 *
 * Both functions swallow their own errors. Recording a metric must never be
 * the reason a teacher's download fails — if the events table is somehow
 * unavailable, the activity still generates and the failure is logged to the
 * server console instead.
 */

import { prisma } from "@/lib/prisma";

export const PAGE_VIEW_LIMITS = {
  // Under half a second is a bounce or a redirect, not time spent reading.
  minMs: 500,
  // A tab left open overnight is not 9 hours of reading. Anything past 30
  // minutes is discarded rather than allowed to skew the average.
  maxMs: 30 * 60 * 1000,
  pathMax: 200,
};

export async function recordGeneration(event: {
  activityId: number | null;
  activityType: string;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
}): Promise<void> {
  try {
    await prisma.generationEvent.create({ data: event });
  } catch (error) {
    console.error("Could not record generation event:", error);
  }
}

export async function recordPageView(view: {
  path: string;
  durationMs: number;
}): Promise<void> {
  try {
    await prisma.pageView.create({ data: view });
  } catch (error) {
    console.error("Could not record page view:", error);
  }
}

/** Validate a page view report from the browser. Returns null if unusable. */
export function parsePageView(
  body: unknown
): { path: string; durationMs: number } | null {
  if (typeof body !== "object" || body === null) return null;
  const { path, durationMs } = body as Record<string, unknown>;

  if (typeof path !== "string") return null;
  if (!path.startsWith("/") || path.length > PAGE_VIEW_LIMITS.pathMax) {
    return null;
  }
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return null;
  }

  const rounded = Math.round(durationMs);
  if (rounded < PAGE_VIEW_LIMITS.minMs || rounded > PAGE_VIEW_LIMITS.maxMs) {
    return null;
  }

  return { path, durationMs: rounded };
}
