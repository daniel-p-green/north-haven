# North Haven Data Model (MVP)

## Tables

1. `users`
2. `channel_identities`
3. `conversation_threads`
4. `message_events`
5. `voice_sessions`
6. `workflow_runs`
7. `risk_assessments`
8. `consent_records`
9. `trusted_contacts`
10. `notification_policies`
11. `memory_facts`
12. `audit_events`
13. `idempotency_keys`

## Index and Constraint Requirements

- Unique `(channel, provider_message_id)` on `message_events`.
- Unique `idempotency_key` on `idempotency_keys`.
- Index `(thread_id, occurred_at DESC)` on `message_events`.
- Index `(user_id, status)` on `workflow_runs`.
- Index `(tier, created_at DESC)` on `risk_assessments`.
- Unique active consent on `(user_id, consent_type, scope_hash)` where `revoked_at IS NULL`.
- Index `(user_id, category, fact_key)` on `memory_facts`.
- Append-only enforcement for `audit_events` via trigger.

## Entity Notes

### users

Stores person-level profile, default persona voice style, locale, and status.

### channel_identities

Maps users to external channel identifiers (phone numbers, WhatsApp IDs, etc.).

### conversation_threads

Canonical continuity object that links cross-channel events in one timeline.

### message_events

Every inbound/outbound text event normalized with provider IDs and metadata.

### voice_sessions

Tracks callback lifecycle, transcript pointers, SLA timing, and outcome.

### workflow_runs

Deterministic state machine record for callback/troubleshoot/scam workflows.

### risk_assessments

Risk output snapshot with tier, rationale, and safe action guidance.

### consent_records

Captures explicit consent grants/revocations for Care Circle and related scopes.

### trusted_contacts

Stores optional caregivers and their preferred channels.

### notification_policies

Per-user delivery mode, quiet hours, digest mode, escalation threshold.

### memory_facts

Consentful memory graph of reusable preferences/issues/resolutions.

### audit_events

Immutable operational and policy action trail.

### idempotency_keys

Replay defense table used for webhook and side-effect safety.

## Sample Rows (US-first examples)

### users

| id | display_name | timezone | persona_style | status |
|---|---|---|---|---|
| `usr_001` | `Martha Green` | `America/Chicago` | `ally` | `active` |

### channel_identities

| id | user_id | channel | external_id | is_primary |
|---|---|---|---|---|
| `cid_001` | `usr_001` | `sms` | `+13125550111` | `true` |

### conversation_threads

| id | user_id | source_channel | status |
|---|---|---|---|
| `thr_001` | `usr_001` | `sms` | `open` |

### message_events

| id | thread_id | direction | channel | provider_message_id | body |
|---|---|---|---|---|---|
| `msg_001` | `thr_001` | `inbound` | `sms` | `SM123` | `Call me` |

### voice_sessions

| id | thread_id | user_id | provider_call_id | status | initiated_at |
|---|---|---|---|---|---|
| `voc_001` | `thr_001` | `usr_001` | `CA123` | `answered` | `2026-03-01T18:05:00Z` |

### workflow_runs

| id | user_id | thread_id | workflow_type | status |
|---|---|---|---|---|
| `wf_001` | `usr_001` | `thr_001` | `callback` | `completed` |

### risk_assessments

| id | workflow_run_id | tier | label | rationale |
|---|---|---|---|---|
| `risk_001` | `wf_002` | `2` | `high` | `Urgent transfer + code request patterns` |

### consent_records

| id | user_id | consent_type | scope_hash | granted_at | revoked_at |
|---|---|---|---|---|---|
| `con_001` | `usr_001` | `care_circle_alerts` | `all-tier2` | `2026-03-01T17:00:00Z` | `NULL` |

### trusted_contacts

| id | user_id | contact_name | relation | channel | destination |
|---|---|---|---|---|---|
| `tc_001` | `usr_001` | `Alex Green` | `son` | `sms` | `+13125550199` |

### notification_policies

| id | user_id | mode | quiet_hours_start | quiet_hours_end | proactive_cap |
|---|---|---|---|---|---|
| `np_001` | `usr_001` | `concise` | `21:00` | `07:00` | `3` |

### memory_facts

| id | user_id | category | fact_key | fact_value |
|---|---|---|---|---|
| `mf_001` | `usr_001` | `device` | `router_model` | `Netgear Nighthawk R6700` |

### audit_events

| id | actor_type | actor_id | event_type | resource_type | resource_id |
|---|---|---|---|---|---|
| `aud_001` | `system` | `workflow-engine` | `tier2_checkpoint_passed` | `workflow_run` | `wf_002` |

### idempotency_keys

| id | idempotency_key | scope | status |
|---|---|---|---|
| `idem_001` | `sms:SM123` | `webhook_ingest` | `completed` |
