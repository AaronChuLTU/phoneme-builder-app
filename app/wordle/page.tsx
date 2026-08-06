"use client";

/**
 * Wordle Builder
 *
 * The teacher-facing form. Everything here configures the activity; nothing
 * here plays it. Pressing Generate hands the settings to generateWordleHtml()
 * and downloads the resulting standalone file.
 *
 * Design note for the justification: the word length is never stored in state.
 * It is derived from the chosen word (phonemes.length). Storing it separately
 * would allow the length and the word to disagree, so it is computed instead.
 */

import { useState } from "react";
import PhonemeKeyboard from "@/components/PhonemeKeyboard";
import { WORDS_BY_LENGTH, hintFor } from "@/lib/phonemes";
import { generateWordleHtml } from "@/lib/generateWordle";
import { downloadFile, safeFilename } from "@/lib/download";

type Difficulty = 3 | 4 | 5;
type Mode = "corpus" | "custom";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  3: "Easy — 3 phonemes",
  4: "Medium — 4 phonemes",
  5: "Hard — 5 phonemes",
};

export default function WordleBuilder() {
  const [mode, setMode] = useState<Mode>("corpus");
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [corpusIndex, setCorpusIndex] = useState(0);

  const [customPhonemes, setCustomPhonemes] = useState<string[]>([]);
  const [customEnglish, setCustomEnglish] = useState("");

  const [maxGuesses, setMaxGuesses] = useState(6);
  const [showHints, setShowHints] = useState(true);

  const wordList = WORDS_BY_LENGTH[difficulty];
  const corpusWord = wordList[corpusIndex] ?? wordList[0];

  // Derived, never stored: the single source of truth for what is being built.
  const phonemes = mode === "corpus" ? corpusWord.phonemes : customPhonemes;
  const english = mode === "corpus" ? corpusWord.word : customEnglish.trim();
  const wordLength = phonemes.length;

  const canGenerate = wordLength > 0 && maxGuesses >= 1;

  function changeDifficulty(next: Difficulty) {
    setDifficulty(next);
    setCorpusIndex(0); // old index may not exist in the new list
  }

  function handleGenerate() {
    if (!canGenerate) return;
    const title = english
      ? `Phoneme Wordle: ${english}`
      : "Phoneme Wordle";
    const html = generateWordleHtml({
      phonemes,
      english,
      maxGuesses,
      showHints,
      title,
    });
    downloadFile(safeFilename(`wordle-${english || "activity"}`), html);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold">Wordle Builder</h2>
        <p className="text-[var(--text-muted)]">
          Configure the activity, check the preview, then download it as a
          single HTML file students can open in any browser.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* ------------------------------------------------------------ */}
        {/* Settings                                                     */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col gap-6">
          <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">Word source</legend>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "corpus"}
                  onChange={() => setMode("corpus")}
                />
                Choose from the word list
              </label>

              {mode === "corpus" && (
                <div className="ml-6 flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Difficulty</span>
                    <select
                      value={difficulty}
                      onChange={(e) =>
                        changeDifficulty(Number(e.target.value) as Difficulty)
                      }
                      className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                    >
                      {([3, 4, 5] as Difficulty[]).map((level) => (
                        <option key={level} value={level}>
                          {DIFFICULTY_LABELS[level]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Word</span>
                    <select
                      value={corpusIndex}
                      onChange={(e) => setCorpusIndex(Number(e.target.value))}
                      className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                    >
                      {wordList.map((entry, index) => (
                        <option key={entry.word} value={index}>
                          {entry.word} — {entry.phonemes.join(" ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                />
                Build a custom word
              </label>

              {mode === "custom" && (
                <div className="ml-6 flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">English spelling</span>
                    <input
                      type="text"
                      value={customEnglish}
                      onChange={(e) => setCustomEnglish(e.target.value)}
                      placeholder="e.g. thin"
                      className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                      Shown to the student when they solve the word.
                    </span>
                  </label>

                  <div className="text-sm">
                    <span className="font-medium">Phoneme word</span>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Tap keys on the keyboard to build it.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCustomPhonemes((current) => current.slice(0, -1))
                        }
                        disabled={customPhonemes.length === 0}
                        className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        Backspace
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomPhonemes([])}
                        disabled={customPhonemes.length === 0}
                        className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">
              Activity settings
            </legend>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Number of guesses</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxGuesses}
                  onChange={(e) =>
                    setMaxGuesses(
                      Math.min(10, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="w-24 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showHints}
                  onChange={(e) => setShowHints(e.target.checked)}
                />
                Show English letter hints on the keyboard
              </label>
            </div>
          </fieldset>

          {/* Summary + generate */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="mb-2 text-sm font-semibold">Summary</h3>
            <dl className="grid grid-cols-2 gap-y-1 text-sm text-[var(--text-muted)]">
              <dt>Phoneme word</dt>
              <dd className="ipa text-[var(--text)]">
                {phonemes.length ? phonemes.join(" ") : "—"}
              </dd>
              <dt>English word</dt>
              <dd className="text-[var(--text)]">{english || "—"}</dd>
              <dt>Word length</dt>
              <dd className="text-[var(--text)]">{wordLength} phonemes</dd>
              <dt>Guesses</dt>
              <dd className="text-[var(--text)]">{maxGuesses}</dd>
            </dl>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="mt-4 w-full rounded bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-text)] disabled:opacity-40"
            >
              Generate and download
            </button>
            {!canGenerate && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Select or build a word first.
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Preview                                                      */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col gap-6">
          <section aria-labelledby="preview-heading">
            <h3 id="preview-heading" className="mb-3 text-sm font-semibold">
              Preview
            </h3>

            {wordLength === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
                The student&apos;s grid will appear here.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: maxGuesses }).map((_, row) => (
                  <div key={row} className="flex gap-1.5">
                    {Array.from({ length: wordLength }).map((_, col) => (
                      <div
                        key={col}
                        className="h-11 w-11 rounded border-2 border-[var(--border)] bg-[var(--surface)]"
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {phonemes.length > 0 && (
              <ol className="mt-4 flex flex-wrap gap-2">
                {phonemes.map((symbol, index) => (
                  <li
                    key={`${symbol}-${index}`}
                    className="flex min-w-14 flex-col items-center rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
                  >
                    <span className="ipa text-lg">{symbol}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {hintFor(symbol)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="keyboard-heading">
            <h3 id="keyboard-heading" className="mb-3 text-sm font-semibold">
              Phoneme keyboard
            </h3>
            <PhonemeKeyboard
              showHints={showHints}
              disabled={mode !== "custom"}
              onSelect={(symbol: string) =>
                setCustomPhonemes((current) => [...current, symbol])
              }
            />
            {mode !== "custom" && (
              <p className="mt-2 max-w-xs text-xs text-[var(--text-muted)]">
                Switch to &quot;Build a custom word&quot; to use the keyboard.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
