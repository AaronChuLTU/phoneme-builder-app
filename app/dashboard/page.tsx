/**
 * app/dashboard/page.tsx  ->  /dashboard
 *
 * Operational dashboard: health, usage, alerts and reports for the builder.
 *
 * A server component: it queries the database directly while rendering, so
 * the numbers arrive in the first HTML response with no loading spinner and
 * no client-side fetch. AutoRefresh re-runs that render every 15 seconds.
 *
 * Charts are drawn as tables with inline bars rather than with a chart
 * library. A table is readable by a screen reader as-is, which a canvas or
 * SVG chart is not without extra work, and it adds no dependency.
 */

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import AutoRefresh from "@/components/AutoRefresh";
import { checkHealth } from "@/lib/health";
import {
  getDashboardSummary,
  formatDuration,
  formatDateTime,
  formatTime,
  timezoneAbbreviation,
  typeLabel,
  SERIES_DAYS,
  type Severity,
} from "@/lib/metrics-summary";

export const dynamic = "force-dynamic";

const card =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4";

// Severity is always shown as a word as well as a colour, so the meaning
// survives for colour-blind users and in greyscale.
const SEVERITY: Record<Severity, { label: string; className: string }> = {
  error: { label: "Error", className: "border-red-500" },
  warning: { label: "Warning", className: "border-[var(--present)]" },
  info: { label: "Info", className: "border-[var(--border)]" },
};

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-[var(--text-muted)]">{note}</p>}
    </div>
  );
}

/** A proportional bar. Purely visual — the number beside it carries the
 *  meaning, so the bar is hidden from screen readers. */
function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <span aria-hidden="true" className="block h-3 w-full rounded bg-[var(--bg)]">
      <span
        className={`block h-3 rounded ${tone}`}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

