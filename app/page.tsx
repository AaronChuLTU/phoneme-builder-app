/**
 * Home — landing page with a short introduction and links to the two builders.
 */

import Link from "next/link";

const TOOLS = [
  {
    href: "/wordle",
    title: "Wordle Builder",
    body: "Choose a phoneme word, set the number of guesses, and download a playable Wordle activity as a single HTML file.",
    cta: "Build a Wordle",
  },
  {
    href: "/word-search",
    title: "Word Search Builder",
    body: "Pick a short list of phoneme words and generate a printable, playable word search grid.",
    cta: "Build a Word Search",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">
          Build phoneme activities for the classroom
        </h2>
        <p className="max-w-2xl text-[var(--text-muted)]">
          This tool helps Speech Pathology teachers create phoneme-based
          classroom activities. Activities are built around phoneme symbols
          rather than standard spelling, so students work with the sounds of a
          word instead of its letters. Each activity downloads as a single HTML
          file that runs in any web browser, with no internet connection or
          software required.
        </p>
      </section>

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
              <h3 className="text-lg font-semibold">{tool.title}</h3>
              <p className="flex-1 text-sm text-[var(--text-muted)]">
                {tool.body}
              </p>
              <Link
                href={tool.href}
                className="inline-block rounded bg-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent-text)]"
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
          <li>Share the file with students — it works offline.</li>
        </ol>
      </section>
    </div>
  );
}
