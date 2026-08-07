/**
 * generateWordSearch.js
 *
 * Builds the standalone Word Search activity as a single HTML document.
 *
 * The grid is built in the React app and passed in already finished, so the
 * puzzle the teacher previewed is exactly the puzzle the student receives.
 * This file only renders it and adds the interaction.
 *
 * Selecting a word works three ways so the activity is not mouse-only:
 *   - drag from the first phoneme to the last
 *   - click the first phoneme, then click the last
 *   - tab to a cell and press Enter twice (same as click, click)
 */

import { PHONEME_HINTS } from "./phonemes";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toScriptJson(value) {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

/**
 * @param {object}     settings
 * @param {string[][]} settings.grid       finished grid of phoneme symbols
 * @param {Array}      settings.placements [{ word, phonemes, cells }]
 * @param {boolean}    settings.showHints  show English equivalence in the word list
 * @param {boolean}    settings.allowAnswers include a "Show answers" button
 * @param {string}     settings.title
 * @returns {string} a complete HTML document
 */
export function generateWordSearchHtml({
  grid,
  placements,
  showHints = true,
  allowAnswers = true,
  title = "Phoneme Word Search",
}) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bg: #f6f7f9;
    --surface: #ffffff;
    --text: #1a1d23;
    --muted: #5b6472;
    --border: #d7dce3;
    --accent: #2b5c8f;
    --found: #3f8f5b;
    --anchor: #c9a227;
    --revealed: #b04a4a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 1.5rem 1rem 3rem;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
  .sub { color: var(--muted); font-size: 0.9rem; margin: 0 0 1.5rem; }
  .ipa {
    font-family: "Gentium Plus", "Charis SIL", "Segoe UI",
      "Lucida Sans Unicode", sans-serif;
  }

  .layout { display: flex; flex-wrap: wrap; gap: 2rem; align-items: flex-start; }
  .layout > .gridwrap { flex: 1 1 320px; min-width: 0; }

  /* The wrapper scrolls only if the grid cannot shrink any further, which
     keeps a 16-wide puzzle usable on a phone without clipping anything. */
  .gridwrap { max-width: 100%; overflow-x: auto; padding-bottom: 4px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(${cols}, minmax(0, 1fr));
    gap: 3px;
    touch-action: none;
    width: 100%;
    max-width: ${cols * 46}px;
  }
  .cell {
    width: 100%; min-width: 24px; height: auto;
    aspect-ratio: 1;
    font-size: clamp(0.6rem, 2.4vw, 0.95rem);
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    cursor: pointer;
    user-select: none;
    padding: 0;
  }
  .cell.anchor  { background: var(--anchor); border-color: var(--anchor); color: #1a1d23; }
  .cell.trail   { background: #e8eff7; }
  .cell.found   { background: var(--found); border-color: var(--found); color: #fff; }
  .cell.revealed{ border-color: var(--revealed); box-shadow: inset 0 0 0 2px var(--revealed); }
  .cell:focus-visible { outline: 3px solid #1c7ed6; outline-offset: 2px; z-index: 1; }

  .side { flex: 1 1 240px; min-width: 0; }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }
  .card h2 { font-size: 0.95rem; margin: 0 0 0.75rem; }
  .wordlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .wordlist li { font-size: 0.9rem; line-height: 1.3; }
  .wordlist .sym { font-size: 1.05rem; }
  .wordlist .eng { color: var(--muted); font-size: 0.78rem; }
  .wordlist li.done .sym,
  .wordlist li.done .eng { text-decoration: line-through; opacity: 0.55; }

  .btn {
    display: block; width: 100%; margin-top: 0.75rem;
    padding: 0.6rem 1rem;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface); color: var(--text);
    font: inherit; font-weight: 600; cursor: pointer;
  }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .msg { margin-top: 0.75rem; font-size: 0.88rem; min-height: 1.4rem; color: var(--muted); }

  @media print {
    .btn, .msg { display: none; }
    body { background: #fff; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">
    Find each phoneme word in the grid. Drag from the first sound to the last,
    or click the first sound and then the last.
  </p>

  <div class="layout">
    <div class="gridwrap">
      <div id="grid" class="grid" role="group" aria-label="Word search grid"></div>
    </div>

    <div class="side">
      <div class="card">
        <h2>Words to find</h2>
        <ul class="wordlist" id="wordlist"></ul>
        <div class="msg" id="msg" role="status" aria-live="polite"></div>
        ${
          allowAnswers
            ? '<button class="btn" id="reveal" type="button">Show answers</button>'
            : ""
        }
        <button class="btn primary" id="reset" type="button">Start again</button>
      </div>
    </div>
  </div>
</div>

<script>
(function () {
  var GRID = ${toScriptJson(grid)};
  var PLACEMENTS = ${toScriptJson(placements)};
  var HINTS = ${toScriptJson(PHONEME_HINTS)};
  var SHOW_HINTS = ${showHints ? "true" : "false"};
  var ROWS = ${rows};
  var COLS = ${cols};

  var gridEl = document.getElementById("grid");
  var listEl = document.getElementById("wordlist");
  var msgEl = document.getElementById("msg");

  var found = {};
  var anchor = null;
  var dragging = false;
  var cells = [];

  function hintFor(sym) {
    var h = HINTS[sym];
    return h ? h.label + " (as in " + h.example + ")" : sym;
  }

  function key(r, c) { return r + ":" + c; }

  function buildGrid() {
    gridEl.innerHTML = "";
    cells = [];
    for (var r = 0; r < ROWS; r++) {
      cells.push([]);
      for (var c = 0; c < COLS; c++) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "cell ipa";
        b.textContent = GRID[r][c];
        b.dataset.row = r;
        b.dataset.col = c;
        b.setAttribute("aria-label",
          "Row " + (r + 1) + " column " + (c + 1) + ", " + hintFor(GRID[r][c]));
        gridEl.appendChild(b);
        cells[r].push(b);
      }
    }
  }

  function buildList() {
    listEl.innerHTML = "";
    for (var i = 0; i < PLACEMENTS.length; i++) {
      var p = PLACEMENTS[i];
      var li = document.createElement("li");
      li.dataset.word = p.word;

      var sym = document.createElement("div");
      sym.className = "sym ipa";
      sym.textContent = p.phonemes.join(" ");
      li.appendChild(sym);

      if (SHOW_HINTS) {
        var eng = document.createElement("div");
        eng.className = "eng";
        eng.textContent = p.word;
        li.appendChild(eng);
      }
      listEl.appendChild(li);
    }
  }

  // Straight line between two cells, or null if not aligned.
  function pathBetween(r1, c1, r2, c2) {
    var dr = r2 - r1, dc = c2 - c1;
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    var sr = steps === 0 ? 0 : dr / steps;
    var sc = steps === 0 ? 0 : dc / steps;
    var path = [];
    for (var i = 0; i <= steps; i++) {
      path.push({ row: r1 + sr * i, col: c1 + sc * i });
    }
    return path;
  }

  function samePath(a, b) {
    if (a.length !== b.length) return false;
    var forward = true, backward = true;
    for (var i = 0; i < a.length; i++) {
      var j = a.length - 1 - i;
      if (a[i].row !== b[i].row || a[i].col !== b[i].col) forward = false;
      if (a[i].row !== b[j].row || a[i].col !== b[j].col) backward = false;
    }
    return forward || backward;
  }

  function clearTransient() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        cells[r][c].classList.remove("anchor", "trail");
      }
    }
  }

  function paintTrail(path) {
    clearTransient();
    if (!path) return;
    for (var i = 0; i < path.length; i++) {
      cells[path[i].row][path[i].col].classList.add("trail");
    }
  }

  function markFound(p) {
    found[p.word] = true;
    for (var i = 0; i < p.cells.length; i++) {
      cells[p.cells[i].row][p.cells[i].col].classList.add("found");
    }
    var li = listEl.querySelector('[data-word="' + p.word + '"]');
    if (li) li.classList.add("done");

    var remaining = PLACEMENTS.length - Object.keys(found).length;
    if (remaining === 0) {
      msgEl.textContent = "All words found. Well done!";
    } else {
      msgEl.textContent = "Found " + p.word + ". " + remaining + " to go.";
    }
  }

  function attempt(r1, c1, r2, c2) {
    var path = pathBetween(r1, c1, r2, c2);
    clearTransient();
    if (!path) {
      msgEl.textContent = "Selections must be a straight line.";
      return;
    }
    for (var i = 0; i < PLACEMENTS.length; i++) {
      var p = PLACEMENTS[i];
      if (found[p.word]) continue;
      if (samePath(path, p.cells)) {
        markFound(p);
        return;
      }
    }
    msgEl.textContent = "Not a word on the list. Try again.";
  }

  function cellAt(target) {
    if (!target || !target.dataset || target.dataset.row === undefined) return null;
    return { row: Number(target.dataset.row), col: Number(target.dataset.col) };
  }

  gridEl.addEventListener("pointerdown", function (e) {
    var pos = cellAt(e.target);
    if (!pos) return;
    dragging = true;
    anchor = pos;
    clearTransient();
    cells[pos.row][pos.col].classList.add("anchor");
    msgEl.textContent = "";
  });

  gridEl.addEventListener("pointermove", function (e) {
    if (!dragging || !anchor) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var pos = cellAt(el);
    if (!pos) return;
    paintTrail(pathBetween(anchor.row, anchor.col, pos.row, pos.col));
  });

  document.addEventListener("pointerup", function (e) {
    if (!dragging || !anchor) return;
    dragging = false;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var pos = cellAt(el);
    // Released on the same cell: keep the anchor so a second click can
    // complete the selection. This is what makes keyboard use work too.
    if (!pos || (pos.row === anchor.row && pos.col === anchor.col)) {
      return;
    }
    attempt(anchor.row, anchor.col, pos.row, pos.col);
    anchor = null;
  });

  // Click / Enter handling for the two-click and keyboard paths.
  gridEl.addEventListener("click", function (e) {
    var pos = cellAt(e.target);
    if (!pos) return;
    if (anchor && !(anchor.row === pos.row && anchor.col === pos.col)) {
      attempt(anchor.row, anchor.col, pos.row, pos.col);
      anchor = null;
    } else if (!anchor) {
      anchor = pos;
      clearTransient();
      cells[pos.row][pos.col].classList.add("anchor");
    }
  });

  var revealBtn = document.getElementById("reveal");
  if (revealBtn) {
    revealBtn.addEventListener("click", function () {
      for (var i = 0; i < PLACEMENTS.length; i++) {
        var p = PLACEMENTS[i];
        if (found[p.word]) continue;
        for (var j = 0; j < p.cells.length; j++) {
          cells[p.cells[j].row][p.cells[j].col].classList.add("revealed");
        }
      }
      msgEl.textContent = "Answers shown.";
    });
  }

  document.getElementById("reset").addEventListener("click", function () {
    found = {};
    anchor = null;
    msgEl.textContent = "";
    buildGrid();
    buildList();
  });

  buildGrid();
  buildList();
})();
</script>
</body>
</html>`;
}
