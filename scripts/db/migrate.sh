#!/usr/bin/env bash
# Apply the auth stub then every migration in order to the local docker database.
set -euo pipefail

cd "$(dirname "$0")/../.."

psql() {
  docker compose exec -T db psql -U parking -d parking -v ON_ERROR_STOP=1 "$@"
}

echo "==> applying local auth stub"
psql -f - < scripts/db/mock-auth.sql

for migration in supabase/migrations/*.sql; do
  echo "==> $(basename "$migration")"
  psql -f - < "$migration"
done

echo "migrations applied."
