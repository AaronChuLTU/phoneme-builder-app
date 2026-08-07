/**
 * preferences.js
 *
 * Reading and writing user preferences as cookies.
 *
 * Cookies rather than localStorage because cookies are sent with the request,
 * so the server can read the chosen theme and render the correct one straight
 * away. localStorage is only readable in the browser, which means the page
 * would paint in the default theme and then visibly flip — the "flash of
 * wrong theme" problem. This matters more than it sounds for a tool used in
 * classrooms with projectors and low-vision users.
 */

export const THEME_COOKIE = "pab-theme";
export const TEXT_SIZE_COOKIE = "pab-text-size";

export const THEMES = ["light", "dark", "system"];
export const TEXT_SIZES = ["normal", "large"];

export const DEFAULT_THEME = "system";
export const DEFAULT_TEXT_SIZE = "normal";

/** Guard against a hand-edited or stale cookie value. */
export function normaliseTheme(value) {
  return THEMES.includes(value) ? value : DEFAULT_THEME;
}

export function normaliseTextSize(value) {
  return TEXT_SIZES.includes(value) ? value : DEFAULT_TEXT_SIZE;
}

/**
 * Write a preference cookie. Browser only.
 *
 * SameSite=Lax stops the cookie being sent on cross-site requests, and there
 * is no sensitive data here in any case — only a display preference.
 */
export function writePreference(name, value, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Read a cookie in the browser. Returns null when not set. */
export function readPreference(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Turn a stored theme into the one actually applied.
 * "system" follows the operating system setting.
 */
export function resolveTheme(theme) {
  if (theme === "light" || theme === "dark") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Apply preferences to the <html> element immediately. */
export function applyPreferences({ theme, textSize }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme !== undefined) root.dataset.theme = resolveTheme(theme);
  if (textSize !== undefined) root.dataset.textSize = textSize;
}