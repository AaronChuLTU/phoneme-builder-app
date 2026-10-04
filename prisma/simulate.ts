/**
 * prisma/simulate.ts
 *
 * Creates simulated usage records — generation events and page views spread
 * over the last 14 days — so the dashboard has realistic history to show.
 *
 * Every row it writes is marked simulated: true. The dashboard reports how
 * many of its records are simulated, and `--clear` removes exactly these
 * rows while leaving real usage untouched.
 *
 * Uses a seeded random number generator (the same mulberry32 used for word
 * search layouts), so running it twice produces the same data — useful for
 * a repeatable demo.
 *
 *   npm run db:simulate            add simulated records
 *   npm run db:simulate -- --clear remove simulated records only
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

const DAYS = 14;
const GENERATIONS = 420;
const PAGE_VIEWS = 900;
const FAILURE_RATE = 0.07;

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20261003);

function pickWeighted<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/**
 * A timestamp within the last DAYS days, during school hours on weekdays
 * more often than not, and weighted toward recent days so the 14-day chart
 * shows growth rather than flat noise.
 */
function randomTimestamp(now: number): Date {
  const dayOffset = Math.floor(Math.pow(random(), 1.6) * DAYS);
  const day = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
  const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
  // Skip most weekend traffic by re-rolling into a weekday.
  if (isWeekend && random() < 0.7) return randomTimestamp(now);
  // 22:00–08:00 UTC is roughly 8am–6pm in Melbourne.
  const hour = (22 + Math.floor(random() * 10)) % 24;
  day.setUTCHours(hour, Math.floor(random() * 60), Math.floor(random() * 60), 0);
  return day.getTime() > now ? new Date(now - random() * 3600_000) : day;
}

/** Roughly log-normal: most visits are near the typical length, a few long. */
function visitLength(typicalSeconds: number): number {
  const spread = Math.exp((random() + random() + random() - 1.5) * 1.1);
  return Math.round(typicalSeconds * spread * 1000);
}

/**
 * Simulated failures are attributed to activities that no longer exist,
 * never to the current ones. The current activities are valid — a
 * "three phonemes" Wordle over a list with 30 three-phoneme words cannot
 * fail — so pinning failures to them would show reasons that contradict
 * their own settings.
 *
 * Instead each failure looks like what really happens: a teacher created an
 * activity with a bad setting, it failed a few times, and they deleted it.
 * Because GenerationEvent uses onDelete: SetNull, that history survives the
 * delete with its type and reason intact — which is the point of SetNull.
 */
const DELETED_ACTIVITY_FAILURES = [
  { value: { activityType: "WORDLE", errorMessage: "No words in this list have 6 phonemes" }, weight: 4 },
  { value: { activityType: "WORDLE", errorMessage: "That word list has no words to generate from" }, weight: 2 },
  { value: { activityType: "WORD_SEARCH", errorMessage: "The longest word has 5 phonemes but the grid is only 4 wide" }, weight: 3 },
  { value: { activityType: "WORD_SEARCH", errorMessage: "No words could be placed in a grid that size" }, weight: 1 },
  // A stale bookmark or shared link to an activity id that is gone.
  { value: { activityType: "UNKNOWN", errorMessage: "Activity not found" }, weight: 2 },
];

// Typical seconds on each page — the builders take longest, as expected for
// pages where a teacher is configuring something.
const PAGES = [
  { value: { path: "/", typical: 18 }, weight: 20 },
  { value: { path: "/wordle", typical: 95 }, weight: 18 },
  { value: { path: "/word-search", typical: 110 }, weight: 15 },
  { value: { path: "/manage", typical: 40 }, weight: 10 },
  { value: { path: "/manage/1", typical: 150 }, weight: 9 },
  { value: { path: "/manage/activities", typical: 60 }, weight: 12 },
  { value: { path: "/dashboard", typical: 75 }, weight: 8 },
  { value: { path: "/about", typical: 35 }, weight: 4 },
  { value: { path: "/settings", typical: 20 }, weight: 4 },
];

async function clear() {
  const [g, p] = await prisma.$transaction([
    prisma.generationEvent.deleteMany({ where: { simulated: true } }),
    prisma.pageView.deleteMany({ where: { simulated: true } }),
  ]);
  console.log(`Removed ${g.count} simulated generations and ${p.count} simulated page views.`);
}

async function simulate() {
  const activities = await prisma.activity.findMany({
    select: { id: true, type: true },
  });
  if (activities.length === 0) {
    throw new Error("No activities exist. Run npm run db:seed first.");
  }

  const now = Date.now();

  // Wordles generated more often than word searches, so "most-used type"
  // has a clear answer rather than a coin flip.
  const weighted = activities.map((a) => ({
    value: a,
    weight: a.type === "WORDLE" ? 3 : 2,
  }));

  const generations = Array.from({ length: GENERATIONS }, () => {
    const createdAt = randomTimestamp(now);

    if (random() < FAILURE_RATE) {
      const failure = pickWeighted(DELETED_ACTIVITY_FAILURES);
      return {
        activityId: null, // the activity was deleted afterwards
        activityType: failure.activityType,
        success: false,
        errorMessage: failure.errorMessage,
        // Failures are fast: they stop at a check before any HTML is built.
        durationMs: 4 + Math.floor(random() * 20),
        simulated: true,
        createdAt,
      };
    }

    const activity = pickWeighted(weighted);
    return {
      activityId: activity.id,
      activityType: activity.type,
      success: true,
      errorMessage: null,
      durationMs: 25 + Math.floor(random() * 140),
      simulated: true,
      createdAt,
    };
  });

  const pageViews = Array.from({ length: PAGE_VIEWS }, () => {
    const page = pickWeighted(PAGES);
    return {
      path: page.path,
      durationMs: Math.min(visitLength(page.typical), 30 * 60 * 1000),
      simulated: true,
      createdAt: randomTimestamp(now),
    };
  });

  await prisma.generationEvent.createMany({ data: generations });
  await prisma.pageView.createMany({ data: pageViews });

  const failures = generations.filter((g) => !g.success).length;
  console.log(
    `Added ${generations.length} simulated generations (${failures} failed) and ${pageViews.length} page views over ${DAYS} days.`
  );
}

const run = process.argv.includes("--clear") ? clear : simulate;

run()
  .catch((error) => {
    console.error("Simulation failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
