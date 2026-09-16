#!/bin/sh
# docker-entrypoint.sh
#
# Runs once when the container starts, before the server does.
#
#   1. Apply migrations.  `prisma migrate deploy` runs any migration not yet
#      applied to this database and does nothing if all are already applied
#      — safe to run on every container start, including restarts.
#
#   2. Seed if empty.  prisma/seed.ts checks the row count first and only
#      writes data when the database is empty, so restarting an existing
#      container never overwrites a teacher's edits. A brand new volume
#      (first run) has nothing in it, so it gets seeded.
#
#   3. Start the server.  `exec` replaces this script's process with the
#      server's, so the server receives shutdown signals directly from
#      Docker instead of the signal stopping at the wrapper script and the
#      server never being told to shut down cleanly.
#
# `set -e` stops the script immediately if any step fails, rather than
# starting a server against a database that migrations could not reach.
set -e

echo "==> Applying database migrations"
npx prisma migrate deploy

echo "==> Checking whether the database needs seeding"
npx tsx prisma/seed.ts

echo "==> Starting server"
exec node server.js
