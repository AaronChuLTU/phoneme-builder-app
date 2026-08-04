/**
 * About — required to state that Assessment 1 is frontend only, describe both
 * tools, and show your name, student number and a walkthrough video.
 */
export default function About() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h2 className="text-2xl font-bold">About this project</h2>

      <p className="text-[var(--text-muted)]">
        The Phoneme Activity Builder lets Speech Pathology teachers create
        classroom activities built around phoneme symbols rather than standard
        spelling. It is a tool for teachers and students, not for clients.
      </p>

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
              A guessing game where each tile is one phoneme instead of one
              letter. Hover hints show the English letter equivalence, and the
              English spelling is revealed once the word is solved.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">Word Search</dt>
            <dd>
              A grid puzzle where students find phoneme sequences. Each cell
              holds one phoneme, so students read by sound rather than letter.
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-semibold">Author</h3>
        {/* TODO: replace with your details */}
        <p className="text-[var(--text-muted)]">
          YOUR NAME &middot; Student number 0000000
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Walkthrough video</h3>
        {/* TODO: paste your unlisted YouTube embed URL into src */}
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)]">
          <iframe
            className="h-full w-full"
            //src=""
            title="Walkthrough of the Phoneme Activity Builder"
            allowFullScreen
          />
        </div>
      </section>
    </div>
  );
}
