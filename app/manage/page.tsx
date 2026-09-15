"use client";

/**
 * app/manage/page.tsx  ->  /manage
 *
 * Word list management: create, rename, delete, and drill into a list to
 * manage its words.
 *
 * All data comes from the API rather than from lib/phonemes.js. Nothing on
 * this page knows what a phoneme is — it deals in lists and counts, and
 * leaves the words to the page below it.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api, RequestError } from "@/lib/client";

type WordList = {
  id: number;
  name: string;
  description: string | null;
  wordCount: number;
  activityCount: number;
};

export default function ManagePage() {
  const [lists, setLists] = useState<WordList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLists(await api.get<WordList[]>("/api/word-lists"));
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not load word lists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createList() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/api/word-lists", {
        name,
        description: description || null,
      });
      setName("");
      setDescription("");
      setMessage("Word list created.");
      await load();
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not create the list");
    } finally {
      setSaving(false);
    }
  }

  async function renameList(id: number) {
    setError(null);
    try {
      await api.patch(`/api/word-lists/${id}`, { name: editName });
      setEditingId(null);
      setMessage("Renamed.");
      await load();
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not rename the list");
    }
  }

  async function deleteList(list: WordList) {
    // Deleting a list cascades to its words and activities, so the count is
    // worth stating before it happens.
    const confirmed = window.confirm(
      `Delete "${list.name}"?\n\nThis also deletes ${list.wordCount} word(s) and ${list.activityCount} activity/activities. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    try {
      await api.delete(`/api/word-lists/${list.id}`);
      setMessage(`Deleted "${list.name}".`);
      await load();
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not delete the list");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Manage word lists">
        Word lists are stored in the database and drive both activity builders.
        Create a list, add phoneme words to it, then build activities from it.
      </PageHeader>

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

      {/* Create */}
      <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <legend className="px-1 text-sm font-semibold">New word list</legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 3 — /s/ blends"
              className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
            />
          </label>
          <button
            type="button"
            onClick={createList}
            disabled={saving || name.trim().length === 0}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-40"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </fieldset>

      {/* List */}
      <section aria-labelledby="lists-heading" className="flex flex-col gap-3">
        <h3 id="lists-heading" className="text-sm font-semibold">
          Word lists {!loading && `(${lists.length})`}
        </h3>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : lists.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
            No word lists yet. Create one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                {editingId === list.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => renameList(list.id)}
                      className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-text)]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{list.name}</p>
                      {list.description && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {list.description}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-muted)]">
                        {list.wordCount} word{list.wordCount === 1 ? "" : "s"} ·{" "}
                        {list.activityCount} activit
                        {list.activityCount === 1 ? "y" : "ies"}
                      </p>
                    </div>

                    <Link
                      href={`/manage/${list.id}`}
                      className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-text)]"
                    >
                      Manage words
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(list.id);
                        setEditName(list.name);
                      }}
                      className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteList(list)}
                      className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
