"use client";

/**
 * Settings
 *
 * Display preferences, stored in cookies so the server can render the correct
 * theme on the first request rather than after the page has already painted.
 *
 * Changes apply immediately — there is no Save button. For a two-option
 * preference, an explicit save step is extra work with no benefit, and the
 * preview below shows the effect straight away.
 */

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import {
  THEME_COOKIE,
  TEXT_SIZE_COOKIE,
  DEFAULT_THEME,
  DEFAULT_TEXT_SIZE,
  readPreference,
  writePreference,
  normaliseTheme,
  normaliseTextSize,
  applyPreferences,
} from "@/lib/preferences";

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    description: "Dark text on a light background.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Light text on a dark background, easier in dim rooms.",
  },
  {
    value: "system",
    label: "Match my device",
    description: "Follows your operating system setting.",
  },
];

const TEXT_SIZE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large", description: "Increases all text by 12.5%." },
];

export default function Settings() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);

  // Read the saved values once the component is running in the browser.
  // The server has already applied them; this just syncs the controls.
  useEffect(() => {
    setTheme(normaliseTheme(readPreference(THEME_COOKIE)));
    setTextSize(normaliseTextSize(readPreference(TEXT_SIZE_COOKIE)));
  }, []);

  function changeTheme(value: string) {
    setTheme(value);
    writePreference(THEME_COOKIE, value);
    applyPreferences({ theme: value });
  }

  function changeTextSize(value: string) {
    setTextSize(value);
    writePreference(TEXT_SIZE_COOKIE, value);
    applyPreferences({ textSize: value });
  }

  function resetAll() {
    changeTheme(DEFAULT_THEME);
    changeTextSize(DEFAULT_TEXT_SIZE);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Settings">
        These preferences are saved in your browser as cookies and apply to
        the builder interface. They do not affect the activities you
        download — those always use their own styling so they look the same
        on any student&apos;s computer.
      </PageHeader>

      <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <legend className="px-1 text-sm font-semibold">Theme</legend>
        <div className="flex flex-col gap-3">
          {THEME_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={theme === option.value}
                onChange={() => changeTheme(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <legend className="px-1 text-sm font-semibold">Text size</legend>
        <div className="flex flex-col gap-3">
          {TEXT_SIZE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="textSize"
                value={option.value}
                checked={textSize === option.value}
                onChange={() => changeTextSize(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                {option.description && (
                  <span className="block text-xs text-[var(--text-muted)]">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Live preview so the effect of a change is visible without leaving
          the page. Uses the same tokens as the rest of the app. */}
      <section
        aria-labelledby="preview-heading"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h3 id="preview-heading" className="mb-3 text-sm font-semibold">
          Preview
        </h3>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Sample phoneme keys in the current theme:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { symbol: "θ", label: "TH", state: "correct" },
            { symbol: "ɪ", label: "I", state: "present" },
            { symbol: "n", label: "N", state: "absent" },
            { symbol: "ʃ", label: "SH", state: "none" },
          ].map((key) => (
            <span
              key={key.symbol}
              className={`flex h-12 w-14 flex-col items-center justify-center rounded border ${
                key.state === "correct"
                  ? "border-[var(--correct)] bg-[var(--correct)] text-white"
                  : key.state === "present"
                    ? "border-[var(--present)] bg-[var(--present)] text-black"
                    : key.state === "absent"
                      ? "border-[var(--absent)] bg-[var(--absent)] text-white"
                      : "border-[var(--border)] bg-[var(--bg)]"
              }`}
            >
              <span className="ipa text-lg leading-tight">{key.symbol}</span>
              <span className="text-[10px] leading-tight opacity-80">
                {key.label}
              </span>
            </span>
          ))}
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={resetAll}
          className="rounded border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
