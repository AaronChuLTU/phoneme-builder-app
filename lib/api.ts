/**
 * lib/api.ts
 *
 * Shared helpers so every API route returns the same shape and handles
 * failures the same way.
 *
 * Response shape:
 *   success  { data: ... }
 *   failure  { error: "message", details?: [...] }
 *
 * Having one shape means the frontend has one way to read a response, and
 * one place to change if that ever needs to differ.
 */

import { NextResponse } from "next/server";

/** 200 with a data payload. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/** 201 for a successful create, so the client knows a resource now exists. */
export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/** A failure with a human-readable message and optional field details. */
export function fail(message: string, status = 400, details?: string[]) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export const notFound = (what = "Resource") => fail(`${what} not found`, 404);

/**
 * Wraps a route handler so an unexpected throw becomes a 500 with a useful
 * message, rather than an unhandled rejection that returns nothing.
 *
 * Prisma error codes are translated into the status the client deserves:
 *   P2002 unique constraint  -> 409 Conflict
 *   P2003 foreign key        -> 400 Bad Request
 *   P2025 record not found   -> 404 Not Found
 * Without this, all three would surface as a generic 500 and the frontend
 * could not tell "you sent something invalid" from "the server broke".
 */
export async function handle<T>(work: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await work();
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;

    if (code === "P2002") {
      return fail("That already exists", 409);
    }
    if (code === "P2003") {
      return fail("Referenced record does not exist", 400);
    }
    if (code === "P2025") {
      return fail("Record not found", 404);
    }

    console.error("Unhandled API error:", error);
    return fail("Something went wrong on the server", 500);
  }
}

/**
 * Parse a route parameter that should be a positive integer.
 * Returns null when it is not, so the caller can return a 400 rather than
 * passing NaN into a database query.
 */
export function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Read a JSON body, returning null if it is missing or malformed.
 * A request with no body or broken JSON should be a 400, not a crash.
 */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
