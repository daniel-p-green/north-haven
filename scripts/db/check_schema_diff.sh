#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

if [[ ! -f "$SCHEMA_SNAPSHOT_PATH" ]]; then
  echo "Schema snapshot missing at $SCHEMA_SNAPSHOT_PATH" >&2
  echo "Run: bash scripts/db/generate_schema_snapshot.sh" >&2
  exit 1
fi

tmp_snapshot="$(mktemp)"
trap 'rm -f "$tmp_snapshot"' EXIT

SCHEMA_OUTPUT_PATH="$tmp_snapshot" bash "$SCRIPT_DIR/generate_schema_snapshot.sh"

if ! diff -u "$SCHEMA_SNAPSHOT_PATH" "$tmp_snapshot"; then
  echo "Schema diff detected. Regenerate snapshot with:" >&2
  echo "  bash scripts/db/generate_schema_snapshot.sh" >&2
  exit 1
fi

echo "[db] schema snapshot is up to date"
