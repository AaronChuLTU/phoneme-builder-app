/**
 * app/api/word-lists/[id]/words/route.ts
 *
 *   POST /api/word-lists/:id/words   add a word to this list
 *
 * Nested under the list because a word cannot exist without one. Putting the
 * list id in the path rather than the body means the relationship is part of
 * the address, and a request cannot be ambiguous about which list it targets.
 */

import { prisma } from "@/lib/prisma";
import { created, fail, notFound, handle, parseId, readJson } from "@/lib/api";
import { validateWord } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const wordListId = parseId(raw);
    if (wordListId === null) return fail("Invalid word list id");

    const body = await readJson(request);
    if (body === null) return fail("Request body must be valid JSON");

    const list = await prisma.wordList.findUnique({ where: { id: wordListId } });
    if (!list) return notFound("Word list");

    // Fetch the inventory once and hand it to the validator, rather than
    // querying per phoneme.
    const inventory = await prisma.phoneme.findMany({
      select: { id: true, symbol: true },
    });
    const idBySymbol = new Map(inventory.map((p) => [p.symbol, p.id]));

    const result = validateWord(body, new Set(idBySymbol.keys()));
    if (!result.ok) return fail("Validation failed", 400, result.errors);

    const { english, phonemes } = result.value;

    // The Word and its WordPhoneme rows are written together, so a word can
    // never exist without its sounds.
    const word = await prisma.word.create({
      data: {
        english,
        wordListId,
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

    return created({
      id: word.id,
      english: word.english,
      phonemes: word.phonemes.map((wp) => wp.phoneme.symbol),
    });
  });
}
