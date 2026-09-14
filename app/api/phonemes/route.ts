/**
 * app/api/phonemes/route.ts  ->  GET /api/phonemes
 *
 * The phoneme inventory and keyboard layout, read from the database.
 *
 * In Assessment 1 this lived in lib/phonemes.js as a hardcoded array. It is
 * now data, which means the keyboard layout can change without a code change.
 *
 * Read-only: the inventory is reference data seeded once, not something a
 * teacher edits. Adding a phoneme would change what every existing word can
 * be made of, so it is deliberately not exposed for editing through the API.
 */

import { prisma } from "@/lib/prisma";
import { ok, handle } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const phonemes = await prisma.phoneme.findMany({
      orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }],
    });

    // Rebuild the keyboard grid from the stored positions, including the
    // intentional gaps, so the client can render it without knowing the
    // layout rules.
    const rowCount = phonemes.reduce((max, p) => Math.max(max, p.rowIndex), -1) + 1;
    const colCount = phonemes.reduce((max, p) => Math.max(max, p.colIndex), -1) + 1;

    const rows: (string | null)[][] = Array.from({ length: rowCount }, () =>
      Array(colCount).fill(null)
    );
    for (const p of phonemes) {
      rows[p.rowIndex][p.colIndex] = p.symbol;
    }

    return ok({
      phonemes: phonemes.map((p) => ({
        symbol: p.symbol,
        label: p.label,
        example: p.example,
      })),
      keyboardRows: rows,
    });
  });
}
