"use client";

/**
 * ThemeSync
 *
 * Renders nothing. Its job is to keep the page in step with the operating
 * system when the stored preference is "system": if the user switches their
 * OS to dark mode while the app is open, the app follows without a reload.
 *
 * When the preference is an explicit "light" or "dark" this does nothing,
 * because the teacher's choice should override the OS.
 */

import { useEffect } from "react";
import {
  THEME_COOKIE,
  readPreference,
  normaliseTheme,
  applyPreferences,
} from "@/lib/preferences";

export default function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange() {
      const stored = normaliseTheme(readPreference(THEME_COOKIE));
      if (stored === "system") {
        applyPreferences({ theme: "system" });
      }
    }

    // Apply once on mount, in case the server guessed light for "system".
    handleChange();

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return null;
}
