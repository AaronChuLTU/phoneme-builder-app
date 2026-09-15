"use client";

/**
 * app/manage/[id]/page.tsx  ->  /manage/:id
 *
 * Word management within a list: add, edit and delete words.
 *
 * This is the page where full CRUD on words is visible in one place. Phonemes
 * are entered with the same PhonemeKeyboard component used by both builders,
 * and the keyboard itself is now loaded from the database via /api/phonemes
 * rather than from a hardcoded array.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api, RequestError } from "@/lib/client";

type Word = { id: number; english: string; phonemes: string[] };
type ListDetail = {
  id: number;
  name: string;
  description: string | null;
  words: Word[];
};
type PhonemeInfo = { symbol: string; label: string; example: string };
type Inventory = { phonemes: PhonemeInfo[]; keyboardRows: (string | null)[][] };

export default function ManageWordsPage() {
  const params = useParams<{ id: string }>();
  const listId = params.id;

  const [list, setList] = useState<ListDetail | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Draft for the add/edit form. editingId === null means we are adding.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [english, setEnglish] = useState("");
  const [phonemes, setPhonemes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, inv] = await Promise.all([
        api.get<ListDetail>(`/api/word-lists/${listId}`),
        api.get<Inventory>("/api/phonemes"),
      ]);
      setList(detail);
      setInventory(inv);
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not load this list");
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetDraft() {
    setEditingId(null);
    setEnglish("");
    setPhonemes([]);
  }

  function startEditing(word: Word) {
    setEditingId(word.id);
    setEnglish(word.english);
    setPhonemes(word.phonemes);
    setMessage(null);
    setError(null);
  }

  async function saveWord() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId === null) {
        await api.post(`/api/word-lists/${listId}/words`, { english, phonemes });
        setMessage(`Added "${english}".`);
      } else {
        await api.patch(`/api/words/${editingId}`, { english, phonemes });
        setMessage(`Updated "${english}".`);
      }
      resetDraft();
      await load();
    } catch (e) {
      // The API's validation messages are specific — "unknown phoneme
      // symbols: QQ" — so they are shown as-is rather than replaced with a
      // generic failure message.
      setError(e instanceof RequestError ? e.full : "Could not save the word");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(word: Word) {
    if (!window.confirm(`Delete "${word.english}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/api/words/${word.id}`);
      setMessage(`Deleted "${word.english}".`);
      if (editingId === word.id) resetDraft();
      await load();
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not delete the word");
    }
  }

  const hintFor = (symbol: string) => {
    const info = inventory?.phonemes.find((p) => p.symbol === symbol);
    return info ? `${info.label} (as in ${info.example})` : symbol;
  };

  const canSave = english.trim().length > 0 && phonemes.length > 0 && !saving;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Word list not found">
          {error ?? "That word list does not exist."}
        </PageHeader>
        <Link href="/manage" className="text-sm text-[var(--accent)] underline">
          Back to word lists
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/manage" className="text-sm text-[var(--accent)] underline">
          ← All word lists
        </Link>
        <PageHeader title={list.name}>
          {list.description ??
            "Add, edit and delete the phoneme words in this list."}
        </PageHeader>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--present)] bg-[var(--surface)] p-3 text-sm"
        >
          {error}
        </p>
      )}
      {message && !error && (
        <p
          role="status"
          className="rounded-lg border border-[var(--correct)] bg-[var(--surface)] p-3 text-sm"
        >
          {message}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- */}
        {/* Add / edit form                                            */}
        {/* ---------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-4">
          <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <legend className="px-1 text-sm font-semibold">
              {editingId === null ? "Add a word" : "Edit word"}
            </legend>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">English spelling</span>
                <input
                  type="text"
                  value={english}
                  onChange={(e) => setEnglish(e.target.value)}
                  placeholder="e.g. shell"
                  className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                />
              </label>

              <div className="text-sm">
                <span className="font-medium">Phonemes</span>
                <p className="ipa mt-1 min-h-9 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-lg">
                  {phonemes.join(" ") || "\u00a0"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {phonemes.length} phoneme{phonemes.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPhonemes((c) => c.slice(0, -1))}
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
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={saveWord}
                disabled={!canSave}
                className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-40"
              >
                {saving
                  ? "Saving…"
                  : editingId === null
                    ? "Add word"
                    : "Save changes"}
              </button>
            </div>
          </fieldset>

          {/* Keyboard, built from the database rather than a hardcoded array */}
          <section aria-labelledby="kb-heading">
            <h3 id="kb-heading" className="mb-2 text-sm font-semibold">
              Phoneme keyboard
            </h3>
            <div className="inline-flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              {inventory?.keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1.5">
                  {row.map((symbol, colIndex) =>
                    symbol === null ? (
                      <span
                        key={colIndex}
                        aria-hidden="true"
                        className="h-11 w-12"
                      />
                    ) : (
                      <button
                        key={symbol}
                        type="button"
                        title={hintFor(symbol)}
                        aria-label={`Phoneme ${symbol}, ${hintFor(symbol)}`}
                        onClick={() => setPhonemes((c) => [...c, symbol])}
                        className="h-11 w-12 rounded border border-[var(--border)] bg-[var(--bg)] transition-colors hover:bg-[var(--accent-soft)]"
                      >
                        <span className="ipa block text-base leading-tight">
                          {symbol}
                        </span>
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Existing words                                             */}
        {/* ---------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-sm font-semibold">
            Words in this list ({list.words.length})
          </h3>

          {list.words.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
              No words yet. Add one using the form.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {list.words.map((word) => (
                <li
                  key={word.id}
                  className={`flex flex-wrap items-center gap-3 rounded border p-2.5 ${
                    editingId === word.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <span className="w-20 shrink-0 text-sm font-medium">
                    {word.english}
                  </span>
                  <span className="ipa min-w-0 flex-1 text-[var(--text-muted)]">
                    {word.phonemes.join(" ")}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {word.phonemes.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEditing(word)}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWord(word)}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
