/**
 * app/api/activities/[id]/generate/route.ts
 *
 *   GET /api/activities/:id/generate
 *
 * Loads a saved activity and its word list from the database, runs it through
 * the generators from Assessment 1, and returns the finished HTML as a file
 * download.
 *
 * This is the point of the whole assessment: the same generator functions are
 * used, unchanged, but their input now comes from stored data rather than
 * from React state. Because generateWordleHtml() and generateWordSearchHtml()
 * are pure functions — settings in, string out — nothing in them had to know
 * a database exists.
 *
 * Query parameters:
 *   ?wordId=N   pick a specific word for a Wordle (default: random from list)
 *   ?seed=N     fix the word search layout (default: random)
 */

import { prisma } from "@/lib/prisma";
import { fail, notFound, handle, parseId } from "@/lib/api";
import { generateWordleHtml } from "@/lib/generateWordle";
import { generateWordSearchHtml } from "@/lib/generateWordSearch";
import { buildPuzzle, DIRECTION_SETS } from "@/lib/wordSearch";

type Params = { params: Promise<{ id: string }> };

/** Filename safe across operating systems. */
function safeFilename(base: string) {
  const cleaned = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleaned || "activity"}.html`;
}

/** Return the HTML as a download rather than a page. */
function htmlDownload(html: string, filename: string) {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const search = new URL(request.url).searchParams;

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        wordList: {
          include: {
            words: {
              include: {
                // Ordering by position is what reassembles the sounds into a
                // word. Without it the phonemes could come back in any order.
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

    // Turn the stored rows back into the plain shape the generators expect.
    const words = activity.wordList.words.map((word) => ({
      id: word.id,
      word: word.english,
      phonemes: word.phonemes.map((wp) => wp.phoneme.symbol),
    }));

    if (words.length === 0) {
      return fail("That word list has no words to generate from", 400);
    }

    // ---------------------------------------------------------------
    // Wordle
    // ---------------------------------------------------------------
    if (activity.type === "WORDLE") {
      let chosen = words[Math.floor(Math.random() * words.length)];

      // A teacher can pin a specific word rather than taking a random one.
      const wordIdParam = search.get("wordId");
      if (wordIdParam !== null) {
        const wordId = parseId(wordIdParam);
        const match = words.find((w) => w.id === wordId);
        if (!match) {
          return fail("That word is not in this activity's word list", 400);
        }
        chosen = match;
      }

      const html = generateWordleHtml({
        phonemes: chosen.phonemes,
        english: chosen.word,
        maxGuesses: activity.maxGuesses,
        showHints: activity.showHints,
        // The answer must never appear in the title: it is shown on the page,
        // in the browser tab, and used for the filename.
        title: activity.name,
      });

      return htmlDownload(html, safeFilename(activity.name));
    }

    // ---------------------------------------------------------------
    // Word search
    // ---------------------------------------------------------------
    if (activity.type === "WORD_SEARCH") {
      // A grid can only hold so many words before it stops being solvable.
      const selected = words.slice(0, 8);

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

      return htmlDownload(html, safeFilename(activity.name));
    }

    // The validator prevents this, but the database column is a plain string,
    // so a value written by any other means still has to be handled.
    return fail(`Unknown activity type: ${activity.type}`, 400);
  });
}
