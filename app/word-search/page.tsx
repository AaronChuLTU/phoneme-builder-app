"use client";

/**
 * Word Search Builder
 *
 * The teacher picks phoneme words from the corpus, sets the grid size and
 * difficulty, previews the exact puzzle, and downloads it as a single HTML
 * file.
 *
 * Design notes for the justification:
 *
 *  - buildPuzzle() is seeded rather than calling Math.random() internally, so
 *    the preview and the downloaded file are guaranteed to be the same puzzle.
 *    "Shuffle" simply picks a new seed.
 *
 *  - The word list is fixed at this stage, as the brief allows. Assessment 2
 *    introduces database-backed word lists; because words are passed into
 *    buildPuzzle() as a plain array, only the source of that array changes.
 */

import { useMemo, useState } from "react";
import { ALL_WORDS } from "@/lib/phonemes";
import { buildPuzzle, DIRECTION_SETS } from "@/lib/wordSearch";
import { generateWordSearchHtml } from "@/lib/generateWordSearch";
import { downloadFile, safeFilename } from "@/lib/download";
import PageHeader from "@/components/PageHeader";

type Level = "easy" | "medium" | "hard";
type Entry = { word: string; phonemes: string[] };

const LEVEL_LABELS: Record<Level, string> = {
  easy: "Easy — across and down only",
  medium: "Medium — adds diagonals",
  hard: "Hard — all eight directions, including backwards",
};

const DEFAULT_WORDS = ["thin", "ship", "frog", "train", "stamp"];
const MAX_WORDS = 8;

export default function WordSearchBuilder() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_WORDS);
  const [size, setSize] = useState(10);
  const [level, setLevel] = useState<Level>("medium");
  const [showHints, setShowHints] = useState(true);
  const [allowAnswers, setAllowAnswers] = useState(true);
  const [seed, setSeed] = useState(42);

  const corpusWords = useMemo(
    () =>
      selected
        .map((name) => ALL_WORDS.find((entry) => entry.word === name))
        .filter((entry): entry is Entry => Boolean(entry)),
    [selected]
  );

  const words = corpusWords;

  const total = words.length;
  const atLimit = total >= MAX_WORDS;

  const puzzle = useMemo(
    () =>
      buildPuzzle({
        words,
        rows: size,
        cols: size,
        directions: DIRECTION_SETS[level],
        seed,
      }),
    [words, size, level, seed]
  );

  // The longest word must fit inside the grid.
  const longest = words.reduce((max, w) => Math.max(max, w.phonemes.length), 0);
  const tooSmall = longest > size;

  function toggleWord(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : atLimit
          ? current
          : [...current, name]
    );
  }

  function handleGenerate() {
    if (words.length === 0 || tooSmall) return;
    const html = generateWordSearchHtml({
      grid: puzzle.grid,
      placements: puzzle.placements,
      showHints,
      allowAnswers,
      title: "Phoneme Word Search",
    });
    downloadFile(safeFilename("phoneme-word-search"), html);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Word Search Builder">
        Choose up to {MAX_WORDS} phoneme words from the preset word list (custom word generator coming soon), check the preview, then
        download the puzzle as a single HTML file.
      </PageHeader>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- */}
        {/* Settings                                                   */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col gap-6">
          <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">
              Words ({total}/{MAX_WORDS})
            </legend>

            <div className="max-h-64 overflow-y-auto pr-1">
              <ul className="flex flex-col gap-1">
                {ALL_WORDS.map((entry) => {
                  const isChecked = selected.includes(entry.word);
                  const blocked = !isChecked && atLimit;
                  return (
                    <li key={entry.word}>
                      <label
                        className={`flex items-center gap-2 rounded px-1 py-0.5 text-sm ${
                          blocked ? "opacity-40" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={blocked}
                          onChange={() => toggleWord(entry.word)}
                        />
                        <span className="w-16">{entry.word}</span>
                        <span className="ipa text-[var(--text-muted)]">
                          {entry.phonemes.join(" ")}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

          </fieldset>

          <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">
              Puzzle settings
            </legend>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Difficulty</span>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                >
                  {(Object.keys(LEVEL_LABELS) as Level[]).map((key) => (
                    <option key={key} value={key}>
                      {LEVEL_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  Grid size: {size} × {size}
                </span>
                <input
                  type="range"
                  min={8}
                  max={16}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showHints}
                  onChange={(e) => setShowHints(e.target.checked)}
                />
                Show English spelling in the word list
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowAnswers}
                  onChange={(e) => setAllowAnswers(e.target.checked)}
                />
                Include a &quot;Show answers&quot; button
              </label>

              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Shuffle layout
              </button>
            </div>
          </fieldset>

          {tooSmall && (
            <p
              role="alert"
              className="rounded-lg border border-[var(--present)] bg-[var(--surface)] p-3 text-sm"
            >
              Your longest word has {longest} phonemes but the grid is only{" "}
              {size} wide. Increase the grid size.
            </p>
          )}

          {!tooSmall && puzzle.unplaced.length > 0 && (
            <p
              role="alert"
              className="rounded-lg border border-[var(--present)] bg-[var(--surface)] p-3 text-sm"
            >
              These words did not fit: {puzzle.unplaced.join(", ")}. Try a
              larger grid or fewer words.
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={words.length === 0 || tooSmall}
            className="rounded bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-text)] disabled:opacity-40"
          >
            Generate and download
          </button>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Preview                                                    */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col gap-8">
          <section aria-labelledby="preview-heading">
            <h3 id="preview-heading" className="mb-3 text-sm font-semibold">
              Preview
            </h3>

            {words.length === 0 ? (
              <p className="max-w-md rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
                Select at least one word to see the puzzle.
              </p>
            ) : (
              <>
                <div
                  className="grid gap-[3px]"
                  style={{
                    gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                    maxWidth: `${size * 34}px`,
                  }}
                  role="img"
                  aria-label={`Preview of a ${size} by ${size} phoneme word search`}
                >
                  {puzzle.grid.flat().map((symbol, index) => (
                    <span
                      key={index}
                      className="ipa flex aspect-square items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-xs"
                    >
                      {symbol}
                    </span>
                  ))}
                </div>

                <h4 className="mb-2 mt-5 text-sm font-semibold">
                  Words to find
                </h4>
                <ul className="flex flex-wrap gap-2">
                  {puzzle.placements.map((placement) => (
                    <li
                      key={placement.word}
                      className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                    >
                      <span className="ipa">
                        {placement.phonemes.join(" ")}
                      </span>
                      {showHints && (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          {placement.word}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 max-w-md text-xs text-[var(--text-muted)]">
                  Empty cells are filled with phonemes taken from these words,
                  so no sound stands out as an obvious answer.
                </p>
              </>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
