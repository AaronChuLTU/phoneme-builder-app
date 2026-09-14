/**
 * lib/validation.ts
 *
 * Input validation for the API routes.
 *
 * Written by hand rather than with a schema library because most of the rules
 * here are domain rules, not shape rules: a phoneme is only valid if it
 * exists in the inventory stored in the database, and that cannot be checked
 * without a query. Keeping both kinds of check in one place means a caller
 * only has to ask once whether input is acceptable.
 *
 * Every validator returns the same result type, so routes handle success and
 * failure identically regardless of what they were validating.
 */

export type Valid<T> = { ok: true; value: T };
export type Invalid = { ok: false; errors: string[] };
export type Result<T> = Valid<T> | Invalid;

const valid = <T>(value: T): Valid<T> => ({ ok: true, value });
const invalid = (...errors: string[]): Invalid => ({ ok: false, errors });

export const ACTIVITY_TYPES = ["WORDLE", "WORD_SEARCH"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const LIMITS = {
  nameMin: 1,
  nameMax: 80,
  descriptionMax: 500,
  englishMin: 1,
  englishMax: 40,
  phonemesMin: 1,
  phonemesMax: 12,
  guessesMin: 1,
  guessesMax: 10,
  gridMin: 8,
  gridMax: 16,
};

/** True when the value is a plain object, so property access is safe. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

// ---------------------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------------------

export type WordListInput = { name: string; description: string | null };

export function validateWordList(body: unknown): Result<WordListInput> {
  if (!isObject(body)) return invalid("Request body must be a JSON object");

  const errors: string[] = [];

  const name = trimmedString(body.name);
  if (name === null) {
    errors.push("name is required and must be text");
  } else if (name.length < LIMITS.nameMin) {
    errors.push("name cannot be empty");
  } else if (name.length > LIMITS.nameMax) {
    errors.push(`name must be ${LIMITS.nameMax} characters or fewer`);
  }

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    const text = trimmedString(body.description);
    if (text === null) {
      errors.push("description must be text");
    } else if (text.length > LIMITS.descriptionMax) {
      errors.push(
        `description must be ${LIMITS.descriptionMax} characters or fewer`
      );
    } else {
      description = text.length > 0 ? text : null;
    }
  }

  if (errors.length > 0) return invalid(...errors);
  return valid({ name: name as string, description });
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

export type WordInput = { english: string; phonemes: string[] };

/**
 * @param body            the parsed request body
 * @param knownSymbols    every phoneme symbol currently in the database
 *
 * The inventory is passed in rather than queried here so this function stays
 * pure and testable, and so the route can fetch the inventory once for a
 * batch rather than once per word.
 */
export function validateWord(
  body: unknown,
  knownSymbols: Set<string>
): Result<WordInput> {
  if (!isObject(body)) return invalid("Request body must be a JSON object");

  const errors: string[] = [];

  const english = trimmedString(body.english);
  if (english === null) {
    errors.push("english is required and must be text");
  } else if (english.length < LIMITS.englishMin) {
    errors.push("english cannot be empty");
  } else if (english.length > LIMITS.englishMax) {
    errors.push(`english must be ${LIMITS.englishMax} characters or fewer`);
  }

  let phonemes: string[] = [];
  if (!Array.isArray(body.phonemes)) {
    errors.push("phonemes is required and must be an array of symbols");
  } else if (body.phonemes.length < LIMITS.phonemesMin) {
    errors.push("phonemes must contain at least one symbol");
  } else if (body.phonemes.length > LIMITS.phonemesMax) {
    errors.push(`phonemes cannot contain more than ${LIMITS.phonemesMax} symbols`);
  } else if (!body.phonemes.every((p) => typeof p === "string")) {
    errors.push("every phoneme must be a text symbol");
  } else {
    phonemes = body.phonemes as string[];

    // The domain rule: a word made of symbols that are not on the keyboard
    // cannot be answered, because there is no key to press. Reject it here
    // rather than storing data that produces a broken activity later.
    const unknown = [...new Set(phonemes.filter((p) => !knownSymbols.has(p)))];
    if (unknown.length > 0) {
      errors.push(
        `unknown phoneme ${unknown.length === 1 ? "symbol" : "symbols"}: ${unknown.join(", ")}`
      );
    }
  }

  if (errors.length > 0) return invalid(...errors);
  return valid({ english: english as string, phonemes });
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export type ActivityInput = {
  name: string;
  type: (typeof ACTIVITY_TYPES)[number];
  wordListId: number;
  showHints: boolean;
  maxGuesses: number;
  gridSize: number;
  difficulty: (typeof DIFFICULTIES)[number];
  allowAnswers: boolean;
};

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function intInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  field: string,
  errors: string[]
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${field} must be a whole number`);
    return fallback;
  }
  if (value < min || value > max) {
    errors.push(`${field} must be between ${min} and ${max}`);
    return fallback;
  }
  return value;
}

export function validateActivity(body: unknown): Result<ActivityInput> {
  if (!isObject(body)) return invalid("Request body must be a JSON object");

  const errors: string[] = [];

  const name = trimmedString(body.name);
  if (name === null || name.length === 0) {
    errors.push("name is required");
  } else if (name.length > LIMITS.nameMax) {
    errors.push(`name must be ${LIMITS.nameMax} characters or fewer`);
  }

  const type = trimmedString(body.type);
  if (type === null || !ACTIVITY_TYPES.includes(type as never)) {
    errors.push(`type must be one of: ${ACTIVITY_TYPES.join(", ")}`);
  }

  // SQLite has no enum type, so this string check is what keeps the column
  // honest. On PostgreSQL the database would enforce it too.
  const difficultyRaw = body.difficulty ?? "medium";
  const difficulty = trimmedString(difficultyRaw);
  if (difficulty === null || !DIFFICULTIES.includes(difficulty as never)) {
    errors.push(`difficulty must be one of: ${DIFFICULTIES.join(", ")}`);
  }

  let wordListId = 0;
  if (typeof body.wordListId !== "number" || !Number.isInteger(body.wordListId)) {
    errors.push("wordListId is required and must be a whole number");
  } else if (body.wordListId <= 0) {
    errors.push("wordListId must be a positive number");
  } else {
    wordListId = body.wordListId;
  }

  const maxGuesses = intInRange(
    body.maxGuesses,
    LIMITS.guessesMin,
    LIMITS.guessesMax,
    6,
    "maxGuesses",
    errors
  );

  const gridSize = intInRange(
    body.gridSize,
    LIMITS.gridMin,
    LIMITS.gridMax,
    10,
    "gridSize",
    errors
  );

  if (errors.length > 0) return invalid(...errors);

  return valid({
    name: name as string,
    type: type as (typeof ACTIVITY_TYPES)[number],
    wordListId,
    showHints: boolOr(body.showHints, true),
    maxGuesses,
    gridSize,
    difficulty: difficulty as (typeof DIFFICULTIES)[number],
    allowAnswers: boolOr(body.allowAnswers, true),
  });
}
