/**
 * app/api/activities/route.ts
 *
 *   GET  /api/activities   every saved activity configuration
 *   POST /api/activities   save a new one
 *
 * An activity is a saved set of generation settings pointing at a word list.
 * One list can drive many activities — the same words as an easy Wordle and
 * as a hard word search — which is why the settings live here rather than on
 * the list itself.
 */

import { prisma } from "@/lib/prisma";
import { ok, created, fail, handle, readJson } from "@/lib/api";
import { validateActivity } from "@/lib/validation";

export async function GET(request: Request) {
  return handle(async () => {
    // Optional ?type=WORDLE filter, so the UI can show one kind at a time.
    const type = new URL(request.url).searchParams.get("type");

    const activities = await prisma.activity.findMany({
      where: type ? { type } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        wordList: {
          select: { id: true, name: true, _count: { select: { words: true } } },
        },
      },
    });

    return ok(
      activities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        showHints: a.showHints,
        maxGuesses: a.maxGuesses,
        gridSize: a.gridSize,
        difficulty: a.difficulty,
        allowAnswers: a.allowAnswers,
        wordList: {
          id: a.wordList.id,
          name: a.wordList.name,
          wordCount: a.wordList._count.words,
        },
        updatedAt: a.updatedAt,
      }))
    );
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    if (body === null) return fail("Request body must be valid JSON");

    const result = validateActivity(body);
    if (!result.ok) return fail("Validation failed", 400, result.errors);

    // Check the word list exists before writing. The foreign key would catch
    // it anyway, but a specific message is more useful than "referenced
    // record does not exist".
    const list = await prisma.wordList.findUnique({
      where: { id: result.value.wordListId },
      include: { _count: { select: { words: true } } },
    });
    if (!list) return fail("That word list does not exist", 400);
    if (list._count.words === 0) {
      return fail("That word list has no words, so no activity can be generated from it", 400);
    }

    const activity = await prisma.activity.create({ data: result.value });
    return created(activity);
  });
}
