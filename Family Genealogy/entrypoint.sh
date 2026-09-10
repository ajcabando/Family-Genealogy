#!/bin/sh
set -e

echo "→ Waiting for database to become ready..."
for i in $(seq 1 60); do
  if node node_modules/prisma/build/index.js migrate deploy >/dev/null 2>&1; then
    echo "→ Migrations applied."
    break
  fi
  echo "  database not ready (attempt $i/60), retrying in 2s..."
  sleep 2
done

echo "→ Applying migrations (final attempt)..."
node node_modules/prisma/build/index.js migrate deploy

echo "→ Seeding initial data (skipped automatically if users already exist)..."
node prisma/seed.mjs

echo "→ Starting application..."
exec node server.js