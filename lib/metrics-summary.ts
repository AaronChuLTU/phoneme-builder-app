/**
 * lib/metrics-summary.ts
 *
 * Everything the dashboard shows, computed from the database on request.
 *
 * Split in two:
 *   - getDashboardSummary() runs the queries. Counts and averages use
 *     Prisma's count / groupBy / aggregate, so the database does the
 *     arithmetic and only small result sets come back.
 *   - The exported helpers below it (buildDailySeries, deriveAlerts, ...)
 *     are pure functions with no database access, so the logic that decides
 *     what counts as an alert can be tested without one.
 *
 * Used by both the /dashboard page and GET /api/metrics/summary, so the page
 * and the JSON a monitoring tool reads can never disagree.
 */

import { prisma } from "@/lib/prisma";
import type { HealthResult } from "@/lib/health";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SERIES_DAYS = 14;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = "error" | "warning" | "info";
export type Alert = { severity: Severity; title: string; detail: string };

export type DailyPoint = {
  date: string; // YYYY-MM-DD (UTC)
  label: string; // "3 Oct"
  success: number;
  failed: number;
};

export type WordListReport = {
  id: number;
  name: string;
  wordCount: number;
  byLength: Record<number, number>;
  invalidWords: number; // words with no phonemes
  activityCount: number;
};

export type ActivityCheck = {
  id: number;
  name: string;
  type: string;
  wordLength: number | null;
  gridSize: number;
  maxGuesses: number;
  difficulty: string;
  listId: number;
  listName: string;
  phonemeCounts: number[];
};

/** One activity, joined to the stored data it generates from and the
 *  outcome of every time it has been generated. */
export type ActivityReport = {
  id: number;
  name: string;
  type: string;
  settings: string;
  listId: number;
  listName: string;
  wordCount: number;
  eligibleWords: number;
  success: number;
  failed: number;
  lastGeneratedAt: string | null;
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Bucket generation events into one entry per day for the last `days` days,
 * including days with no activity — an empty day is information too.
 */
export function buildDailySeries(
  events: { createdAt: Date; success: boolean }[],
  days: number,
  now: Date
): DailyPoint[] {
  const points: DailyPoint[] = [];
  const index = new Map<string, DailyPoint>();

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(now.getTime() - offset * DAY_MS);
    const date = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const point = { date, label, success: 0, failed: 0 };
    points.push(point);
    index.set(date, point);
  }

  for (const event of events) {
    const point = index.get(event.createdAt.toISOString().slice(0, 10));
    if (!point) continue;
    if (event.success) point.success++;
    else point.failed++;
  }

  return points;
}

/** The activity type with the most generations, with its share. */
export function mostUsedType(
  counts: { type: string; count: number }[]
): { type: string; count: number; share: number } | null {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return null;
  const top = [...counts].sort((a, b) => b.count - a.count)[0];
  return { ...top, share: top.count / total };
}

/**
 * Decide which unusual states need flagging. Ordered most severe first.
 *
 * Each rule catches something that would otherwise only surface when a
 * teacher pressed Generate and got an error — the point is to warn before
 * that happens, not after.
 */
