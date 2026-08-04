/**
 * Header — assessment title bar. Appears on every page via app/layout.tsx.
 */
export default function Header() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4">
        <h1 className="text-lg font-bold sm:text-xl">
          Phoneme Activity Builder
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Wordle and Word Search generator for Speech Pathology teaching
        </p>
      </div>
    </header>
  );
}