export default async function DashboardPage() {
  const health = await checkHealth();
  const s = await getDashboardSummary(health);

  const seriesMax = Math.max(1, ...s.series.map((d) => d.success + d.failed));
  const typeMax = Math.max(1, ...s.generations.byType.map((t) => t.count));
  const pathMax = Math.max(1, ...s.pageViews.byPath.map((p) => p.views));
  const simulatedTotal = s.simulated.generations + s.simulated.pageViews;
  // "AEDT" or "AEST" — whichever applies right now.
  const tz = timezoneAbbreviation(new Date(s.generatedAt));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader title="Dashboard">
          Live health, usage and alerts for the activity builder, computed from
          the database each time this page loads.
        </PageHeader>
        <AutoRefresh updatedLabel={`${formatTime(s.generatedAt)} ${tz}`} />
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Health                                                        */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="health-heading"
        className={`${card} flex flex-wrap items-center gap-x-6 gap-y-2 border-l-4 ${
          health.status === "ok" ? "border-l-[var(--correct)]" : "border-l-red-500"
        }`}
      >
        <h2 id="health-heading" className="text-base font-semibold">
          System health:{" "}
          <span>{health.status === "ok" ? "Healthy" : "Unhealthy"}</span>
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Database {health.database}
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Check took {health.responseTimeMs} ms
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Up {formatDuration(health.uptimeSeconds * 1000)}
        </p>
        <Link href="/health" className="text-sm text-[var(--accent)] underline">
          /health
        </Link>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Key numbers                                                   */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="kpi-heading" className="flex flex-col gap-3">
        <h2 id="kpi-heading" className="text-lg font-semibold">
          Key numbers
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Activities created"
            value={s.activities.total}
            note={`${s.activities.wordle} Wordle · ${s.activities.wordSearch} Word Search`}
          />
          <Stat
            label="Word lists"
            value={s.wordListCount}
            note={`${s.totalWords} words in total`}
          />
          <Stat
            label="Successful generations"
            value={s.generations.success}
            note={`${s.generations.total} attempts in total`}
          />
          <Stat
            label="Failed generations"
            value={s.generations.failed}
            note={`${s.generations.failedLast24h} in the last 24 hours`}
          />
          <Stat
            label="Success rate"
            value={
              s.generations.successRate === null
                ? "—"
                : `${Math.round(s.generations.successRate * 100)}%`
            }
          />
          <Stat
            label="Most-used activity type"
            value={
              s.generations.mostUsed
                ? typeLabel(s.generations.mostUsed.type)
                : "—"
            }
            note={
              s.generations.mostUsed
                ? `${Math.round(s.generations.mostUsed.share * 100)}% of generations`
                : "No generations yet"
            }
          />
          <Stat
            label="Average time on page"
            value={formatDuration(s.pageViews.avgMs)}
            note={`${s.pageViews.total} page views`}
          />
          <Stat
            label="Average generation time"
            value={
              s.generations.avgSuccessMs == null
                ? "—"
                : `${Math.round(s.generations.avgSuccessMs)} ms`
            }
            note="Successful generations"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Alerts                                                        */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="alerts-heading" className="flex flex-col gap-3">
        <h2 id="alerts-heading" className="text-lg font-semibold">
          Alerts ({s.alerts.length})
        </h2>
        {s.alerts.length === 0 ? (
          <p className={`${card} text-sm`}>No issues detected.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {s.alerts.map((alert, i) => (
              <li
                key={i}
                className={`${card} border-l-4 ${SEVERITY[alert.severity].className}`}
              >
                <p className="text-sm font-semibold">
                  <span className="mr-2 rounded bg-[var(--bg)] px-1.5 py-0.5 text-xs uppercase tracking-wide">
                    {SEVERITY[alert.severity].label}
                  </span>
                  {alert.title}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {alert.detail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Generations over time                                         */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="series-heading" className={card}>
        <h2 id="series-heading" className="mb-3 text-lg font-semibold">
          Generations, last {SERIES_DAYS} days
        </h2>
        <p className="-mt-2 mb-3 text-xs text-[var(--text-muted)]">
          Days in {tz} (Melbourne time).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Successful and failed generations per day
            </caption>
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th scope="col" className="w-20 py-1 pr-3 font-medium">Day</th>
                <th scope="col" className="w-20 py-1 pr-3 font-medium">Success</th>
                <th scope="col" className="w-16 py-1 pr-3 font-medium">Failed</th>
                <th scope="col" className="py-1 font-medium">
                  <span className="sr-only">Volume</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {s.series.map((day) => (
                <tr key={day.date} className="border-t border-[var(--border)]">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {day.label}
                  </th>
                  <td className="py-1.5 pr-3">{day.success}</td>
                  <td className="py-1.5 pr-3">{day.failed}</td>
                  <td className="py-1.5">
                    <span aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded bg-[var(--bg)]">
                      <span
                        className="h-3 bg-[var(--correct)]"
                        style={{ width: `${(day.success / seriesMax) * 100}%` }}
                      />
                      <span
                        className="h-3 bg-red-500"
                        style={{ width: `${(day.failed / seriesMax) * 100}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Activities and their output                                   */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="activities-heading" className={card}>
        <h2 id="activities-heading" className="mb-1 text-lg font-semibold">
          Activities and generated output
        </h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Each saved activity, the stored word list it draws from, and how many
          of those words its settings allow. Preview opens the generated game
          in a new tab; Download saves the same file a teacher would share.
        </p>
        {s.activityReports.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No activities yet.{" "}
            <Link href="/manage/activities" className="text-[var(--accent)] underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)]">
                  <th scope="col" className="py-1 pr-3 font-medium">Activity</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Settings</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Word list</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Usable words</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Success</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Failed</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Last generated ({tz})</th>
                  <th scope="col" className="py-1 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {s.activityReports.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)] align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{a.name}</span>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {typeLabel(a.type)}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{a.settings}</td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/manage/${a.listId}`}
                        className="text-[var(--accent)] underline"
                      >
                        {a.listName}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      {/* Zero usable words means every generate will fail —
                          flagged in words, not only by the alert above. */}
                      {a.eligibleWords} of {a.wordCount}
                      {a.eligibleWords === 0 && (
                        <span className="block text-xs font-semibold">
                          Cannot generate
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{a.success}</td>
                    <td className="py-2 pr-3">{a.failed}</td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      {a.lastGeneratedAt ? formatDateTime(a.lastGeneratedAt) : "Never"}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <a
                          href={`/api/activities/${a.id}/generate?view=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-text)]"
                        >
                          Preview<span className="sr-only"> {a.name} (opens in a new tab)</span>
                        </a>
                        <a
                          href={`/api/activities/${a.id}/generate`}
                          className="rounded border border-[var(--border)] px-2.5 py-1 text-xs"
                        >
                          Download<span className="sr-only"> {a.name}</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------------------- */}
        {/* Usage by type                                               */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="type-heading" className={card}>
          <h2 id="type-heading" className="mb-3 text-lg font-semibold">
            Generations by activity type
          </h2>
          {s.generations.byType.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No generations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Generations</th>
                  <th scope="col">Volume</th>
                </tr>
              </thead>
              <tbody>
                {s.generations.byType.map((t) => (
                  <tr key={t.type}>
                    <th scope="row" className="w-32 py-1.5 pr-3 text-left font-normal">
                      {typeLabel(t.type)}
                    </th>
                    <td className="w-14 py-1.5 pr-3">{t.count}</td>
                    <td className="py-1.5">
                      <Bar value={t.count} max={typeMax} tone="bg-[var(--accent)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Time on page                                                */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="pages-heading" className={card}>
          <h2 id="pages-heading" className="mb-3 text-lg font-semibold">
            Time on page
          </h2>
          {s.pageViews.byPath.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No page views recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)]">
                  <th scope="col" className="py-1 pr-3 font-medium">Page</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Views</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Average</th>
                  <th scope="col" className="py-1 font-medium">
                    <span className="sr-only">Volume</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.pageViews.byPath.map((p) => (
                  <tr key={p.path} className="border-t border-[var(--border)]">
                    <td className="py-1.5 pr-3 font-mono text-xs">{p.path}</td>
                    <td className="py-1.5 pr-3">{p.views}</td>
                    <td className="py-1.5 pr-3">{formatDuration(p.avgMs)}</td>
                    <td className="w-1/3 py-1.5">
                      <Bar value={p.views} max={pathMax} tone="bg-[var(--accent)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Word lists                                                  */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="lists-heading" className={card}>
          <h2 id="lists-heading" className="mb-3 text-lg font-semibold">
            Word lists
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th scope="col" className="py-1 pr-3 font-medium">List</th>
                <th scope="col" className="py-1 pr-3 font-medium">Words</th>
                <th scope="col" className="py-1 pr-3 font-medium">3 / 4 / 5</th>
                <th scope="col" className="py-1 font-medium">Activities</th>
              </tr>
            </thead>
            <tbody>
              {s.wordLists.map((list) => (
                <tr key={list.id} className="border-t border-[var(--border)]">
                  <td className="py-1.5 pr-3">
                    <Link
                      href={`/manage/${list.id}`}
                      className="text-[var(--accent)] underline"
                    >
                      {list.name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3">{list.wordCount}</td>
                  <td className="py-1.5 pr-3">
                    {list.byLength[3] ?? 0} / {list.byLength[4] ?? 0} /{" "}
                    {list.byLength[5] ?? 0}
                  </td>
                  <td className="py-1.5">{list.activityCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Recent failures                                               */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="fail-heading" className={card}>
        <h2 id="fail-heading" className="mb-3 text-lg font-semibold">
          Recent failed generations
        </h2>
        {s.recentFailures.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No failures recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)]">
                  <th scope="col" className="py-1 pr-3 font-medium">When ({tz})</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Activity</th>
                  <th scope="col" className="py-1 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {s.recentFailures.map((f) => (
                  <tr key={f.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap py-1.5 pr-3">
                      {formatDateTime(f.createdAt)}
                    </td>
                    <td className="py-1.5 pr-3">
                      {/* A null activity means it was deleted after this
                          event — its history survives via onDelete: SetNull. */}
                      {f.activity ??
                        (f.activityType === "UNKNOWN"
                          ? "Unknown activity"
                          : `Deleted ${typeLabel(f.activityType)} activity`)}
                    </td>
                    <td className="py-1.5">{f.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-[var(--text-muted)]">
        {simulatedTotal > 0
          ? `Includes ${s.simulated.generations} simulated generation records and ${s.simulated.pageViews} simulated page views, created with npm run db:simulate. `
          : "All figures are from real usage. "}
        Raw data:{" "}
        <a href="/api/metrics/summary" className="text-[var(--accent)] underline">
          /api/metrics/summary
        </a>
      </p>
    </div>
  );
}
