"use client";

/**
 * Word Search Builder
 *
 * The teacher picks phoneme words, sets the grid size and difficulty,
 * previews the exact puzzle, and downloads it as a single HTML file.
 *
 * Design notes for the justification:
 *
 *  - The word list is filtered by phoneme length rather than presented as one
 *    long scroll. 90 words in a single list is a lot to hunt through, and
 *    phoneme length is the property a teacher actually chooses by, since it
 *    maps to difficulty. Words already selected stay visible as chips below
 *    the list, so switching filters never hides what has been picked.
 *
 *  - buildPuzzle() is seeded rather than calling Math.random() internally, so
 *    the preview and the downloaded file are guaranteed to be the same
 *    puzzle. "Shuffle" simply picks a new seed.
 *
 *  - The word list is fixed at this stage, as the brief allows. Assessment 2
 *    introduces database-backed word lists; because words are passed into
 *    buildPuzzle() as a plain array, only the source of that array changes.
 */

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ALL_WORDS, WORDS_BY_LENGTH } from "@/lib/phonemes";
import { buildPuzzle, DIRECTION_SETS } from "@/lib/wordSearch";
import { generateWordSearchHtml } from "@/lib/generateWordSearch";
import { downloadFile, safeFilename } from "@/lib/download";

type Level = "easy" | "medium" | "hard";
type Length = 3 | 4 | 5;
type Entry = { word: string; phonemes: string[] };

/**
 * Short labels keep the <select> narrow. A <select> is at least as wide as
 * its longest option, and a long label was forcing this fieldset wider than
 * the one above it. The fuller explanation sits underneath instead, where it
 * is easier to read anyway.
 */
const LEVELS: Record<Level, { label: string; description: string }> = {
  easy: {
    label: "Easy",
    description: "Words run across and down only.",
  },
  medium: {
    label: "Medium",
    description: "Adds diagonals. Everything still reads left to right.",
  },
  hard: {
    label: "Hard",
    description:
      "All eight directions, including backwards. Best for confident readers.",
  },
};

const LENGTHS: Length[] = [3, 4, 5];
const DEFAULT_WORDS: string[] = [];
const MAX_WORDS = 8;

