/**
 * lib/prisma.ts
 *
 * A single shared PrismaClient for the whole app.
 *
 * Why a singleton: in development Next.js hot-reloads modules on every file
 * save. Creating `new PrismaClient()` at module scope would therefore create
 * a new client — and a new database connection — on every reload, until the
 * connection pool is exhausted and queries start failing. Caching the client
 * on `globalThis` survives hot reloads because that object is not reset.
 *
 * In production the module is only evaluated once, so the cache is skipped.
 */

import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is useful while building the API routes. Errors and
    // warnings are kept in production; raw queries are not.
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
