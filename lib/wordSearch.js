/**
 * wordSearch.js
 *
 * The grid-building algorithm. Pure and deterministic: given the same words,
 * size and seed it always produces the same grid.
 *
 * Determinism matters here. The teacher previews the puzzle in the builder and
 * then downloads it — if the algorithm used Math.random() directly, the
 * downloaded puzzle would be a different one from the preview. Instead a seed
 * is part of the settings, and "Shuffle" simply picks a new seed.
 *
 * Contains no React and no DOM, so it can be tested on its own.
 */

/**
 * Small seeded pseudo-random number generator (mulberry32).
 * Returns a function producing numbers in [0, 1).
 */
function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** All eight directions, as row/column deltas. */
export const DIRECTIONS = {
  east: { dr: 0, dc: 1, label: "Left to right" },
  south: { dr: 1, dc: 0, label: "Top to bottom" },
  southEast: { dr: 1, dc: 1, label: "Diagonal down-right" },
  northEast: { dr: -1, dc: 1, label: "Diagonal up-right" },
  west: { dr: 0, dc: -1, label: "Right to left" },
  north: { dr: -1, dc: 0, label: "Bottom to top" },
  northWest: { dr: -1, dc: -1, label: "Diagonal up-left" },
  southWest: { dr: 1, dc: -1, label: "Diagonal down-left" },
};

/** Difficulty presets, expressed as which directions are allowed. */
export const DIRECTION_SETS = {
  easy: ["east", "south"],
  medium: ["east", "south", "southEast", "northEast"],
  hard: Object.keys(DIRECTIONS),
};

/**
 * Can `units` be placed starting at (r, c) heading in direction d?
 * Overlaps are allowed only where the existing phoneme already matches.
 */
function canPlace(grid, units, r, c, d, rows, cols) {
  const endR = r + d.dr * (units.length - 1);
  const endC = c + d.dc * (units.length - 1);
  if (endR < 0 || endR >= rows || endC < 0 || endC >= cols) return false;

  for (let i = 0; i < units.length; i++) {
    const cell = grid[r + d.dr * i][c + d.dc * i];
    if (cell !== null && cell !== units[i]) return false;
  }
  return true;
}

/**
 * Build a puzzle.
 *
 * @param {object}   options
 * @param {Array}    options.words      [{ word, phonemes }]
 * @param {number}   options.rows
 * @param {number}   options.cols
 * @param {string[]} options.directions keys of DIRECTIONS to allow
 * @param {number}   options.seed
 * @returns {{ grid: string[][], placements: Array, unplaced: string[] }}
 *          placements: [{ word, phonemes, cells: [{row, col}] }]
 *          unplaced:   words that would not fit, so the UI can warn
 */
export function buildPuzzle({
  words,
  rows = 10,
  cols = 10,
  directions = DIRECTION_SETS.medium,
  seed = 1,
}) {
  const random = makeRandom(seed);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const placements = [];
  const unplaced = [];

  const allowed = directions
    .map((key) => DIRECTIONS[key])
    .filter(Boolean);

  // Longest first — long words are hardest to fit, so place them while the
  // grid is still empty.
  const ordered = [...words].sort(
    (a, b) => b.phonemes.length - a.phonemes.length
  );

  for (const entry of ordered) {
    const units = entry.phonemes;
    let placed = false;

    // Try random positions, then fall back to an exhaustive sweep so a word
    // is only reported unplaceable if it genuinely cannot fit.
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const d = allowed[Math.floor(random() * allowed.length)];
      const r = Math.floor(random() * rows);
      const c = Math.floor(random() * cols);
      if (canPlace(grid, units, r, c, d, rows, cols)) {
        placeWord(grid, placements, entry, units, r, c, d);
        placed = true;
      }
    }

    if (!placed) {
      outer: for (const d of allowed) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (canPlace(grid, units, r, c, d, rows, cols)) {
              placeWord(grid, placements, entry, units, r, c, d);
              placed = true;
              break outer;
            }
          }
        }
      }
    }

    if (!placed) unplaced.push(entry.word);
  }

  // Fill the gaps with phonemes drawn from the words themselves. Using random
  // IPA symbols from the whole inventory would make the puzzle easy — students
  // could spot the target sounds because nothing else looked like them.
  const pool = [...new Set(words.flatMap((entry) => entry.phonemes))];
  const fillPool = pool.length > 0 ? pool : ["ə"];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = fillPool[Math.floor(random() * fillPool.length)];
      }
    }
  }

  // Return placements in the caller's original word order, not longest-first.
  const byWord = new Map(placements.map((p) => [p.word, p]));
  const ordered2 = words.map((entry) => byWord.get(entry.word)).filter(Boolean);

  return { grid, placements: ordered2, unplaced };
}

function placeWord(grid, placements, entry, units, r, c, d) {
  const cells = [];
  for (let i = 0; i < units.length; i++) {
    const row = r + d.dr * i;
    const col = c + d.dc * i;
    grid[row][col] = units[i];
    cells.push({ row, col });
  }
  placements.push({ word: entry.word, phonemes: units, cells });
}
