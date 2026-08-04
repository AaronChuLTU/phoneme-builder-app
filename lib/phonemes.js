/**
 * HCE phoneme data, extracted from HCE_Wordle_Phoneme_Corpus.docx
 * Broad Hunter Central English transcription.
 *
 * NOTE: the corpus mixes U+0067 LATIN SMALL LETTER G (g) with
 * U+0261 LATIN SMALL LETTER SCRIPT G (ɡ). Everything here is
 * normalised to ɡ (U+0261) so string comparison in the game works.
 * If you ever hand-type a word, watch for this — it is invisible on screen.
 */

// ---------------------------------------------------------------------------
// Keyboard layout — mirrors the table in the corpus document.
// Each row is rendered as a row of buttons beside the game grid.
// `null` marks an intentionally empty cell so the columns stay aligned.
// ---------------------------------------------------------------------------

export const KEYBOARD_ROWS = [
  ["p", "t", "k", null],
  ["b", "d", "ɡ", null],
  ["n", "m", "ŋ", null],
  ["f", "s", "θ", "ʃ"],
  ["v", "z", "ð", "ʒ"],
  ["l", "ɹ", "w", "j"],
  ["h", "tʃ", "dʒ", null],
  ["iː", "ɪ", "e", "eː"],
  ["æ", "ɐ", "ɐː", "ɜː"],
  ["ʉː", "ɔ", "oː", "ʊ"],
  ["æɪ", "ɑe", "oɪ", "əʉ"],
  ["æɔ", "ɪə", null, "ə"],
];

// ---------------------------------------------------------------------------
// Hints. Satisfies the brief's requirement for "hover labels such as /θ/ with
// the button label TH (as in thin)".
//   label   -> the English letter equivalence shown on/near the button
//   example -> the keyword, used in the tooltip
// Tooltip text is built by hintFor() below.
// ---------------------------------------------------------------------------

export const PHONEME_HINTS = {
  // --- stops ---
  p:  { label: "P",  example: "pin" },
  b:  { label: "B",  example: "bed" },
  t:  { label: "T",  example: "top" },
  d:  { label: "D",  example: "dog" },
  k:  { label: "K",  example: "cat" },
  ɡ:  { label: "G",  example: "gum" },

  // --- nasals ---
  m:  { label: "M",  example: "man" },
  n:  { label: "N",  example: "net" },
  ŋ:  { label: "NG", example: "ring" },

  // --- fricatives ---
  f:  { label: "F",  example: "fan" },
  v:  { label: "V",  example: "van" },
  θ:  { label: "TH", example: "thin" },   // voiceless
  ð:  { label: "TH", example: "then" },   // voiced
  s:  { label: "S",  example: "sun" },
  z:  { label: "Z",  example: "zip" },
  ʃ:  { label: "SH", example: "ship" },
  ʒ:  { label: "ZH", example: "measure" },
  h:  { label: "H",  example: "hat" },

  // --- affricates ---
  tʃ: { label: "CH", example: "chin" },
  dʒ: { label: "J",  example: "jam" },

  // --- approximants ---
  l:  { label: "L",  example: "log" },
  ɹ:  { label: "R",  example: "red" },
  w:  { label: "W",  example: "win" },
  j:  { label: "Y",  example: "yes" },

  // --- short vowels ---
  ɪ:  { label: "I",  example: "bid" },
  e:  { label: "E",  example: "bed" },
  æ:  { label: "A",  example: "bad" },
  ɐ:  { label: "U",  example: "bud" },
  ɔ:  { label: "O",  example: "log" },
  ʊ:  { label: "OO", example: "book" },
  ə:  { label: "UH", example: "about" },

  // --- long vowels ---
  iː: { label: "EE", example: "scream" },
  eː: { label: "AIR", example: "square" },
  ɐː: { label: "AR", example: "bark" },
  ɜː: { label: "IR", example: "bird" },
  ʉː: { label: "OO", example: "boot" },
  oː: { label: "OR", example: "fork" },

  // --- diphthongs ---
  æɪ: { label: "AY", example: "bait" },
  ɑe: { label: "IE", example: "bike" },
  oɪ: { label: "OY", example: "boil" },
  əʉ: { label: "OH", example: "boat" },
  æɔ: { label: "OW", example: "cloud" },
  ɪə: { label: "EAR", example: "beard" },
};

