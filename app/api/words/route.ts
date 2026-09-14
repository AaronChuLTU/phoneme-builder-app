/**
 * app/api/words/[id]/route.ts
 *
 *   GET    /api/words/:id   one word with its phonemes in order
 *   PATCH  /api/words/:id   change the spelling and/or the phonemes
 *   DELETE /api/words/:id   remove it
 */

import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, handle, parseId, readJson } from "@/lib/api";
import { validateWord } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const word = await prisma.word.findUnique({
      where: { id },
      include: {
        phonemes: { orderBy: { position: "asc" }, include: { phoneme: true } },
        wordList: { select: { id: true, name: true } },
      },
    });
    if (!word) return notFound("Word");

    return ok({
      id: word.id,
      english: word.english,
      phonemes: word.phonemes.map((wp) => wp.phoneme.symbol),
      wordList: word.wordList,
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

    const existing = await prisma.word.findUnique({ where: { id } });
    if (!existing) return notFound("Word");

    const inventory = await prisma.phoneme.findMany({
      select: { id: true, symbol: true },
    });
    const idBySymbol = new Map(inventory.map((p) => [p.symbol, p.id]));

    const result = validateWord(body, new Set(idBySymbol.keys()));
    if (!result.ok) return fail("Validation failed", 400, result.errors);

    const { english, phonemes } = result.value;

    // Changing a word's phonemes means replacing the whole sequence, not
    // patching individual rows: positions would collide with the unique
    // constraint if old and new rows overlapped. Both steps run in one
    // transaction so the word is never left with no phonemes.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.wordPhoneme.deleteMany({ where: { wordId: id } });

      return tx.word.update({
        where: { id },
        data: {
          english,
          phonemes: {
            create: phonemes.map((symbol, position) => ({
              phonemeId: idBySymbol.get(symbol)!,
              position,
            })),
          },
        },
        include: {
          phonemes: { orderBy: { position: "asc" }, include: { phoneme: true } },
        },
      });
    });

    return ok({
      id: updated.id,
      english: updated.english,
      phonemes: updated.phonemes.map((wp) => wp.phoneme.symbol),
    });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const existing = await prisma.word.findUnique({ where: { id } });
    if (!existing) return notFound("Word");

    // WordPhoneme rows go with it, by the cascade rule in the schema.
    await prisma.word.delete({ where: { id } });

    return ok({ deleted: true, id, english: existing.english });
  });
}
