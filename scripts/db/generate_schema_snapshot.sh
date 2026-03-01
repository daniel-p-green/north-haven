#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

setup_db_tools

if [[ "${SKIP_APPLY:-0}" != "1" ]]; then
  reset_public_schema
  apply_all_migrations
fi

output_path="${SCHEMA_OUTPUT_PATH:-$SCHEMA_SNAPSHOT_PATH}"
tmp_raw="$(mktemp)"
tmp_normalized="$(mktemp)"
trap 'rm -f "$tmp_raw" "$tmp_normalized"' EXIT

db_dump_schema > "$tmp_raw"
normalize_schema_dump < "$tmp_raw" > "$tmp_normalized"

{
  echo "-- North Haven schema snapshot"
  cat "$tmp_normalized"
} > "$output_path"

echo "[db] schema snapshot written to $output_path"
