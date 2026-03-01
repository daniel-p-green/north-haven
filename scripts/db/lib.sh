#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/infra/db/migrations"
SCHEMA_SNAPSHOT_PATH="$REPO_ROOT/infra/db/schema.snapshot.sql"

_db_mode=""

setup_db_tools() {
  local requested_mode="${DB_TOOL_MODE:-auto}"

  if [[ "$requested_mode" == "auto" ]]; then
    if command -v psql >/dev/null 2>&1 && command -v pg_dump >/dev/null 2>&1; then
      _db_mode="local"
    else
      _db_mode="docker"
    fi
  elif [[ "$requested_mode" == "local" || "$requested_mode" == "docker" ]]; then
    _db_mode="$requested_mode"
  else
    echo "Unsupported DB_TOOL_MODE: $requested_mode" >&2
    exit 1
  fi

  if [[ "$_db_mode" == "local" ]]; then
    : "${PGHOST:=127.0.0.1}"
    : "${PGPORT:=5432}"
    : "${PGUSER:=postgres}"
    : "${PGPASSWORD:=postgres}"
    : "${PGDATABASE:=north_haven_ci}"
  else
    if ! command -v docker >/dev/null 2>&1; then
      echo "docker is required when DB_TOOL_MODE=docker" >&2
      exit 1
    fi

    : "${COMPOSE_FILE:=$REPO_ROOT/infra/docker-compose.yml}"
    : "${PGUSER:=north_haven}"
    : "${PGPASSWORD:=north_haven_dev}"
    : "${PGDATABASE:=north_haven}"

    docker compose -f "$COMPOSE_FILE" up -d postgres >/dev/null

    local attempt=0
    until docker compose -f "$COMPOSE_FILE" exec -T postgres \
      env PGPASSWORD="$PGPASSWORD" pg_isready -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
      attempt=$((attempt + 1))
      if [[ $attempt -ge 30 ]]; then
        echo "postgres service did not become ready in time" >&2
        exit 1
      fi
      sleep 1
    done
  fi

  echo "[db] mode=$_db_mode db=$PGDATABASE user=$PGUSER"
}

db_psql() {
  if [[ "$_db_mode" == "local" ]]; then
    PGPASSWORD="$PGPASSWORD" psql \
      -v ON_ERROR_STOP=1 \
      -h "$PGHOST" \
      -p "$PGPORT" \
      -U "$PGUSER" \
      -d "$PGDATABASE" \
      "$@"
  else
    docker compose -f "$COMPOSE_FILE" exec -T postgres env PGPASSWORD="$PGPASSWORD" \
      psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" "$@"
  fi
}

db_dump_schema() {
  if [[ "$_db_mode" == "local" ]]; then
    PGPASSWORD="$PGPASSWORD" pg_dump \
      -h "$PGHOST" \
      -p "$PGPORT" \
      -U "$PGUSER" \
      -d "$PGDATABASE" \
      --schema-only \
      --no-owner \
      --no-privileges
  else
    docker compose -f "$COMPOSE_FILE" exec -T postgres env PGPASSWORD="$PGPASSWORD" \
      pg_dump -U "$PGUSER" -d "$PGDATABASE" --schema-only --no-owner --no-privileges
  fi
}

reset_public_schema() {
  db_psql -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
}

apply_all_migrations() {
  local migration
  local found=0

  for migration in "$MIGRATIONS_DIR"/*.sql; do
    found=1
    echo "[db] applying $(basename "$migration")"
    if [[ "$_db_mode" == "local" ]]; then
      db_psql -f "$migration"
    else
      cat "$migration" | db_psql
    fi
  done

  if [[ $found -eq 0 ]]; then
    echo "No migrations found in $MIGRATIONS_DIR" >&2
    exit 1
  fi
}

normalize_schema_dump() {
  sed -E \
    -e '/^--/d' \
    -e '/^SET /d' \
    -e '/^SELECT pg_catalog.set_config/d' \
    -e '/^\\connect /d' \
    -e '/^\\restrict /d' \
    -e '/^\\unrestrict /d' \
    -e '/^CREATE EXTENSION IF NOT EXISTS plpgsql/d' \
    -e '/^COMMENT ON EXTENSION plpgsql/d' \
    -e '/^$/d'
}

assert_query_true() {
  local query="$1"
  local label="$2"
  local result

  result="$(db_psql -At -c "$query")"
  if [[ "$result" != "t" ]]; then
    echo "[db][fail] $label" >&2
    exit 1
  fi
  echo "[db][ok] $label"
}
