/**
 * playwright.config.ts
 *
 * End-to-end tests run a real browser against the running app.
 *
 * webServer starts `npm run dev` automatically if nothing is already on
 * port 3000, and reuses the existing server if there is — so the tests can
 * run with or without the dev server already open.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Next.js dev mode compiles each page on first visit, which can take a few
  // seconds; the default 30s per test is tight for a cold start.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One test at a time. The generation test checks the dashboard's success
  // count goes up by exactly one; a second test generating in parallel
  // would make that count race.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
