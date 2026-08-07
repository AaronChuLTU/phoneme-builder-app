/**
 * generateWordle.js
 *
 * Turns the teacher's settings into a complete, standalone HTML document.
 *
 * The returned string is a whole web page: markup, styling and game logic all
 * in one file, with no external requests. A student can open it from a USB
 * stick on a school computer with no internet and it will work.
 *
 * This file contains no React. It is a pure function — settings in, string
 * out — which means it can be unit tested and, in Assessment 2, called from a
 * server route with words pulled from a database without changing anything.
 */

import { KEYBOARD_ROWS, PHONEME_HINTS } from "./phonemes";

/**
 * Escape text that will be placed into HTML markup.
 * The teacher types the English word and title, so those values must never be
 * trusted to be safe HTML — otherwise a stray < breaks the whole page.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape a value being embedded inside the generated <script> tag.
 * JSON.stringify handles quoting, but the sequence "</script>" appearing in a
 * string would end the script block early, so it is broken up.
 */
function toScriptJson(value) {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

/**
 * Build the standalone Wordle page.
 *
 * @param {object}   settings
 * @param {string[]} settings.phonemes   the answer, e.g. ["θ", "ɪ", "n"]
 * @param {string}   settings.english    English spelling revealed on a win
 * @param {number}   settings.maxGuesses number of attempts allowed
 * @param {boolean}  settings.showHints  show English letter hints on keys
 * @param {string}   settings.title      heading shown on the activity
 * @returns {string} a complete HTML document
 */
export function generateWordleHtml({
  phonemes,
  english = "",
  maxGuesses = 6,
  showHints = true,
  title = "Phoneme Wordle",
}) {
  const answerJson = toScriptJson(phonemes);
  const rowsJson = toScriptJson(KEYBOARD_ROWS);
  const hintsJson = toScriptJson(PHONEME_HINTS);
  const englishJson = toScriptJson(english);

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
    --correct: #3f8f5b;
    --present: #c9a227;
    --absent: #7c8595;
    --accent: #2b5c8f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 1.5rem 1rem 3rem;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
  .sub { color: var(--muted); font-size: 0.9rem; margin: 0 0 1.5rem; }
  .ipa {
    font-family: "Gentium Plus", "Charis SIL", "Segoe UI",
      "Lucida Sans Unicode", sans-serif;
  }

  .layout { display: flex; flex-wrap: wrap; gap: 2rem; align-items: flex-start; }
  .panel { flex: 1 1 260px; min-width: 0; }

  /* The grid is capped at a comfortable size but shrinks to fit narrow
     screens. Tiles share the row width equally and stay square via
     aspect-ratio, so a long word never forces horizontal overflow. */
  .grid {
    display: flex; flex-direction: column; gap: 6px;
    max-width: min(100%, ${phonemes.length * 62}px);
  }
  .row { display: flex; gap: 6px; }
  .tile {
    flex: 1 1 0; min-width: 0;
    aspect-ratio: 1;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    font-size: clamp(0.85rem, 4.5vw, 1.25rem);
    transition: background 150ms, border-color 150ms, color 150ms;
  }
  .tile.filled { border-color: var(--absent); }
  .tile.correct { background: var(--correct); border-color: var(--correct); color: #fff; }
  .tile.present { background: var(--present); border-color: var(--present); color: #1a1d23; }
  .tile.absent  { background: var(--absent);  border-color: var(--absent);  color: #fff; }

  .kb { display: flex; flex-direction: column; gap: 6px; }
  .kbrow { display: flex; gap: 6px; }
  .key {
    position: relative;
    width: 54px; max-width: 22vw; height: 46px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font: inherit;
    line-height: 1.05;
    padding: 2px;
  }
  .key:hover:not(:disabled) { background: #e8eff7; }
  .key:disabled { opacity: 0.5; cursor: not-allowed; }
  .key .sym { display: block; font-size: 1.05rem; }
  .key .lab { display: block; font-size: 0.6rem; opacity: 0.7; }
  .key .tip {
    position: absolute; bottom: calc(100% + 6px); left: 50%;
    transform: translateX(-50%);
    background: var(--text); color: var(--bg);
    padding: 3px 7px; border-radius: 4px;
    font-size: 0.7rem; white-space: nowrap;
    opacity: 0; pointer-events: none; transition: opacity 120ms;
    z-index: 10;
  }
  .key:hover .tip, .key:focus-visible .tip { opacity: 1; }
  .key.spacer { visibility: hidden; }
  .key.correct { background: var(--correct); border-color: var(--correct); color: #fff; }
  .key.present { background: var(--present); border-color: var(--present); color: #1a1d23; }
  .key.absent  { background: var(--absent);  border-color: var(--absent);  color: #fff; }

  .controls { display: flex; gap: 8px; margin-top: 12px; }
  .btn {
    flex: 1; padding: 0.6rem 1rem;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--surface); color: var(--text);
    font: inherit; font-weight: 600; cursor: pointer;
  }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .msg { margin-top: 1rem; min-height: 2.5rem; font-size: 0.95rem; }
  .msg .result { font-weight: 600; }
  .msg .answer { margin-top: 0.25rem; color: var(--muted); }

  :where(button):focus-visible { outline: 3px solid #1c7ed6; outline-offset: 2px; }

  @media print { .kb, .controls { display: none; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">Guess the word by its sounds. Each tile is one phoneme.</p>

  <div class="layout">
    <div class="panel">
      <div class="grid" id="grid" role="group" aria-label="Guess grid"></div>
      <div class="msg" id="msg" role="status" aria-live="polite"></div>
    </div>

    <div class="panel">
      <div class="kb" id="kb" role="group" aria-label="Phoneme keyboard"></div>
      <div class="controls">
        <button class="btn" id="back" type="button">Backspace</button>
        <button class="btn primary" id="enter" type="button">Enter</button>
      </div>
    </div>
  </div>
</div>

<script>
(function () {
  var ANSWER = ${answerJson};
  var ENGLISH = ${englishJson};
  var MAX_GUESSES = ${maxGuesses};
  var SHOW_HINTS = ${showHints ? "true" : "false"};
  var ROWS = ${rowsJson};
  var HINTS = ${hintsJson};

  var LENGTH = ANSWER.length;
  var guesses = [];
  var current = [];
  var over = false;
  var keyState = {};

  var gridEl = document.getElementById("grid");
  var kbEl = document.getElementById("kb");
  var msgEl = document.getElementById("msg");

  function hintFor(sym) {
    var h = HINTS[sym];
    return h ? h.label + " (as in " + h.example + ")" : sym;
  }

  // Standard Wordle scoring, including repeated phonemes: exact matches are
  // claimed first, then remaining tiles draw from what is left over.
  function score(guess) {
    var result = [];
    var pool = {};
    var i;
    for (i = 0; i < LENGTH; i++) {
      result.push("absent");
      if (guess[i] !== ANSWER[i]) {
        pool[ANSWER[i]] = (pool[ANSWER[i]] || 0) + 1;
      }
    }
    for (i = 0; i < LENGTH; i++) {
      if (guess[i] === ANSWER[i]) result[i] = "correct";
    }
    for (i = 0; i < LENGTH; i++) {
      if (result[i] === "correct") continue;
      if (pool[guess[i]] > 0) {
        result[i] = "present";
        pool[guess[i]]--;
      }
    }
    return result;
  }

  var RANK = { absent: 0, present: 1, correct: 2 };

  function drawGrid() {
    gridEl.innerHTML = "";
    for (var r = 0; r < MAX_GUESSES; r++) {
      var row = document.createElement("div");
      row.className = "row";
      for (var c = 0; c < LENGTH; c++) {
        var tile = document.createElement("div");
        tile.className = "tile ipa";
        if (r < guesses.length) {
          tile.textContent = guesses[r].guess[c];
          tile.className += " " + guesses[r].result[c];
        } else if (r === guesses.length && current[c]) {
          tile.textContent = current[c];
          tile.className += " filled";
        }
        row.appendChild(tile);
      }
      gridEl.appendChild(row);
    }
  }

  function drawKeyboard() {
    kbEl.innerHTML = "";
    for (var r = 0; r < ROWS.length; r++) {
      var row = document.createElement("div");
      row.className = "kbrow";
      for (var c = 0; c < ROWS[r].length; c++) {
        var sym = ROWS[r][c];
        var btn = document.createElement("button");
        btn.type = "button";
        if (sym === null) {
          btn.className = "key spacer";
          btn.disabled = true;
          btn.setAttribute("aria-hidden", "true");
          btn.tabIndex = -1;
        } else {
          btn.className = "key" + (keyState[sym] ? " " + keyState[sym] : "");
          btn.setAttribute("aria-label", "Phoneme " + sym + ", " + hintFor(sym));
          btn.disabled = over;

          var symEl = document.createElement("span");
          symEl.className = "sym ipa";
          symEl.textContent = sym;
          btn.appendChild(symEl);

          if (SHOW_HINTS && HINTS[sym]) {
            var labEl = document.createElement("span");
            labEl.className = "lab";
            labEl.textContent = HINTS[sym].label;
            btn.appendChild(labEl);
          }

          var tip = document.createElement("span");
          tip.className = "tip";
          tip.setAttribute("aria-hidden", "true");
          tip.textContent = hintFor(sym);
          btn.appendChild(tip);

          btn.addEventListener("click", makeHandler(sym));
        }
        row.appendChild(btn);
      }
      kbEl.appendChild(row);
    }
  }

  function makeHandler(sym) {
    return function () { press(sym); };
  }

  function press(sym) {
    if (over || current.length >= LENGTH) return;
    current.push(sym);
    drawGrid();
  }

  function backspace() {
    if (over) return;
    current.pop();
    drawGrid();
  }

  function say(html) { msgEl.innerHTML = html; }

  function submit() {
    if (over) return;
    if (current.length < LENGTH) {
      say('<span class="result">Choose ' + LENGTH + ' phonemes before entering.</span>');
      return;
    }

    var result = score(current);
    guesses.push({ guess: current.slice(), result: result });

    for (var i = 0; i < LENGTH; i++) {
      var sym = current[i];
      if (!keyState[sym] || RANK[result[i]] > RANK[keyState[sym]]) {
        keyState[sym] = result[i];
      }
    }

    var won = result.every(function (r) { return r === "correct"; });
    current = [];

    if (won) {
      over = true;
      say('<span class="result">Correct!</span>' +
          (ENGLISH ? '<div class="answer">The word is "' + ENGLISH + '".</div>' : ""));
    } else if (guesses.length >= MAX_GUESSES) {
      over = true;
      say('<span class="result">Out of guesses.</span>' +
          '<div class="answer">The answer was ' + ANSWER.join(" ") +
          (ENGLISH ? ' &mdash; "' + ENGLISH + '"' : "") + '.</div>');
    } else {
      say('<span class="result">' + (MAX_GUESSES - guesses.length) +
          ' guess' + (MAX_GUESSES - guesses.length === 1 ? "" : "es") + ' left.</span>');
    }

    drawGrid();
    drawKeyboard();
  }

  document.getElementById("back").addEventListener("click", backspace);
  document.getElementById("enter").addEventListener("click", submit);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") submit();
    if (e.key === "Backspace") backspace();
  });

  drawGrid();
  drawKeyboard();
})();
</script>
</body>
</html>`;
}
