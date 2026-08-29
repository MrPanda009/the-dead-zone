#!/usr/bin/env bash
# Applies infra/migrations/*.sql in filename order, once each.
# Replaces alembic: the schema is defined once in PRD §9.5, not evolved for years.
#
#   ./infra/migrate.sh                 # uses $DATABASE_URL
#   DATABASE_URL=postgresql://... ./infra/migrate.sh
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL (see .env.example)}"
cd "$(dirname "$0")/migrations"

psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c \
  'create table if not exists schema_migrations (
     version text primary key,
     applied_at timestamptz not null default now()
   );'

for f in $(ls -1 *.sql | sort); do
  version="${f%.sql}"
  applied=$(psql "$DATABASE_URL" -Atc \
    "select 1 from schema_migrations where version = '${version}'")
  if [ "$applied" = "1" ]; then
    echo "  skip  $f"
    continue
  fi
  echo "  apply $f"
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --single-transaction \
    -f "$f" \
    -c "insert into schema_migrations (version) values ('${version}');"
done
echo "migrations up to date"
