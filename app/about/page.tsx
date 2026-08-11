/**
 * About — required to state that Assessment 1 is frontend only, describe both
 * tools, and show your name, student number and a walkthrough video.
 */

import PageHeader from "@/components/PageHeader";

export default function About() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="About this project">
        The Phoneme Activity Builder lets Speech Pathology teachers create 
        practice activities in phonemic transcription,built around phoneme symbols 
        rather than standard spelling. It is a tool for teachers and learners, 
        not for clients.
      </PageHeader>

      <section>
        <h3 className="mb-1 text-lg font-semibold">Scope of Assessment 1</h3>
        <p className="text-[var(--text-muted)]">
          This stage is frontend only. There is no database and no dynamic word
          list. The Wordle activity uses a single phoneme word and the Word
          Search uses a fixed short list. Word lists, database storage and
          richer generation options are introduced in Assessment 2.
        </p>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-semibold">The two tools</h3>
        <dl className="flex flex-col gap-3 text-[var(--text-muted)]">
          <div>
            <dt className="font-medium text-[var(--text)]">Wordle</dt>
            <dd>
              A guessing game where each tile is one phoneme instead of one letter. 
              Hover hints show the English letter equivalence, and the English spelling
              is revealed once the word is solved.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">Word Search</dt>
            <dd>
              A grid puzzle where learners locate phoneme sequences among similar-looking
              distractors. Each cell holds one phoneme, so the puzzle is read by sound rather
              than by letter.
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-semibold">Author</h3>
        <p className="text-[var(--text-muted)]">
          Aaron Truong Chu &middot; Student Number 22298193
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Walkthrough video</h3>
        <video
          className="w-full rounded-lg border border-[var(--border)]"
          src="/walkthrough.mp4"
          controls
          preload="metadata"
        />
      </section>
    </div>
  );
}