export default function WordSearchBuilder() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_WORDS);
  const [lengthFilter, setLengthFilter] = useState<Length>(3);

  const [size, setSize] = useState(10);
  const [level, setLevel] = useState<Level>("medium");
  const [showHints, setShowHints] = useState(true);
  const [allowAnswers, setAllowAnswers] = useState(true);
  const [seed, setSeed] = useState(42);
  const [showAnswers, setShowAnswers] = useState(false);

  const words = useMemo(
    () =>
      selected
        .map((name) => ALL_WORDS.find((entry) => entry.word === name))
        .filter((entry): entry is Entry => Boolean(entry)),
    [selected]
  );

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

  /**
   * Which grid cells belong to a placed word, keyed "row:col".
   * Built once per puzzle rather than searched per cell, so revealing answers
   * on a 16x16 grid stays a single pass rather than 256 lookups.
   */
  const answerCells = useMemo(() => {
    const map = new Map<string, string>();
    for (const placement of puzzle.placements) {
      for (const cell of placement.cells) {
        map.set(`${cell.row}:${cell.col}`, placement.word);
      }
    }
    return map;
  }, [puzzle]);

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

  const visibleWords = WORDS_BY_LENGTH[lengthFilter];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Word Search Builder">
        Choose up to {MAX_WORDS} phoneme words from the preset word list
        (custom word generator coming soon), check the preview, then download
        the puzzle as a single HTML file.
      </PageHeader>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- */}
        {/* Settings                                                   */}
        {/* ---------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <fieldset className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">
              Words ({total}/{MAX_WORDS})
            </legend>

            {/* Length filter. Tabs rather than a dropdown because there are
                only three options and they are switched between often. */}
            <div
              role="group"
              aria-label="Filter words by phoneme length"
              className="mb-3 flex gap-1"
            >
              {LENGTHS.map((length) => {
                const isActive = lengthFilter === length;
                return (
                  <button
                    key={length}
                    type="button"
                    onClick={() => setLengthFilter(length)}
                    aria-pressed={isActive}
                    className={`flex-1 rounded border px-2 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    {length} phonemes
                  </button>
                );
              })}
            </div>

            <div className="max-h-56 overflow-y-auto pr-1">
              <ul className="flex flex-col gap-1">
                {visibleWords.map((entry) => {
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

            {/* Selected words stay visible regardless of the active filter,
                so switching tabs never hides a choice. */}
            {selected.length > 0 && (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Selected
                </h4>
                <ul className="flex flex-wrap gap-1.5">
                  {selected.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => toggleWord(name)}
                        aria-label={`Remove ${name}`}
                        className="flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-xs transition-colors hover:bg-[var(--accent-soft)]"
                      >
                        {name}
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text)]">
                Coming soon:
              </span>{" "}
              building your own words with the phoneme keyboard, and saved word
              lists. For now, choose from the {ALL_WORDS.length}-word corpus
              above.
            </p>
          </fieldset>

          <fieldset className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">
              Puzzle settings
            </legend>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-sm">
                <label
                  htmlFor="difficulty"
                  className="font-medium"
                >
                  Difficulty
                </label>
                {/* w-full stops the longest option from setting the width of
                    this whole panel. */}
                <select
                  id="difficulty"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                >
                  {(Object.keys(LEVELS) as Level[]).map((key) => (
                    <option key={key} value={key}>
                      {LEVELS[key].label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)]">
                  {LEVELS[level].description}
                </p>
              </div>

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
                  className="w-full"
                />
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showHints}
                  onChange={(e) => setShowHints(e.target.checked)}
                  className="mt-0.5"
                />
                Show English spelling in the word list
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowAnswers}
                  onChange={(e) => setAllowAnswers(e.target.checked)}
                  className="mt-0.5"
                />
                Include a &quot;Show answers&quot; button
              </label>

              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                className="w-full rounded border border-[var(--border)] px-3 py-1.5 text-sm"
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
            className="w-full rounded bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-text)] disabled:opacity-40"
          >
            Generate and download
          </button>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Preview                                                    */}
        {/* ---------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Preview</h3>
            {words.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAnswers((current) => !current)}
                aria-pressed={showAnswers}
                className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                  showAnswers
                    ? "border-[var(--correct)] bg-[var(--correct)] text-white"
                    : "border-[var(--border)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {showAnswers ? "Hide answers" : "Show answers"}
              </button>
            )}
          </div>

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
                aria-label={
                  showAnswers
                    ? `Preview of a ${size} by ${size} phoneme word search with answers highlighted`
                    : `Preview of a ${size} by ${size} phoneme word search`
                }
              >
                {puzzle.grid.map((row, rowIndex) =>
                  row.map((symbol, colIndex) => {
                    const inAnswer =
                      showAnswers && answerCells.has(`${rowIndex}:${colIndex}`);
                    return (
                      <span
                        key={`${rowIndex}:${colIndex}`}
                        title={
                          inAnswer
                            ? answerCells.get(`${rowIndex}:${colIndex}`)
                            : undefined
                        }
                        className={`ipa flex aspect-square items-center justify-center rounded border text-xs transition-colors ${
                          inAnswer
                            ? "border-[var(--correct)] bg-[var(--correct)] font-semibold text-white"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        {symbol}
                      </span>
                    );
                  })
                )}
              </div>

              <h4 className="mb-2 mt-5 text-sm font-semibold">Words to find</h4>
              <ul className="flex flex-wrap gap-2">
                {puzzle.placements.map((placement) => (
                  <li
                    key={placement.word}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  >
                    <span className="ipa">{placement.phonemes.join(" ")}</span>
                    {showHints && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        {placement.word}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 max-w-md text-xs text-[var(--text-muted)]">
                Empty cells are filled with phonemes taken from these words, so
                no sound stands out as an obvious answer.
                {showAnswers
                  ? " Highlighted cells are for checking only — they are not marked in the downloaded puzzle."
                  : ""}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
