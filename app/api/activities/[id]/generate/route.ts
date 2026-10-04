/**
 * app/api/activities/[id]/generate/route.ts
 *
 *   GET /api/activities/:id/generate
 *
 * Loads a saved activity and its word list, runs it through the generators
 * from Assessment 1, and returns the finished HTML as a download.
 *
 * Assessment 3: every attempt — success or failure — is now recorded as a
 * GenerationEvent with its duration and, if it failed, the reason. That is
 * where the dashboard's successful/failed generation counts, failure alerts
 * and most-used activity type come from.
 *
 * The recording wraps the generation rather than living inside it, so no
 * code path can return without being counted — including an unexpected
 * crash, which is caught and recorded as a failure.
 *
 * Query parameters:
 *   ?wordId=N   pick a specific word for a Wordle
 *   ?seed=N     fix the word search layout
 *   ?view=1     open in the browser instead of downloading
 */

import { prisma } from "@/lib/prisma";
import { fail, notFound, parseId } from "@/lib/api";
import { recordGeneration } from "@/lib/metrics";
import { generateWordleHtml } from "@/lib/generateWordle";
import { generateWordSearchHtml } from "@/lib/generateWordSearch";
import { buildPuzzle, DIRECTION_SETS } from "@/lib/wordSearch";

type Params = { params: Promise<{ id: string }> };

/** Filled in as generation progresses, so the event can be labelled even
 *  when generation fails partway through. */
type Context = { activityId: number | null; activityType: string };

export const dynamic = "force-dynamic";

function safeFilename(base: string) {
  const cleaned = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleaned || "activity"}.html`;
}

/**
 * Return the generated HTML. As an attachment by default (download), or
 * inline when ?view=1 is set, so the dashboard's Preview opens the game
 * directly in a browser tab.
 */
function htmlResponse(html: string, filename: string, inline: boolean) {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      // Stops the browser reusing a previous download for the same URL.
      "Cache-Control": "no-store",
    },
  });
}

/** Fisher-Yates shuffle, so each word search draws a different sample. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function generate(
  request: Request,
  rawId: string,
  ctx: Context
): Promise<Response> {
  const id = parseId(rawId);
  if (id === null) return fail("Invalid id");

  const search = new URL(request.url).searchParams;
  const inline = search.get("view") === "1";

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      wordList: {
        include: {
          words: {
            include: {
              phonemes: {
                orderBy: { position: "asc" },
                include: { phoneme: true },
              },
            },
          },
        },
      },
    },
  });

  if (!activity) return notFound("Activity");

  // From here on the event can be attributed to a real activity.
  ctx.activityId = activity.id;
  ctx.activityType = activity.type;

  const allWords = activity.wordList.words.map((word) => ({
    id: word.id,
    word: word.english,
    phonemes: word.phonemes.map((wp) => wp.phoneme.symbol),
  }));

  if (allWords.length === 0) {
    return fail("That word list has no words to generate from", 400);
  }

  // ---------------------------------------------------------------
  // Wordle
  // ---------------------------------------------------------------
  if (activity.type === "WORDLE") {
    const pool =
      activity.wordLength != null
        ? allWords.filter((w) => w.phonemes.length === activity.wordLength)
        : allWords;

    if (pool.length === 0) {
      return fail(
        `No words in this list have ${activity.wordLength} phonemes`,
        400
      );
    }

    let chosen = pool[Math.floor(Math.random() * pool.length)];

    const wordIdParam = search.get("wordId");
    if (wordIdParam !== null) {
      const wordId = parseId(wordIdParam);
      const match = pool.find((w) => w.id === wordId);
      if (!match) {
        return fail(
          "That word is not in this activity's word list and length filter",
          400
        );
      }
      chosen = match;
    }

    const html = generateWordleHtml({
      phonemes: chosen.phonemes,
      english: chosen.word,
      maxGuesses: activity.maxGuesses,
      showHints: activity.showHints,
      title: activity.name,
    });

    return htmlResponse(html, safeFilename(activity.name), inline);
  }

  // ---------------------------------------------------------------
  // Word search
  // ---------------------------------------------------------------
  if (activity.type === "WORD_SEARCH") {
    const selected = shuffled(allWords).slice(0, 8);

    const longest = selected.reduce(
      (max, w) => Math.max(max, w.phonemes.length),
      0
    );
    if (longest > activity.gridSize) {
      return fail(
        `The longest word has ${longest} phonemes but the grid is only ${activity.gridSize} wide`,
        400
      );
    }

    const seedParam = search.get("seed");
    const seed =
      seedParam !== null && Number.isFinite(Number(seedParam))
        ? Number(seedParam)
        : Math.floor(Math.random() * 100000);

    const directions =
      DIRECTION_SETS[activity.difficulty as keyof typeof DIRECTION_SETS] ??
      DIRECTION_SETS.medium;

    const puzzle = buildPuzzle({
      words: selected,
      rows: activity.gridSize,
      cols: activity.gridSize,
      directions,
      seed,
    });

    if (puzzle.placements.length === 0) {
      return fail("No words could be placed in a grid that size", 400);
    }

    const html = generateWordSearchHtml({
      grid: puzzle.grid,
      placements: puzzle.placements,
      showHints: activity.showHints,
      allowAnswers: activity.allowAnswers,
      title: activity.name,
    });

    return htmlResponse(html, safeFilename(activity.name), inline);
  }

  return fail(`Unknown activity type: ${activity.type}`, 400);
}

export async function GET(request: Request, { params }: Params) {
  const startedAt = performance.now();
  const ctx: Context = { activityId: null, activityType: "UNKNOWN" };
  const { id } = await params;

  let response: Response;
  try {
    response = await generate(request, id, ctx);
  } catch (error) {
    console.error("Generation crashed:", error);
    response = fail("Something went wrong while generating this activity", 500);
  }

  const success = response.status < 400;

  // Read the failure reason from the response the client will receive, so
  // the dashboard shows exactly the message the teacher saw.
  let errorMessage: string | null = null;
  if (!success) {
    try {
      const body = await response.clone().json();
      errorMessage =
        typeof body?.error === "string" ? body.error : `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}`;
    }
  }

  await recordGeneration({
    activityId: ctx.activityId,
    activityType: ctx.activityType,
    success,
    errorMessage,
    durationMs: Math.round(performance.now() - startedAt),
  });

  return response;
}
