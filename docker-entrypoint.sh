#!/bin/sh
set -e

# ── Wait for the database, then apply migrations before the app boots ─────────
# compose `depends_on: condition: service_healthy` already gates on the DB
# healthcheck; the retry loop covers the brief window while MySQL finishes
# accepting connections after it reports healthy.

echo "▶ Applying database migrations (prisma migrate deploy)…"
ATTEMPTS=0
MAX_ATTEMPTS=30
until npx prisma migrate deploy; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "❌ Database not reachable after ${MAX_ATTEMPTS} attempts — giving up." >&2
    exit 1
  fi
  echo "… database not ready (attempt ${ATTEMPTS}/${MAX_ATTEMPTS}); retrying in 2s"
  sleep 2
done
echo "✓ Migrations applied."

# ── Optional one-off seed (SEED=true) ─────────────────────────────────────────
if [ "$SEED" = "true" ]; then
  echo "▶ Seeding database (SEED=true)…"
  npx prisma db seed || echo "⚠ Seed step failed or unavailable — continuing."
fi

echo "▶ Starting: $*"
exec "$@"
