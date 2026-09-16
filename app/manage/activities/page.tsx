"use client";

/**
 * app/manage/activities/page.tsx  ->  /manage/activities
 *
 * Saved activity configurations: create, edit, delete, and generate.
 *
 * An activity is a set of generation settings pointing at a word list. The
 * same list can drive several activities — the same words as an easy Wordle
 * and as a hard word search — which is why the settings live on the activity
 * rather than on the list.
 *
 * The Generate button is a plain link to /api/activities/:id/generate. The
 * route sets Content-Disposition: attachment, so the browser downloads the
 * generated HTML rather than displaying it. No client-side download code is
 * needed, unlike Assessment 1 where the file was built in the browser.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api, RequestError } from "@/lib/client";

type ActivityType = "WORDLE" | "WORD_SEARCH";
type Difficulty = "easy" | "medium" | "hard";

type WordListSummary = { id: number; name: string; wordCount: number };

type Activity = {
  id: number;
  name: string;
  type: ActivityType;
  showHints: boolean;
  maxGuesses: number;
  wordLength: number | null;
  gridSize: number;
  difficulty: Difficulty;
  allowAnswers: boolean;
  wordList: WordListSummary;
};

const BLANK = {
  name: "",
  type: "WORDLE" as ActivityType,
  wordListId: 0,
  showHints: true,
  maxGuesses: 6,
  wordLength: null as number | null,
  gridSize: 10,
  difficulty: "medium" as Difficulty,
  allowAnswers: true,
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lists, setLists] = useState<WordListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [acts, wordLists] = await Promise.all([
        api.get<Activity[]>("/api/activities"),
        api.get<WordListSummary[]>("/api/word-lists"),
      ]);
      setActivities(acts);
      setLists(wordLists);
      // Preselect the first list so the form is usable immediately.
      setDraft((d) =>
        d.wordListId === 0 && wordLists.length > 0
          ? { ...d, wordListId: wordLists[0].id }
          : d
      );
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not load activities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetDraft() {
    setEditingId(null);
    setDraft({ ...BLANK, wordListId: lists[0]?.id ?? 0 });
  }

  function startEditing(activity: Activity) {
    setEditingId(activity.id);
    setDraft({
      name: activity.name,
      type: activity.type,
      wordListId: activity.wordList.id,
      showHints: activity.showHints,
      maxGuesses: activity.maxGuesses,
      wordLength: activity.wordLength ?? null,
      gridSize: activity.gridSize,
      difficulty: activity.difficulty,
      allowAnswers: activity.allowAnswers,
    });
    setError(null);
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId === null) {
        await api.post("/api/activities", draft);
        setMessage(`Created "${draft.name}".`);
      } else {
        await api.patch(`/api/activities/${editingId}`, draft);
        setMessage(`Updated "${draft.name}".`);
      }
      resetDraft();
      await load();
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not save the activity");
    } finally {
      setSaving(false);
    }
  }

  async function remove(activity: Activity) {
    if (!window.confirm(`Delete "${activity.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/api/activities/${activity.id}`);
      setMessage(`Deleted "${activity.name}".`);
      if (editingId === activity.id) resetDraft();
      await load();
    } catch (e) {
      setError(e instanceof RequestError ? e.full : "Could not delete the activity");
    }
  }

  const canSave =
    draft.name.trim().length > 0 && draft.wordListId > 0 && !saving;

  const field =
    "rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/manage" className="text-sm text-[var(--accent)] underline">
          ← Word lists
        </Link>
        <PageHeader title="Saved activities">
          An activity stores the settings for one downloadable output. Generate
          builds the HTML from the words currently in its list, so editing the
          list changes what the next download contains.
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

      <div className="grid gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- */}
        {/* Create / edit                                              */}
        {/* ---------------------------------------------------------- */}
        <fieldset className="h-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <legend className="px-1 text-sm font-semibold">
            {editingId === null ? "New activity" : "Edit activity"}
          </legend>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Name</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Week 3 practice"
                className={field}
              />
              <span className="text-xs text-[var(--text-muted)]">
                Shown on the activity and used for the filename. Avoid putting
                an answer here.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Type</span>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as ActivityType })
                }
                className={field}
              >
                <option value="WORDLE">Wordle</option>
                <option value="WORD_SEARCH">Word Search</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Word list</span>
              <select
                value={draft.wordListId}
                onChange={(e) =>
                  setDraft({ ...draft, wordListId: Number(e.target.value) })
                }
                className={field}
              >
                {lists.length === 0 && <option value={0}>No lists yet</option>}
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.wordCount} words)
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.showHints}
                onChange={(e) =>
                  setDraft({ ...draft, showHints: e.target.checked })
                }
              />
              Show English letter hints
            </label>

            {/* Only the settings that apply to the chosen type are shown,
                so a teacher is never asked for a grid size on a Wordle. */}
            {draft.type === "WORDLE" ? (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Number of guesses</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={draft.maxGuesses}
                    onChange={(e) =>
                      setDraft({ ...draft, maxGuesses: Number(e.target.value) })
                    }
                    className={`${field} w-24`}
                  />
                </label>

                {/* Filters which words this activity can draw from at
                    generate time, by phoneme count. Without this, an
                    activity named e.g. "three phonemes" could still pick a
                    word of any length, since nothing tied the name to the
                    actual content. */}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Word length</span>
                  <select
                    value={draft.wordLength ?? "any"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        wordLength:
                          e.target.value === "any"
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className={field}
                  >
                    <option value="any">Any length</option>
                    <option value="3">3 phonemes</option>
                    <option value="4">4 phonemes</option>
                    <option value="5">5 phonemes</option>
                  </select>
                  <span className="text-xs text-[var(--text-muted)]">
                    Only words with this many phonemes will be picked.
                  </span>
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">
                    Grid size: {draft.gridSize} × {draft.gridSize}
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={16}
                    value={draft.gridSize}
                    onChange={(e) =>
                      setDraft({ ...draft, gridSize: Number(e.target.value) })
                    }
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Difficulty</span>
                  <select
                    value={draft.difficulty}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        difficulty: e.target.value as Difficulty,
                      })
                    }
                    className={field}
                  >
                    <option value="easy">Easy — across and down</option>
                    <option value="medium">Medium — adds diagonals</option>
                    <option value="hard">Hard — all eight directions</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.allowAnswers}
                    onChange={(e) =>
                      setDraft({ ...draft, allowAnswers: e.target.checked })
                    }
                  />
                  Include a &quot;Show answers&quot; button
                </label>
              </>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className="flex-1 rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-40"
              >
                {saving
                  ? "Saving…"
                  : editingId === null
                    ? "Create activity"
                    : "Save changes"}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="rounded border border-[var(--border)] px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </fieldset>

        {/* ---------------------------------------------------------- */}
        {/* Existing activities                                        */}
        {/* ---------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-sm font-semibold">
            Activities {!loading && `(${activities.length})`}
          </h3>

          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
              No activities yet. Create one using the form.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activities.map((activity) => (
                <li
                  key={activity.id}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${
                    editingId === activity.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {activity.type === "WORDLE"
                        ? `Wordle · ${activity.maxGuesses} guesses${
                            activity.wordLength
                              ? ` · ${activity.wordLength} phonemes`
                              : ""
                          }`
                        : `Word Search · ${activity.gridSize}×${activity.gridSize} · ${activity.difficulty}`}
                      {" · "}
                      {activity.wordList.name} ({activity.wordList.wordCount}{" "}
                      words)
                      {activity.showHints ? " · hints on" : " · hints off"}
                    </p>
                  </div>

                  {/* A plain link: the API route sets the download header. */}
                  <a
                    href={`/api/activities/${activity.id}/generate`}
                    className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-text)]"
                  >
                    Generate
                  </a>
                  <button
                    type="button"
                    onClick={() => startEditing(activity)}
                    className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(activity)}
                    className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
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
