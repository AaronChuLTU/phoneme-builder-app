/**
 * prisma/seed.ts
 *
 * Loads the HCE phoneme inventory and word corpus into the database.
 *
 * Everything here came from lib/phonemes.js, which held it as hardcoded
 * arrays in Assessment 1. That file is now the seed source rather than the
 * runtime source: the app reads from the database, and this script is how
 * the database gets its starting content.
 *
 * IDEMPOTENT BY DEFAULT: if the database already contains a word list, the
 * script logs a message and exits without touching anything. This matters
 * because docker-entrypoint.sh runs this script on every container start —
 * an unconditional wipe-and-reseed would silently erase any word a teacher
 * had added or edited every time the container restarted.
 *
 * To force a full reset back to the seeded corpus (for example, to return
 * to a known state before recording a demo), set FORCE_RESEED=1:
 *
 *   FORCE_RESEED=1 npm run db:seed
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  KEYBOARD_ROWS,
  PHONEME_HINTS,
  ALL_WORDS,
} from "../lib/phonemes.js";

/**
 * lib/phonemes.js is a plain .js file, so TypeScript infers PHONEME_HINTS as
 * an object with exactly 43 known keys rather than "any string maps to a
 * hint". `symbol` here is a plain string pulled out of KEYBOARD_ROWS, so
 * TypeScript cannot prove it is one of those 43 keys and refuses the direct
 * lookup. This helper does the same lookup through a signature that says
 * "any string in, a hint or undefined out" — which is also just true.
 */
function lookupHint(symbol: string): { label: string; example: string } | undefined {
  return (PHONEME_HINTS as Record<string, { label: string; example: string }>)[
    symbol
  ];
}

const prisma = new PrismaClient();

const CORPUS_NAME = "HCE Corpus";

async function clearAll() {
  // Order matters: rows that point at other rows must go first, or the
  // foreign keys refuse the delete.
  await prisma.wordPhoneme.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.word.deleteMany();
  await prisma.wordList.deleteMany();
  await prisma.phoneme.deleteMany();
}

async function seedPhonemes() {
  const idBySymbol = new Map<string, number>();

  for (let row = 0; row < KEYBOARD_ROWS.length; row++) {
    const cols = KEYBOARD_ROWS[row];
    for (let col = 0; col < cols.length; col++) {
      const symbol = cols[col];
      if (symbol === null) continue; // intentional gap in the layout

      const hint = lookupHint(symbol);
      const created = await prisma.phoneme.create({
        data: {
          symbol,
          label: hint?.label ?? symbol,
          example: hint?.example ?? "",
          rowIndex: row,
          colIndex: col,
        },
      });
      idBySymbol.set(symbol, created.id);
    }
  }

  return idBySymbol;
}

async function seedWords(idBySymbol: Map<string, number>) {
  const list = await prisma.wordList.create({
    data: {
      name: CORPUS_NAME,
      description:
        "The 90-word Hunter Central English corpus supplied with the assessment, grouped by phoneme count.",
    },
  });

  let created = 0;
  const skipped: string[] = [];

  for (const entry of ALL_WORDS) {
    const unknown = entry.phonemes.filter(
      (symbol: string) => !idBySymbol.has(symbol)
    );
    if (unknown.length > 0) {
      skipped.push(`${entry.word} (unknown: ${unknown.join(", ")})`);
      continue;
    }

    await prisma.word.create({
      data: {
        english: entry.word,
        wordListId: list.id,
        phonemes: {
          create: entry.phonemes.map((symbol: string, position: number) => ({
            phonemeId: idBySymbol.get(symbol)!,
            position,
          })),
        },
      },
    });
    created++;
  }

  return { list, created, skipped };
}

async function seedActivities(wordListId: number) {
  await prisma.activity.create({
    data: {
      name: "Sample Wordle — three phonemes",
      type: "WORDLE",
      wordListId,
      showHints: true,
      maxGuesses: 6,
    },
  });

  await prisma.activity.create({
    data: {
      name: "Sample Word Search — medium",
      type: "WORD_SEARCH",
      wordListId,
      showHints: true,
      gridSize: 10,
      difficulty: "medium",
      allowAnswers: true,
    },
  });
}

async function main() {
  const existingLists = await prisma.wordList.count();
  const force = process.env.FORCE_RESEED === "1";

  if (existingLists > 0 && !force) {
    console.log(
      `Database already has ${existingLists} word list(s) — skipping seed. ` +
        `Set FORCE_RESEED=1 to wipe and reseed.`
    );
    return;
  }

  if (force) {
    console.log("FORCE_RESEED=1 set — clearing existing data...");
  }
  await clearAll();

  console.log("Seeding phonemes...");
  const idBySymbol = await seedPhonemes();
  console.log(`  ${idBySymbol.size} phonemes`);

  console.log("Seeding words...");
  const { list, created, skipped } = await seedWords(idBySymbol);
  console.log(`  ${created} words in "${list.name}"`);
  if (skipped.length > 0) {
    console.warn(`  skipped ${skipped.length}:`);
    for (const s of skipped) console.warn(`    ${s}`);
  }

  console.log("Seeding sample activities...");
  await seedActivities(list.id);

  const counts = {
    phonemes: await prisma.phoneme.count(),
    wordLists: await prisma.wordList.count(),
    words: await prisma.word.count(),
    wordPhonemes: await prisma.wordPhoneme.count(),
    activities: await prisma.activity.count(),
  };
  console.log("\nDone:", counts);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
