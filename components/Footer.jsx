/**
 * Footer — required by the brief to show your name and student number.
 *
 * TODO: replace the two placeholders below with your own details before
 * you record the video.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 text-sm text-[var(--text-muted)] sm:flex-row sm:justify-between">
        <p>Aaron Truong Chu &middot; Student Number: 22298193</p>
        <p>Assessment 1 &mdash; Frontend Builder</p>
      </div>
    </footer>
  );
}
