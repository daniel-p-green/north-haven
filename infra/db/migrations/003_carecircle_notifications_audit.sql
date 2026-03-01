-- 003_carecircle_notifications_audit.sql
-- Consent and trusted contacts, immutable audit stream, and protection helpers.

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  scope_hash TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_active_per_scope
  ON consent_records (user_id, consent_type, scope_hash)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS trusted_contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  relation TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'voice', 'email')),
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'operator', 'workflow')),
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource
  ON audit_events (resource_type, resource_id, created_at DESC);

CREATE OR REPLACE FUNCTION forbid_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_events;
CREATE TRIGGER trg_audit_no_update
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_events;
CREATE TRIGGER trg_audit_no_delete
BEFORE DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

CREATE OR REPLACE FUNCTION mark_thread_memory_tombstoned(p_thread_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE memory_facts
  SET is_tombstoned = TRUE,
      updated_at = NOW()
  WHERE thread_id = p_thread_id
    AND is_tombstoned = FALSE;
END;
$$ LANGUAGE plpgsql;