/** Tooltip string for a phoneme, e.g. hintFor("θ") -> "TH (as in thin)" */
export function hintFor(symbol) {
  const h = PHONEME_HINTS[symbol];
  return h ? `${h.label} (as in ${h.example})` : symbol;
}

// ---------------------------------------------------------------------------
// Word lists. Grouped by phoneme count — this doubles as your difficulty
// setting (3 = easy, 4 = medium, 5 = hard).
// ---------------------------------------------------------------------------

export const WORDS_3 = [
  { word: "bed",    phonemes: ["b", "e", "d"] },
  { word: "bid",    phonemes: ["b", "ɪ", "d"] },
  { word: "bad",    phonemes: ["b", "æ", "d"] },
  { word: "bud",    phonemes: ["b", "ɐ", "d"] },
  { word: "bird",   phonemes: ["b", "ɜː", "d"] },
  { word: "bark",   phonemes: ["b", "ɐː", "k"] },
  { word: "book",   phonemes: ["b", "ʊ", "k"] },
  { word: "boot",   phonemes: ["b", "ʉː", "t"] },
  { word: "boat",   phonemes: ["b", "əʉ", "t"] },
  { word: "bike",   phonemes: ["b", "ɑe", "k"] },
  { word: "bait",   phonemes: ["b", "æɪ", "t"] },
  { word: "boil",   phonemes: ["b", "oɪ", "l"] },
  { word: "beard",  phonemes: ["b", "ɪə", "d"] },
  { word: "choice", phonemes: ["tʃ", "oɪ", "s"] },
  { word: "thin",   phonemes: ["θ", "ɪ", "n"] },
  { word: "then",   phonemes: ["ð", "e", "n"] },
  { word: "ship",   phonemes: ["ʃ", "ɪ", "p"] },
  { word: "chin",   phonemes: ["tʃ", "ɪ", "n"] },
  { word: "jam",    phonemes: ["dʒ", "æ", "m"] },
  { word: "yes",    phonemes: ["j", "e", "s"] },
  { word: "win",    phonemes: ["w", "ɪ", "n"] },
  { word: "ring",   phonemes: ["ɹ", "ɪ", "ŋ"] },
  { word: "log",    phonemes: ["l", "ɔ", "ɡ"] },
  { word: "fan",    phonemes: ["f", "æ", "n"] },
  { word: "van",    phonemes: ["v", "æ", "n"] },
  { word: "sun",    phonemes: ["s", "ɐ", "n"] },
  { word: "zip",    phonemes: ["z", "ɪ", "p"] },
  { word: "gum",    phonemes: ["ɡ", "ɐ", "m"] },
  { word: "hat",    phonemes: ["h", "æ", "t"] },
  { word: "fork",   phonemes: ["f", "oː", "k"] },
];

export const WORDS_4 = [
  { word: "stop",  phonemes: ["s", "t", "ɔ", "p"] },
  { word: "frog",  phonemes: ["f", "ɹ", "ɔ", "ɡ"] },
  { word: "clap",  phonemes: ["k", "l", "æ", "p"] },
  { word: "slip",  phonemes: ["s", "l", "ɪ", "p"] },
  { word: "drum",  phonemes: ["d", "ɹ", "ɐ", "m"] },
  { word: "grin",  phonemes: ["ɡ", "ɹ", "ɪ", "n"] },
  { word: "train", phonemes: ["t", "ɹ", "æɪ", "n"] },
  { word: "cloud", phonemes: ["k", "l", "æɔ", "d"] },
  { word: "snake", phonemes: ["s", "n", "æɪ", "k"] },
  { word: "smile", phonemes: ["s", "m", "ɑe", "l"] },
  { word: "milk",  phonemes: ["m", "ɪ", "l", "k"] },
  { word: "hand",  phonemes: ["h", "æ", "n", "d"] },
  { word: "tent",  phonemes: ["t", "e", "n", "t"] },
  { word: "jump",  phonemes: ["dʒ", "ɐ", "m", "p"] },
  { word: "lamp",  phonemes: ["l", "æ", "m", "p"] },
  { word: "bank",  phonemes: ["b", "æ", "ŋ", "k"] },
  { word: "frame", phonemes: ["f", "ɹ", "æɪ", "m"] },
  { word: "cold",  phonemes: ["k", "əʉ", "l", "d"] },
  { word: "wind",  phonemes: ["w", "ɪ", "n", "d"] },
  { word: "soft",  phonemes: ["s", "ɔ", "f", "t"] },
  { word: "gift",  phonemes: ["ɡ", "ɪ", "f", "t"] },
  { word: "desk",  phonemes: ["d", "e", "s", "k"] },
  { word: "left",  phonemes: ["l", "e", "f", "t"] },
  { word: "pond",  phonemes: ["p", "ɔ", "n", "d"] },
  { word: "golf",  phonemes: ["ɡ", "ɔ", "l", "f"] },
  { word: "silk",  phonemes: ["s", "ɪ", "l", "k"] },
  { word: "great", phonemes: ["ɡ", "ɹ", "æɪ", "t"] },
  { word: "crab",  phonemes: ["k", "ɹ", "æ", "b"] },
  { word: "plug",  phonemes: ["p", "l", "ɐ", "ɡ"] },
  { word: "quiz",  phonemes: ["k", "w", "ɪ", "z"] },
];

