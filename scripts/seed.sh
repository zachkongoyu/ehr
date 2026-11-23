#!/bin/sh
# Load the fake chart. DATABASE_URL stays in the environment. Do not commit it.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL to the chart database. Do not commit it." >&2
  exit 1
fi

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/seed.sql"
