/**
 * download.js
 *
 * Turns a string into a file the browser saves to disk.
 *
 * There is no server involved. The HTML is built in memory, wrapped in a Blob,
 * given a temporary object URL, and handed to a hidden <a download> which is
 * clicked programmatically. This is why the builder works as a purely static
 * frontend, which is the whole point of Assessment 1.
 */

/**
 * @param {string} filename e.g. "wordle-thin.html"
 * @param {string} contents the full file contents
 * @param {string} mimeType defaults to HTML
 */
export function downloadFile(filename, contents, mimeType = "text/html") {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Firefox requires the anchor to be in the document before clicking.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the object URL so the blob can be garbage collected.
  URL.revokeObjectURL(url);
}

/**
 * Build a safe filename from a word.
 * Strips anything that is not a letter, number, dash or underscore, since
 * phoneme symbols and spaces make awkward filenames across operating systems.
 */
export function safeFilename(base, extension = "html") {
  const cleaned = String(base)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${cleaned || "activity"}.${extension}`;
}
