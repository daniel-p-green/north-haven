-- North Haven schema snapshot
COMMENT ON SCHEMA public IS '';
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
CREATE FUNCTION public.forbid_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;
CREATE FUNCTION public.mark_thread_memory_tombstoned(p_thread_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE memory_facts
  SET is_tombstoned = TRUE,
      updated_at = NOW()
  WHERE thread_id = p_thread_id
    AND is_tombstoned = FALSE;
END;
$$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE TABLE public.audit_events (
    id text NOT NULL,
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    event_type text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['system'::text, 'user'::text, 'operator'::text, 'workflow'::text])))
);
CREATE TABLE public.channel_identities (
    id text NOT NULL,
    user_id text NOT NULL,
    channel text NOT NULL,
    external_id text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT channel_identities_channel_check CHECK ((channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'voice'::text])))
);
CREATE TABLE public.consent_records (
    id text NOT NULL,
    user_id text NOT NULL,
    consent_type text NOT NULL,
    scope_hash text NOT NULL,
    granted_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.conversation_threads (
    id text NOT NULL,
    user_id text NOT NULL,
    source_channel text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversation_threads_source_channel_check CHECK ((source_channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'voice'::text]))),
    CONSTRAINT conversation_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'paused'::text])))
);
CREATE TABLE public.idempotency_keys (
    id text NOT NULL,
    idempotency_key text NOT NULL,
    scope text NOT NULL,
    request_hash text NOT NULL,
    status text NOT NULL,
    response_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT idempotency_keys_status_check CHECK ((status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text])))
);
CREATE TABLE public.memory_facts (
    id text NOT NULL,
    user_id text NOT NULL,
    thread_id text,
    category text NOT NULL,
    fact_key text NOT NULL,
    fact_value text NOT NULL,
    confidence numeric(4,3) DEFAULT 1.000 NOT NULL,
    source text DEFAULT 'conversation'::text NOT NULL,
    is_tombstoned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memory_facts_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);
CREATE TABLE public.message_events (
    id text NOT NULL,
    thread_id text NOT NULL,
    user_id text NOT NULL,
    direction text NOT NULL,
    channel text NOT NULL,
    provider_message_id text NOT NULL,
    body text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_events_channel_check CHECK ((channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'voice'::text]))),
    CONSTRAINT message_events_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'system'::text])))
);
CREATE TABLE public.notification_policies (
    id text NOT NULL,
    user_id text NOT NULL,
    mode text DEFAULT 'concise'::text NOT NULL,
    preferred_channel text DEFAULT 'sms'::text NOT NULL,
    escalation_threshold text DEFAULT 'tier2'::text NOT NULL,
    proactive_cap smallint DEFAULT 3 NOT NULL,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    digest_enabled boolean DEFAULT false NOT NULL,
    paused_until timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_policies_escalation_threshold_check CHECK ((escalation_threshold = ANY (ARRAY['tier1'::text, 'tier2'::text]))),
    CONSTRAINT notification_policies_mode_check CHECK ((mode = ANY (ARRAY['immediate'::text, 'concise'::text, 'digest-only'::text]))),
    CONSTRAINT notification_policies_preferred_channel_check CHECK ((preferred_channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'voice'::text]))),
    CONSTRAINT notification_policies_proactive_cap_check CHECK (((proactive_cap >= 1) AND (proactive_cap <= 10)))
);
CREATE TABLE public.risk_assessments (
    id text NOT NULL,
    workflow_run_id text NOT NULL,
    user_id text NOT NULL,
    thread_id text NOT NULL,
    tier smallint NOT NULL,
    label text NOT NULL,
    rationale text NOT NULL,
    do_next jsonb DEFAULT '[]'::jsonb NOT NULL,
    do_not jsonb DEFAULT '[]'::jsonb NOT NULL,
    classifier_version text DEFAULT 'heuristic-v1'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_assessments_label_check CHECK ((label = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT risk_assessments_tier_check CHECK ((tier = ANY (ARRAY[0, 1, 2])))
);
CREATE TABLE public.trusted_contacts (
    id text NOT NULL,
    user_id text NOT NULL,
    contact_name text NOT NULL,
    relation text,
    channel text NOT NULL,
    destination text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trusted_contacts_channel_check CHECK ((channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'voice'::text, 'email'::text]))),
    CONSTRAINT trusted_contacts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);
