"use client";

/**
 * AutoRefresh
 *
 * Re-runs the dashboard's server query every 15 seconds, so the page works
 * as a live monitor rather than a snapshot. router.refresh() re-fetches the
 * server component's data without a full page reload or losing scroll
 * position.
 *
 * Pausable, because a page that changes under someone mid-read is an
 * accessibility problem (WCAG 2.2.2, Pause, Stop, Hide).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 15000;

export default function AutoRefresh({ generatedAt }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, router]);

  // Formatted from the server's own timestamp, in UTC, so the server and
  // browser render identical text and hydration cannot mismatch.
  const time = generatedAt.slice(11, 19);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
      <span>
        Updated {time} UTC
        {paused ? " · auto-refresh paused" : " · refreshes every 15s"}
      </span>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="rounded border border-[var(--border)] px-2 py-1"
      >
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded border border-[var(--border)] px-2 py-1"
      >
        Refresh now
      </button>
    </div>
  );
}
