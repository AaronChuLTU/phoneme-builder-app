/**
 * app/api/word-lists/route.ts
 *
 *   GET  /api/word-lists   list every word list with a word count
 *   POST /api/word-lists   create a new word list
 */

import { prisma } from "@/lib/prisma";
import { ok, created, fail, handle, readJson } from "@/lib/api";
import { validateWordList } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const lists = await prisma.wordList.findMany({
      orderBy: { name: "asc" },
      include: {
        // _count avoids loading every word just to show how many there are.
        _count: { select: { words: true, activities: true } },
      },
    });

    return ok(
      lists.map((list) => ({
        id: list.id,
        name: list.name,
        description: list.description,
        wordCount: list._count.words,
        activityCount: list._count.activities,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      }))
    );
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    if (body === null) return fail("Request body must be valid JSON");

    const result = validateWordList(body);
    if (!result.ok) {
      return fail("Validation failed", 400, result.errors);
    }

    // A duplicate name trips the unique constraint, which handle() turns
    // into a 409 rather than a 500.
    const list = await prisma.wordList.create({ data: result.value });

    return created(list);
  });
}
