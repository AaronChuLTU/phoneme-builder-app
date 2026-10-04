/**
 * User use case: generating and using an activity.
 *
 * Two tests:
 *   1. Open a Wordle from the dashboard's Preview button, play a guess, and
 *      confirm the dashboard's successful-generation count went up by one —
 *      linking the user action to the observability data it produces.
 *   2. Download a Word Search, then open the downloaded file the way a
 *      student would and confirm the puzzle renders from it.
 *
 * Activities are looked up through the API rather than by hardcoded name,
 * so the tests still work after a teacher renames the sample activities.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

type Activity = {
  id: number;
  name: string;
  type: "WORDLE" | "WORD_SEARCH";
  gridSize: number;
};

async function firstActivity(
  request: APIRequestContext,
  type: Activity["type"]
): Promise<Activity> {
  const res = await request.get("/api/activities");
  expect(res.ok()).toBeTruthy();
  const { data } = (await res.json()) as { data: Activity[] };
  const match = data.find((a) => a.type === type);
  expect(match, `a ${type} activity must exist — run npm run db:seed`).toBeTruthy();
  return match!;
}

async function successfulGenerations(request: APIRequestContext) {
  const res = await request.get("/api/metrics/summary");
  expect(res.ok()).toBeTruthy();
  const { data } = await res.json();
  return data.generations.success as number;
}

test("learner opens a Wordle from the dashboard and plays a guess", async ({
  page,
  request,
}) => {
  const wordle = await firstActivity(request, "WORDLE");
  const before = await successfulGenerations(request);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Preview opens in a new tab.
  const [game] = await Promise.all([
    page.waitForEvent("popup"),
    page
      .getByRole("link", { name: new RegExp(`Preview ${escapeRegex(wordle.name)}`) })
      .click(),
  ]);
  await game.waitForLoadState();

  // The generated page is a playable Wordle.
  await expect(game.locator("h1")).toHaveText(wordle.name);
  const firstRow = game.locator(".row").first().locator(".tile");
  const length = await firstRow.count();
  expect(length).toBeGreaterThan(0);

  // Fill one row with any phoneme and submit it.
  const key = game.locator("button.key:not(.spacer)").first();
  for (let i = 0; i < length; i++) await key.click();
  await game.locator("#enter").click();

  // Every tile in that row now carries feedback.
  for (let i = 0; i < length; i++) {
    await expect(firstRow.nth(i)).toHaveClass(/correct|present|absent/);
  }
  await expect(game.locator("#msg")).toContainText(/guess|Correct/);

  // The generation was recorded, and the dashboard's number reflects it.
  expect(await successfulGenerations(request)).toBe(before + 1);
});

test("teacher downloads a Word Search and the file works offline", async ({
  page,
  request,
}) => {
  const search = await firstActivity(request, "WORD_SEARCH");

  await page.goto("/manage/activities");
  const row = page.locator("li", { hasText: search.name });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    row.getByRole("link", { name: "Generate" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.html$/);
  // Save with a real .html name — Playwright's temp file has no extension,
  // so a browser opening it would not know it is a web page.
  const path = test.info().outputPath(download.suggestedFilename());
  await download.saveAs(path);
  const html = await readFile(path, "utf8");
  expect(html).toContain("Words to find");

  // Open the downloaded file directly from disk — no server involved,
  // exactly as a student opening an emailed file would.
  await page.goto(pathToFileURL(path).href);
  await expect(page.locator(".cell")).toHaveCount(search.gridSize * search.gridSize);
  await expect(page.locator("#wordlist li").first()).toBeVisible();
});

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
