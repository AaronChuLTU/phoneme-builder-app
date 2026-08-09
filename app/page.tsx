/**
 * Home — landing page.
 *
 * The worked example is deliberate: the tool is entirely about IPA symbols,
 * so the landing page shows one rather than only describing it in English.
 * The symbols carry the same hover hints used on the phoneme keyboard, so the
 * interaction is demonstrated before the user reaches a builder.
 *
 * This stays a server component. The tooltips are pure CSS (group-hover), so
 * no client-side JavaScript is needed to make them work.
 */

import Link from "next/link";
import { hintFor, ALL_WORDS, KEYBOARD_ROWS } from "@/lib/phonemes";
import PageHeader from "@/components/PageHeader";

const EXAMPLE = { word: "thin", phonemes: ["θ", "ɪ", "n"] };

// Counted from the data rather than hardcoded, so these figures cannot go
// stale when the corpus changes in Assessment 2.
const SYMBOL_COUNT = KEYBOARD_ROWS.flat().filter(Boolean).length;
const WORD_COUNT = ALL_WORDS.length;

const TOOLS = [
  {
    href: "/wordle",
    title: "Wordle Builder",
    skill: "Recall practice",
    body: "Learners produce phoneme symbols from memory and refine them from feedback. Choose a word, set the number of guesses, and download.",
    cta: "Build a Wordle",
  },
  {
    href: "/word-search",
    title: "Word Search Builder",
    skill: "Recognition practice",
    body: "Learners locate known phoneme sequences among similar-looking distractors. Choose words, set the grid, and download.",
    cta: "Build a Word Search",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Build phoneme transcription activities">
        A tool for Speech Pathology teachers to create practice activities in
        phonemic transcription. Activities are built from phoneme symbols
        rather than spelling, so learners work from the sounds of a word rather
        than its letters. Each activity downloads as a single HTML file that
        runs in any browser, with no internet connection or software required.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Worked example */}
        <section
          aria-labelledby="example-heading"
          className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <h2 id="example-heading" className="mb-4 text-lg font-semibold">
            What a phoneme word looks like
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <span className="text-2xl">{EXAMPLE.word}</span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">
              &rarr;
            </span>

            <ol className="flex items-center gap-1.5">
              <li
                aria-hidden="true"
                className="ipa text-2xl text-[var(--text-muted)]"
              >
                /
              </li>
              {EXAMPLE.phonemes.map((symbol) => (
                <li key={symbol}>
                  {/* Same tooltip treatment as the phoneme keyboard, so the
                      interaction is familiar before reaching a builder. */}
                  <span
                    tabIndex={0}
                    aria-label={`Phoneme ${symbol}, ${hintFor(symbol)}`}
                    className="group relative flex h-12 w-12 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg)] transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    <span className="ipa text-2xl">{symbol}</span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--text)] px-2 py-1 text-xs font-medium text-[var(--bg)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
                    >
                      {hintFor(symbol)}
                    </span>
                  </span>
                </li>
              ))}
              <li
                aria-hidden="true"
                className="ipa text-2xl text-[var(--text-muted)]"
              >
                /
              </li>
            </ol>
          </div>

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Four letters, three sounds &mdash; and they don&apos;t line up. The
            digraph <em>th</em> is a single phoneme, /θ/. Hover or tab to a
            symbol to see its English equivalence.
          </p>
        </section>

        {/* What's included */}
        <section
          aria-labelledby="included-heading"
          className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <h2 id="included-heading" className="mb-4 text-lg font-semibold">
            What&apos;s included
          </h2>

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 text-xl font-bold text-[var(--accent)]">
                {SYMBOL_COUNT}
              </dt>
              <dd className="text-[var(--text-muted)]">
                HCE phoneme symbols, laid out by manner and voicing so related
                sounds sit together.
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 text-xl font-bold text-[var(--accent)]">
                {WORD_COUNT}
              </dt>
              <dd className="text-[var(--text-muted)]">
                transcribed words, grouped into three difficulty bands by
                phoneme count.
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 text-xl font-bold text-[var(--accent)]">
                1
              </dt>
              <dd className="text-[var(--text-muted)]">
                file per activity &mdash; no install, no account, no internet
                needed to play it.
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Activity choice */}
      <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
        <h2 id="tools-heading" className="text-xl font-semibold">
          Choose an activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <article
              key={tool.href}
              className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div>
                <h3 className="text-lg font-semibold">{tool.title}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                  {tool.skill}
                </p>
              </div>
              <p className="flex-1 text-sm text-[var(--text-muted)]">
                {tool.body}
              </p>
              <Link
                href={tool.href}
                className="inline-block rounded bg-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent-text)] transition-opacity hover:opacity-90"
              >
                {tool.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-2 text-lg font-semibold">How it works</h2>
        <ol className="ml-5 list-decimal space-y-1 text-sm text-[var(--text-muted)]">
          <li>Configure the activity using the builder form.</li>
          <li>Preview it live to check the phonemes and hints are right.</li>
          <li>Press Generate to download a standalone .html file.</li>
          <li>Share the file with learners &mdash; it works offline.</li>
        </ol>
      </section>
    </div>
  );
}
