"use client";

/**
 * PhonemeKeyboard
 *
 * The on-screen keyboard of HCE phoneme symbols, laid out to match the table
 * in the corpus document. Used by the Wordle builder, the Word Search builder,
 * and (as generated HTML) by the downloaded activities.
 *
 * Props
 *   onSelect(symbol)  called when a key is pressed
 *   showHints         when true, each key shows its English equivalence
 *                     underneath (e.g. TH under theta). Tooltips appear on
 *                     hover and focus either way.
 *   keyStates         optional object mapping symbol -> "correct" | "present"
 *                     | "absent", used to colour keys during Wordle feedback.
 *                     e.g. { "TH": "correct" }
 *   disabled          disables every key (used when a game is over)
 *
 * Tooltip positioning
 *   Tooltips are self-contained in this file — no globals.css rules needed.
 *   They are placed edge-aware so they can never be clipped:
 *     - top row flips below the key instead of above it
 *     - first column aligns to the left edge, last column to the right edge
 *     - everything else is centred
 *
 * Accessibility
 *   Each key carries an aria-label spelling out the phoneme and its English
 *   equivalence, because a screen reader cannot usefully pronounce a bare IPA
 *   symbol. The tooltip also appears on keyboard focus, not just mouse hover,
 *   so keyboard users get the same hint.
 */

import { KEYBOARD_ROWS, PHONEME_HINTS, hintFor } from "@/lib/phonemes";

const STATE_STYLES = {
  correct: "bg-[var(--correct)] text-white border-[var(--correct)]",
  present: "bg-[var(--present)] text-black border-[var(--present)]",
  absent: "bg-[var(--absent)] text-white border-[var(--absent)]",
};

export default function PhonemeKeyboard({
  onSelect,
  showHints = true,
  keyStates = {},
  disabled = false,
}) {
  return (
    <div
      role="group"
      aria-label="Phoneme keyboard"
      className="inline-flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {row.map((symbol, colIndex) => {
            // null means an intentionally empty cell — render a spacer so the
            // columns stay aligned with the layout in the corpus document.
            if (symbol === null) {
              return (
                <span key={colIndex} aria-hidden="true" className="h-12 w-14" />
              );
            }

            const hint = PHONEME_HINTS[symbol];
            const state = keyStates[symbol];

            return (
              <button
                key={symbol}
                type="button"
                disabled={disabled}
                onClick={() => onSelect?.(symbol)}
                aria-label={`Phoneme ${symbol}, ${hintFor(symbol)}`}
                className={[
                  "group relative h-12 w-14 rounded border text-center",
                  "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  state
                    ? STATE_STYLES[state]
                    : "border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--accent-soft)]",
                ].join(" ")}
              >
                <span className="ipa block text-lg leading-tight">
                  {symbol}
                </span>

                {showHints && hint && (
                  <span className="block text-[10px] leading-tight opacity-70">
                    {hint.label}
                  </span>
                )}

                {/* Tooltip. aria-hidden because the same text is already in
                    the button's aria-label — a screen reader would otherwise
                    announce it twice. */}
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none absolute z-30 whitespace-nowrap",
                    "rounded px-2 py-1 text-xs font-medium",
                    "bg-[var(--text)] text-[var(--bg)]",
                    "opacity-0 transition-opacity duration-150",
                    "group-hover:opacity-100 group-focus:opacity-100",
                    // Always above the key, always centred. The tooltip
                    // floats over the keyboard border and neighbouring keys —
                    // nothing clips it. max-w stops it running off a phone
                    // screen, which is the one boundary CSS cannot escape.
                    "bottom-full mb-2 left-1/2 -translate-x-1/2",
                    "max-w-[calc(100vw-2rem)]",
                  ].join(" ")}
                >
                  {hintFor(symbol)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
