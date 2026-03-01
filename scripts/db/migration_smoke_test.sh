#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

setup_db_tools
reset_public_schema
apply_all_migrations

required_tables=(
  users
  channel_identities
  conversation_threads
  message_events
  voice_sessions
  workflow_runs
  risk_assessments
  consent_records
  trusted_contacts
  notification_policies
  memory_facts
  audit_events
  idempotency_keys
)

for table in "${required_tables[@]}"; do
  assert_query_true "SELECT to_regclass('public.${table}') IS NOT NULL" "table ${table} exists"
done

required_indexes=(
  idx_message_events_thread_time_desc
  idx_workflow_runs_user_status
  idx_risk_assessments_tier_created_desc
  idx_memory_facts_user_category_key
  uq_consent_active_per_scope
)

for idx in "${required_indexes[@]}"; do
  assert_query_true "SELECT to_regclass('public.${idx}') IS NOT NULL" "index ${idx} exists"
done

required_triggers=(
  trg_users_updated_at
  trg_threads_updated_at
  trg_idempotency_updated_at
  trg_workflow_runs_updated_at
  trg_memory_facts_updated_at
  trg_audit_no_update
  trg_audit_no_delete
)

for trig in "${required_triggers[@]}"; do
  assert_query_true "SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='${trig}' AND NOT tgisinternal)" "trigger ${trig} exists"
done

assert_query_true "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname='mark_thread_memory_tombstoned')" "function mark_thread_memory_tombstoned exists"

echo "[db] migration smoke tests passed"
