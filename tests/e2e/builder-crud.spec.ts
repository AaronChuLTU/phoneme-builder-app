/**
 * Builder use case: a teacher manages a word list and its words.
 *
 * Covers full CRUD against the database through the UI:
 *   Create  a word list, then a word in it using the phoneme keyboard
 *   Read    the word appears in the list, and survives a page reload
 *   Update  change the word's phonemes
 *   Delete  the word, then the list
 *
 * The reload after each change is deliberate: it proves the change reached
 * the database, not just the page's local state.
 *
 * Names are timestamped so repeated runs never collide with each other or
 * with real data, and the test removes everything it creates.
 */

import { test, expect, type Page } from "@playwright/test";

async function tapPhonemes(page: Page, symbols: string[]) {
  for (const symbol of symbols) {
    // Keys are labelled "Phoneme θ, TH (as in thin)" for screen readers —
    // the same label is the most reliable way for a test to find them.
    await page
      .getByRole("button", { name: new RegExp(`^Phoneme ${symbol},`) })
      .click();
  }
}

test("teacher can create, read, update and delete a word list and its words", async ({
  page,
}) => {
  const stamp = Date.now();
  const listName = `Playwright list ${stamp}`;
  const word = `pw${stamp}`;

  // window.confirm() is used before every delete — accept it.
  page.on("dialog", (dialog) => dialog.accept());

  // ---- Create the word list -------------------------------------------
  await page.goto("/manage");
  await page.getByLabel("Name", { exact: true }).fill(listName);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText("Word list created.")).toBeVisible();

  const listRow = page.locator("li", { hasText: listName });
  await expect(listRow).toBeVisible();

  // ---- Create a word in it --------------------------------------------
  await listRow.getByRole("link", { name: "Manage words" }).click();
  await expect(page.getByRole("heading", { name: listName })).toBeVisible();

  await page.getByLabel("English spelling").fill(word);
  await tapPhonemes(page, ["b", "e", "d"]);
  await page.getByRole("button", { name: "Add word" }).click();
  await expect(page.getByText(`Added "${word}".`)).toBeVisible();

  // ---- Read: it is in the list, and still there after a reload ---------
  const wordRow = page.locator("li", { hasText: word });
  await expect(wordRow).toContainText("b e d");
  await page.reload();
  await expect(page.locator("li", { hasText: word })).toContainText("b e d");

  // ---- Update its phonemes --------------------------------------------
  await page.locator("li", { hasText: word }).getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await tapPhonemes(page, ["b", "æ", "d"]);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(`Updated "${word}".`)).toBeVisible();

  await page.reload();
  await expect(page.locator("li", { hasText: word })).toContainText("b æ d");

  // ---- Validation: an empty spelling is rejected ----------------------
  await tapPhonemes(page, ["b"]);
  await expect(page.getByRole("button", { name: "Add word" })).toBeDisabled();
  await page.getByRole("button", { name: "Clear" }).click();

  // ---- Delete the word --------------------------------------------------
  await page.locator("li", { hasText: word }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(`Deleted "${word}".`)).toBeVisible();
  await page.reload();
  await expect(page.locator("li", { hasText: word })).toHaveCount(0);

  // ---- Delete the list (cleanup, and the final D of CRUD) ---------------
  await page.goto("/manage");
  await page.locator("li", { hasText: listName }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(`Deleted "${listName}".`)).toBeVisible();
  await expect(page.locator("li", { hasText: listName })).toHaveCount(0);
});
