# North Haven Local and Staging Runbook

## 1) Local Setup

Prerequisites:
- Node.js 20+
- Docker Desktop

Commands:
1. `docker compose -f infra/docker-compose.yml up -d`
2. `npm run dev`
3. `npm run test`

Expected local services:
- Postgres on `localhost:5432`
- Redis on `localhost:6379`

## 2) Database Migration Procedure

1. Apply `infra/db/migrations/001_core.sql`
2. Apply `infra/db/migrations/002_workflows_risk_memory.sql`
3. Apply `infra/db/migrations/003_carecircle_notifications_audit.sql`
4. Validate indexes and triggers are present.

## 3) Staging Promotion Checklist

- [ ] Schema migration applied and verified.
- [ ] Webhook idempotency checks passing.
- [ ] Callback queue and retry behavior validated.
- [ ] Tier 2 friction checkpoint verified.
- [ ] Care Circle consent gate verified.
- [ ] Post-call summaries delivered in origin thread.
- [ ] PII redaction logs spot-checked.

## 4) SLO Verification

- Message ingress p95 < 2s.
- Callback initiation p95 < 45s.
- Completion summary delivery success > 99%.
- Duplicate side effects from retries = 0.

## 5) Incident Playbooks

### Callback Delay Incident

1. Inspect queue backlog and worker health.
2. Check provider API latency and error rates.
3. Trigger degraded-mode messaging if SLA is at risk.
4. Record incident in audit and notify operators.

### Risk Classification Incident

1. Pull affected `risk_assessments` and workflow traces.
2. Verify Tier 2 checkpoint behavior.
3. Apply temporary conservative policy override if needed.
4. Document remediation in incident notes.

## 6) Data Export/Delete Baseline

- Export: compile user profile, thread history, memory facts, consent records.
- Delete: tombstone and hard-delete pathway by policy with audit confirmation.
- Track both via `audit_events`.
