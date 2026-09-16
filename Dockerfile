# syntax=docker/dockerfile:1

# =============================================================================
# Phoneme Activity Builder — Dockerfile
#
# Four stages:
#   deps        install every dependency, needed to build (the build step
#               itself uses devDependencies such as typescript and tailwind)
#   builder     compile the Next.js app and generate the Linux Prisma client
#   prod-deps   a second, separate install — production dependencies only —
#               so the runner gets a guaranteed-complete, predictable
#               node_modules rather than hand-picked subfolders that might
#               be missing something a package needs at runtime
#   runner      the image that ships
# =============================================================================

FROM node:20-alpine AS base
# Alpine ships musl libc rather than glibc. Prisma's engine binaries are
# built per libc, which is exactly why schema.prisma lists
# "linux-musl-openssl-3.0.x" in binaryTargets — the engine generated in the
# builder stage has to match the libc it will run under here.
RUN apk add --no-cache libc6-compat openssl


# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenerates the client using THIS container's binaryTargets, producing the
# Linux engine binary. Generating on Windows earlier produced a Windows
# binary only — it has to happen again here, inside Linux, to get one that
# actually runs in this image.
#
# DATABASE_URL is set here only because prisma.config.ts requires the
# variable to exist — `prisma generate` reads the schema to produce client
# code and never actually opens a database connection, so the value itself
# is never used. .env is excluded from the build by .dockerignore, so
# without this line the variable would not exist at all at this point and
# the command would refuse to run. The real value, used when the server
# actually queries the database, is set in docker-compose.yml.
ENV DATABASE_URL="file:/app/data/dev.db"
RUN npx prisma generate

# output: "standalone" in next.config.ts traces every file the server needs
# into .next/standalone. Still useful for a lean server bundle, even though
# the runner stage below also brings its own full production node_modules —
# see the note there for why both exist.
RUN npm run build


# -----------------------------------------------------------------------------
# A clean, production-only install, independent of the deps stage above.
# tsx and prisma (the CLI) are ordinary "dependencies" in package.json, not
# devDependencies, specifically so they survive --omit=dev and are available
# to docker-entrypoint.sh for running migrations and the seed script.
# -----------------------------------------------------------------------------
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev


# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# A dedicated non-root user. Running as root inside a container is an
# unnecessary privilege escalation if the app is ever compromised.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone server and the static assets it serves.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Layer the full production node_modules over the standalone output's
# partial one. Next's tracer follows static import/require calls; it cannot
# see Prisma's query engine, which is loaded from disk by filename at
# runtime rather than imported. Rather than guess which specific packages
# tracing missed, prod-deps' complete install is copied on top, guaranteeing
# tsx, the prisma CLI and every transitive dependency are genuinely present.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# The Prisma schema and migrations (to run against the database) and the
# generated client with its Linux engine binary (see the note above on why
# tracing cannot be trusted to have included it).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated

# prisma/seed.ts imports lib/phonemes.js directly. Next's build tracing only
# follows the app's own import graph — the server, its pages, its API
# routes — and the seed script is never imported by any of those, so
# tracing never sees it and lib/phonemes.js was never carried into
# .next/standalone. It has to be copied explicitly, the same reason
# lib/generated is copied explicitly above.
COPY --from=builder --chown=nextjs:nodejs /app/lib/phonemes.js ./lib/phonemes.js

# Where the SQLite file lives at runtime. Deliberately NOT inside ./prisma:
# a Docker volume mounted there to persist data would shadow the schema and
# migrations baked into the image, since a mount point takes on the volume's
# contents rather than merging with what the image already has there.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

# Docker's own health check, independent of any orchestration layer — it
# marks the container unhealthy if /health stops returning 200, visible
# directly in `docker ps` with no extra tooling.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
