/**
 * app/api/word-lists/[id]/route.ts
 *
 *   GET    /api/word-lists/:id   one list with its words and their phonemes
 *   PATCH  /api/word-lists/:id   rename or re-describe it
 *   DELETE /api/word-lists/:id   delete it, and its words, by cascade
 *
 * Note the params type: from Next.js 15 onwards route params arrive as a
 * Promise and must be awaited.
 */

import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, handle, parseId, readJson } from "@/lib/api";
import { validateWordList } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const list = await prisma.wordList.findUnique({
      where: { id },
      include: {
        words: {
          orderBy: { english: "asc" },
          include: {
            // Ordering by position is what turns the join rows back into a
            // word. Without it the phonemes could come back in any order.
            phonemes: {
              orderBy: { position: "asc" },
              include: { phoneme: true },
            },
          },
        },
      },
    });

    if (!list) return notFound("Word list");

    return ok({
      id: list.id,
      name: list.name,
      description: list.description,
      words: list.words.map((word) => ({
        id: word.id,
        english: word.english,
        phonemes: word.phonemes.map((wp) => wp.phoneme.symbol),
      })),
    });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const body = await readJson(request);
    if (body === null) return fail("Request body must be valid JSON");

    const result = validateWordList(body);
    if (!result.ok) return fail("Validation failed", 400, result.errors);

    const existing = await prisma.wordList.findUnique({ where: { id } });
    if (!existing) return notFound("Word list");

    const updated = await prisma.wordList.update({
      where: { id },
      data: result.value,
    });

    return ok(updated);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const existing = await prisma.wordList.findUnique({
      where: { id },
      include: { _count: { select: { words: true, activities: true } } },
    });
    if (!existing) return notFound("Word list");

    // Words and activities are removed by the cascade rules in the schema,
    // so one delete is enough — no orphaned rows are left behind.
    await prisma.wordList.delete({ where: { id } });

    return ok({
      deleted: true,
      id,
      removedWords: existing._count.words,
      removedActivities: existing._count.activities,
    });
  });
}