export function deriveAlerts(input: {
  health: HealthResult;
  failed24h: number;
  total24h: number;
  wordLists: WordListReport[];
  activities: ActivityCheck[];
}): Alert[] {
  const alerts: Alert[] = [];
  const { health, failed24h, total24h, wordLists, activities } = input;

  if (health.status !== "ok") {
    alerts.push({
      severity: "error",
      title: "Database unreachable",
      detail: "The health check could not query the database.",
    });
  }

  if (total24h > 0) {
    const rate = failed24h / total24h;
    if (rate > 0.1) {
      alerts.push({
        severity: "error",
        title: "High generation failure rate",
        detail: `${failed24h} of ${total24h} generations failed in the last 24 hours (${Math.round(rate * 100)}%).`,
      });
    } else if (failed24h > 0) {
      alerts.push({
        severity: "warning",
        title: "Recent failed generations",
        detail: `${failed24h} of ${total24h} generations failed in the last 24 hours.`,
      });
    }
  }

  // An activity whose settings can never succeed will fail every time it is
  // generated. Catch it from the configuration rather than waiting for it.
  for (const a of activities) {
    if (a.phonemeCounts.length === 0) {
      alerts.push({
        severity: "error",
        title: `"${a.name}" cannot generate`,
        detail: `Its word list "${a.listName}" has no words.`,
      });
      continue;
    }
    if (a.type === "WORDLE" && a.wordLength != null) {
      const matches = a.phonemeCounts.filter((n) => n === a.wordLength).length;
      if (matches === 0) {
        alerts.push({
          severity: "error",
          title: `"${a.name}" cannot generate`,
          detail: `It requires ${a.wordLength}-phoneme words, but "${a.listName}" has none.`,
        });
      } else if (matches < 3) {
        alerts.push({
          severity: "warning",
          title: `"${a.name}" has very few possible answers`,
          detail: `Only ${matches} word${matches === 1 ? "" : "s"} in "${a.listName}" match its ${a.wordLength}-phoneme filter, so learners will see repeats.`,
        });
      }
    }
    if (a.type === "WORD_SEARCH") {
      const tooLong = a.phonemeCounts.filter((n) => n > a.gridSize).length;
      if (tooLong > 0) {
        alerts.push({
          severity: "warning",
          title: `"${a.name}" may fail to generate`,
          detail: `${tooLong} word${tooLong === 1 ? " is" : "s are"} longer than its ${a.gridSize}×${a.gridSize} grid.`,
        });
      }
    }
  }

  for (const list of wordLists) {
    if (list.wordCount === 0) {
      alerts.push({
        severity: "warning",
        title: `Empty word list: "${list.name}"`,
        detail: "No activity can be generated from it until words are added.",
      });
    }
    if (list.invalidWords > 0) {
      alerts.push({
        severity: "error",
        title: `Invalid data in "${list.name}"`,
        detail: `${list.invalidWords} word${list.invalidWords === 1 ? " has" : "s have"} no phonemes stored.`,
      });
    }
  }

  if (total24h === 0) {
    alerts.push({
      severity: "info",
      title: "No generations in the last 24 hours",
      detail: "The system is healthy but idle.",
    });
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * How many stored words this activity can actually draw from, given its
 * settings. This is the link between configuration and stored data: a
 * Wordle filtered to 5 phonemes on a list with no 5-phoneme words has 0,
 * which is exactly why it fails.
 */
export function eligibleWordCount(a: ActivityCheck): number {
  if (a.type === "WORDLE" && a.wordLength != null) {
    return a.phonemeCounts.filter((n) => n === a.wordLength).length;
  }
  if (a.type === "WORD_SEARCH") {
    return a.phonemeCounts.filter((n) => n > 0 && n <= a.gridSize).length;
  }
  return a.phonemeCounts.filter((n) => n > 0).length;
}

export function settingsLabel(a: ActivityCheck): string {
  if (a.type === "WORDLE") {
    return `${a.maxGuesses} guesses · ${
      a.wordLength ? `${a.wordLength} phonemes` : "any length"
    }`;
  }
  return `${a.gridSize}×${a.gridSize} · ${a.difficulty}`;
}

/** "1m 24s", "45s", "0.8s" */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function typeLabel(type: string): string {
  if (type === "WORDLE") return "Wordle";
  if (type === "WORD_SEARCH") return "Word Search";
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getDashboardSummary(health: HealthResult) {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY_MS);
  const sinceSeries = new Date(now.getTime() - SERIES_DAYS * DAY_MS);

  const [
    activitiesByType,
    wordListRows,
    activityRows,
    generationTotal,
    generationSuccess,
    generationFailed,
    total24h,
    failed24h,
    generationsByType,
    seriesRows,
    recentFailures,
    outcomeRows,
    successDuration,
    pageViewAggregate,
    pageViewsByPath,
    simulatedGenerations,
    simulatedPageViews,
  ] = await Promise.all([
    prisma.activity.groupBy({ by: ["type"], _count: { _all: true } }),

    prisma.wordList.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { activities: true } },
        words: { select: { _count: { select: { phonemes: true } } } },
      },
    }),

    prisma.activity.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        wordLength: true,
        gridSize: true,
        maxGuesses: true,
        difficulty: true,
        wordList: {
          select: {
            id: true,
            name: true,
            words: { select: { _count: { select: { phonemes: true } } } },
          },
        },
      },
    }),

    prisma.generationEvent.count(),
    prisma.generationEvent.count({ where: { success: true } }),
    prisma.generationEvent.count({ where: { success: false } }),
    prisma.generationEvent.count({ where: { createdAt: { gte: since24h } } }),
    prisma.generationEvent.count({
      where: { createdAt: { gte: since24h }, success: false },
    }),

    prisma.generationEvent.groupBy({
      by: ["activityType"],
      _count: { _all: true },
    }),

    prisma.generationEvent.findMany({
      where: { createdAt: { gte: sinceSeries } },
      select: { createdAt: true, success: true },
    }),

    prisma.generationEvent.findMany({
      where: { success: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        activityType: true,
        errorMessage: true,
        durationMs: true,
        activity: { select: { name: true } },
      },
    }),

    // Success and failure counts per activity, plus when each was last
    // generated, in one grouped query.
    prisma.generationEvent.groupBy({
      by: ["activityId", "success"],
      where: { activityId: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),

    prisma.generationEvent.aggregate({
      where: { success: true },
      _avg: { durationMs: true },
    }),

    prisma.pageView.aggregate({
      _avg: { durationMs: true },
      _count: { _all: true },
    }),

    prisma.pageView.groupBy({
      by: ["path"],
      _avg: { durationMs: true },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
    }),

    prisma.generationEvent.count({ where: { simulated: true } }),
    prisma.pageView.count({ where: { simulated: true } }),
  ]);

  const wordLists: WordListReport[] = wordListRows.map((list) => {
    const counts = list.words.map((w) => w._count.phonemes);
    const byLength: Record<number, number> = {};
    for (const n of counts) byLength[n] = (byLength[n] ?? 0) + 1;
    return {
      id: list.id,
      name: list.name,
      wordCount: counts.length,
      byLength,
      invalidWords: counts.filter((n) => n === 0).length,
      activityCount: list._count.activities,
    };
  });

  const activities: ActivityCheck[] = activityRows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    wordLength: a.wordLength,
    gridSize: a.gridSize,
    maxGuesses: a.maxGuesses,
    difficulty: a.difficulty,
    listId: a.wordList.id,
    listName: a.wordList.name,
    phonemeCounts: a.wordList.words.map((w) => w._count.phonemes),
  }));

  const outcomes = new Map<
    number,
    { success: number; failed: number; last: Date | null }
  >();
  for (const row of outcomeRows) {
    if (row.activityId === null) continue;
    const entry = outcomes.get(row.activityId) ?? {
      success: 0,
      failed: 0,
      last: null,
    };
    if (row.success) entry.success += row._count._all;
    else entry.failed += row._count._all;
    const latest = row._max.createdAt;
    if (latest && (!entry.last || latest > entry.last)) entry.last = latest;
    outcomes.set(row.activityId, entry);
  }

  const activityReports: ActivityReport[] = activities
    .map((a) => {
      const o = outcomes.get(a.id);
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        settings: settingsLabel(a),
        listId: a.listId,
        listName: a.listName,
        wordCount: a.phonemeCounts.length,
        eligibleWords: eligibleWordCount(a),
        success: o?.success ?? 0,
        failed: o?.failed ?? 0,
        lastGeneratedAt: o?.last ? o.last.toISOString() : null,
      };
    })
    .sort((x, y) => y.success + y.failed - (x.success + x.failed));

  const typeCounts = generationsByType.map((row) => ({
    type: row.activityType,
    count: row._count._all,
  }));

  const createdCount = (type: string) =>
    activitiesByType.find((row) => row.type === type)?._count._all ?? 0;

  return {
    generatedAt: now.toISOString(),
    activities: {
      wordle: createdCount("WORDLE"),
      wordSearch: createdCount("WORD_SEARCH"),
      total: activityRows.length,
    },
    wordListCount: wordLists.length,
    totalWords: wordLists.reduce((sum, l) => sum + l.wordCount, 0),
    generations: {
      total: generationTotal,
      success: generationSuccess,
      failed: generationFailed,
      successRate: generationTotal > 0 ? generationSuccess / generationTotal : null,
      last24h: total24h,
      failedLast24h: failed24h,
      avgSuccessMs: successDuration._avg.durationMs,
      byType: typeCounts,
      mostUsed: mostUsedType(typeCounts),
    },
    pageViews: {
      total: pageViewAggregate._count._all,
      avgMs: pageViewAggregate._avg.durationMs,
      byPath: pageViewsByPath.map((row) => ({
        path: row.path,
        views: row._count.path,
        avgMs: row._avg.durationMs,
      })),
    },
    series: buildDailySeries(seriesRows, SERIES_DAYS, now),
    activityReports,
    recentFailures: recentFailures.map((f) => ({
      id: f.id,
      createdAt: f.createdAt.toISOString(),
      activity: f.activity?.name ?? null,
      activityType: f.activityType,
      errorMessage: f.errorMessage,
      durationMs: f.durationMs,
    })),
    wordLists,
    simulated: {
      generations: simulatedGenerations,
      pageViews: simulatedPageViews,
    },
    alerts: deriveAlerts({
      health,
      failed24h,
      total24h,
      wordLists,
      activities,
    }),
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
