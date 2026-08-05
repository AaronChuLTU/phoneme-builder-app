"use client";

/**
 * Wordle builder — work in progress.
 *
 * Right now this is a test harness for PhonemeKeyboard: press keys to build a
 * phoneme word, backspace to remove, clear to reset. The builder form and the
 * Generate button replace this next.
 *
 * "use client" is required: this page uses useState.
 */

import { useState } from "react";
import PhonemeKeyboard from "@/components/PhonemeKeyboard";
import { hintFor } from "@/lib/phonemes";

export default function WordleBuilder() {
  const [phonemes, setPhonemes] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(true);

  function addPhoneme(symbol: string) {
    setPhonemes((current) => [...current, symbol]);
  }

  function removeLast() {
    setPhonemes((current) => current.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">Wordle Builder</h2>
        <p className="text-[var(--text-muted)]">
          Tap phonemes to build the target word. Hover or tab to any key to see
          its English equivalence.
        </p>
      </div>

      {/* Current selection */}
      <section
        aria-labelledby="selection-heading"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h3 id="selection-heading" className="mb-3 text-sm font-semibold">
          Phoneme word
        </h3>

        {phonemes.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No phonemes selected yet.
          </p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {phonemes.map((symbol, index) => (
              <li
                key={`${symbol}-${index}`}
                className="flex min-w-14 flex-col items-center rounded border border-[var(--border)] px-3 py-2"
              >
                <span className="ipa text-xl">{symbol}</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {hintFor(symbol)}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={removeLast}
            disabled={phonemes.length === 0}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={() => setPhonemes([])}
            disabled={phonemes.length === 0}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Clear
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHints}
              onChange={(event) => setShowHints(event.target.checked)}
            />
            Show hints on keys
          </label>
        </div>
      </section>

      {/* Keyboard */}
      <section aria-labelledby="keyboard-heading">
        <h3 id="keyboard-heading" className="mb-3 text-sm font-semibold">
          Phoneme keyboard
        </h3>
        <PhonemeKeyboard onSelect={addPhoneme} showHints={showHints} />
      </section>
    </div>
  );
}