export const WORDS_5 = [
  { word: "stamp",  phonemes: ["s", "t", "æ", "m", "p"] },
  { word: "plant",  phonemes: ["p", "l", "æ", "n", "t"] },
  { word: "blank",  phonemes: ["b", "l", "æ", "ŋ", "k"] },
  { word: "grand",  phonemes: ["ɡ", "ɹ", "æ", "n", "d"] },
  { word: "clamp",  phonemes: ["k", "l", "æ", "m", "p"] },
  { word: "twist",  phonemes: ["t", "w", "ɪ", "s", "t"] },
  { word: "trust",  phonemes: ["t", "ɹ", "ɐ", "s", "t"] },
  { word: "drink",  phonemes: ["d", "ɹ", "ɪ", "ŋ", "k"] },
  { word: "brisk",  phonemes: ["b", "ɹ", "ɪ", "s", "k"] },
  { word: "shrimp", phonemes: ["ʃ", "ɹ", "ɪ", "m", "p"] },
  { word: "scrap",  phonemes: ["s", "k", "ɹ", "æ", "p"] },
  { word: "scribe", phonemes: ["s", "k", "ɹ", "ɑe", "b"] },
  { word: "scream", phonemes: ["s", "k", "ɹ", "iː", "m"] },
  { word: "splash", phonemes: ["s", "p", "l", "æ", "ʃ"] },
  { word: "spring", phonemes: ["s", "p", "ɹ", "ɪ", "ŋ"] },
  { word: "strap",  phonemes: ["s", "t", "ɹ", "æ", "p"] },
  { word: "street", phonemes: ["s", "t", "ɹ", "iː", "t"] },
  { word: "scrub",  phonemes: ["s", "k", "ɹ", "ɐ", "b"] },
  { word: "flask",  phonemes: ["f", "l", "ɐː", "s", "k"] },
  { word: "clasp",  phonemes: ["k", "l", "ɐː", "s", "p"] },
  { word: "cleft",  phonemes: ["k", "l", "e", "f", "t"] },
  { word: "glint",  phonemes: ["ɡ", "l", "ɪ", "n", "t"] },
  { word: "blend",  phonemes: ["b", "l", "e", "n", "d"] },
  { word: "strain", phonemes: ["s", "t", "ɹ", "æɪ", "n"] },
  { word: "thrust", phonemes: ["θ", "ɹ", "ɐ", "s", "t"] },
  { word: "sprawl", phonemes: ["s", "p", "ɹ", "oː", "l"] },
  { word: "scrawl", phonemes: ["s", "k", "ɹ", "oː", "l"] },
  { word: "sprig",  phonemes: ["s", "p", "ɹ", "ɪ", "ɡ"] },
  { word: "sprout", phonemes: ["s", "p", "ɹ", "æɔ", "t"] },
  { word: "smoked", phonemes: ["s", "m", "əʉ", "k", "t"] },
];

/** Look up a difficulty band. length must be 3, 4 or 5. */
export const WORDS_BY_LENGTH = { 3: WORDS_3, 4: WORDS_4, 5: WORDS_5 };

export const ALL_WORDS = [...WORDS_3, ...WORDS_4, ...WORDS_5];