CREATE TABLE public.users (
    id text NOT NULL,
    display_name text NOT NULL,
    timezone text DEFAULT 'America/Chicago'::text NOT NULL,
    locale text DEFAULT 'en-US'::text NOT NULL,
    persona_style text DEFAULT 'ally'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_persona_style_check CHECK ((persona_style = ANY (ARRAY['neutral'::text, 'alfred'::text, 'ally'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'disabled'::text])))
);
CREATE TABLE public.voice_sessions (
    id text NOT NULL,
    thread_id text NOT NULL,
    user_id text NOT NULL,
    provider_call_id text NOT NULL,
    callback_request_event_id text,
    status text NOT NULL,
    attempt_number smallint DEFAULT 1 NOT NULL,
    initiated_at timestamp with time zone NOT NULL,
    answered_at timestamp with time zone,
    ended_at timestamp with time zone,
    transcript_ref text,
    summary_event_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT voice_sessions_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'ringing'::text, 'answered'::text, 'missed'::text, 'failed'::text, 'completed'::text])))
);
CREATE TABLE public.workflow_runs (
    id text NOT NULL,
    user_id text NOT NULL,
    thread_id text NOT NULL,
    workflow_type text NOT NULL,
    status text NOT NULL,
    step_index smallint DEFAULT 0 NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflow_runs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'in_progress'::text, 'need_input'::text, 'escalated_to_voice'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT workflow_runs_workflow_type_check CHECK ((workflow_type = ANY (ARRAY['callback'::text, 'scam_triage'::text, 'troubleshoot'::text, 'recovery'::text])))
);
ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.channel_identities
    ADD CONSTRAINT channel_identities_channel_external_id_key UNIQUE (channel, external_id);
ALTER TABLE ONLY public.channel_identities
    ADD CONSTRAINT channel_identities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.conversation_threads
    ADD CONSTRAINT conversation_threads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_idempotency_key_key UNIQUE (idempotency_key);
ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.memory_facts
    ADD CONSTRAINT memory_facts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.message_events
    ADD CONSTRAINT message_events_channel_provider_message_id_key UNIQUE (channel, provider_message_id);
ALTER TABLE ONLY public.message_events
    ADD CONSTRAINT message_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_policies
    ADD CONSTRAINT notification_policies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_policies
    ADD CONSTRAINT notification_policies_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.trusted_contacts
    ADD CONSTRAINT trusted_contacts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.voice_sessions
    ADD CONSTRAINT voice_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.voice_sessions
    ADD CONSTRAINT voice_sessions_provider_call_id_key UNIQUE (provider_call_id);
ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_pkey PRIMARY KEY (id);
CREATE INDEX idx_audit_events_resource ON public.audit_events USING btree (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_memory_facts_user_category_key ON public.memory_facts USING btree (user_id, category, fact_key);
CREATE INDEX idx_message_events_thread_time_desc ON public.message_events USING btree (thread_id, occurred_at DESC);
CREATE INDEX idx_risk_assessments_tier_created_desc ON public.risk_assessments USING btree (tier, created_at DESC);
CREATE INDEX idx_workflow_runs_user_status ON public.workflow_runs USING btree (user_id, status);
CREATE UNIQUE INDEX uq_consent_active_per_scope ON public.consent_records USING btree (user_id, consent_type, scope_hash) WHERE (revoked_at IS NULL);
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_mutation();
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_mutation();
CREATE TRIGGER trg_idempotency_updated_at BEFORE UPDATE ON public.idempotency_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_memory_facts_updated_at BEFORE UPDATE ON public.memory_facts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_threads_updated_at BEFORE UPDATE ON public.conversation_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workflow_runs_updated_at BEFORE UPDATE ON public.workflow_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE ONLY public.channel_identities
    ADD CONSTRAINT channel_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.conversation_threads
    ADD CONSTRAINT conversation_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.memory_facts
    ADD CONSTRAINT memory_facts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.conversation_threads(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.memory_facts
    ADD CONSTRAINT memory_facts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.message_events
    ADD CONSTRAINT message_events_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.conversation_threads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.message_events
    ADD CONSTRAINT message_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_policies
    ADD CONSTRAINT notification_policies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.conversation_threads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_workflow_run_id_fkey FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.trusted_contacts
    ADD CONSTRAINT trusted_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.voice_sessions
    ADD CONSTRAINT voice_sessions_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.conversation_threads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.voice_sessions
    ADD CONSTRAINT voice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.conversation_threads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
