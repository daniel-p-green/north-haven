-- 001_core.sql
-- Core identity, thread timeline, notification, and idempotency primitives.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  locale TEXT NOT NULL DEFAULT 'en-US',
  persona_style TEXT NOT NULL DEFAULT 'ally' CHECK (persona_style IN ('neutral', 'alfred', 'ally')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'voice')),
  external_id TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel, external_id)
);

CREATE TABLE IF NOT EXISTS conversation_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_channel TEXT NOT NULL CHECK (source_channel IN ('sms', 'whatsapp', 'voice')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paused')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_events (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'voice')),
  provider_message_id TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_message_events_thread_time_desc
  ON message_events (thread_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS notification_policies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'concise' CHECK (mode IN ('immediate', 'concise', 'digest-only')),
  preferred_channel TEXT NOT NULL DEFAULT 'sms' CHECK (preferred_channel IN ('sms', 'whatsapp', 'voice')),
  escalation_threshold TEXT NOT NULL DEFAULT 'tier2' CHECK (escalation_threshold IN ('tier1', 'tier2')),
  proactive_cap SMALLINT NOT NULL DEFAULT 3 CHECK (proactive_cap BETWEEN 1 AND 10),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  paused_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  response_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_threads_updated_at ON conversation_threads;
CREATE TRIGGER trg_threads_updated_at
BEFORE UPDATE ON conversation_threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_idempotency_updated_at ON idempotency_keys;
CREATE TRIGGER trg_idempotency_updated_at
BEFORE UPDATE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
