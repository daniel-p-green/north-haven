-- 002_workflows_risk_memory.sql
-- Workflow execution, risk classifications, voice sessions, and memory facts.

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('callback', 'scam_triage', 'troubleshoot', 'recovery')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'need_input', 'escalated_to_voice', 'completed', 'failed')),
  step_index SMALLINT NOT NULL DEFAULT 0,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_status
  ON workflow_runs (user_id, status);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL CHECK (tier IN (0, 1, 2)),
  label TEXT NOT NULL CHECK (label IN ('low', 'medium', 'high')),
  rationale TEXT NOT NULL,
  do_next JSONB NOT NULL DEFAULT '[]'::jsonb,
  do_not JSONB NOT NULL DEFAULT '[]'::jsonb,
  classifier_version TEXT NOT NULL DEFAULT 'heuristic-v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_tier_created_desc
  ON risk_assessments (tier, created_at DESC);

CREATE TABLE IF NOT EXISTS voice_sessions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_call_id TEXT NOT NULL UNIQUE,
  callback_request_event_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'ringing', 'answered', 'missed', 'failed', 'completed')),
  attempt_number SMALLINT NOT NULL DEFAULT 1,
  initiated_at TIMESTAMPTZ NOT NULL,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  transcript_ref TEXT,
  summary_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_facts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT REFERENCES conversation_threads(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'conversation',
  is_tombstoned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_facts_user_category_key
  ON memory_facts (user_id, category, fact_key);

DROP TRIGGER IF EXISTS trg_workflow_runs_updated_at ON workflow_runs;
CREATE TRIGGER trg_workflow_runs_updated_at
BEFORE UPDATE ON workflow_runs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_memory_facts_updated_at ON memory_facts;
CREATE TRIGGER trg_memory_facts_updated_at
BEFORE UPDATE ON memory_facts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
