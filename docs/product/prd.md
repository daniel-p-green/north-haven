# PRD: North Haven v1 MVP

Date: 2026-03-01
Repository: north-haven
Working stack: TypeScript backend, Postgres, Redis/BullMQ, OpenAPI contracts, guardrailed OpenClaw runtime layer

## Problem Statement

Families need immediate help for common tech issues and scam risk, but existing support channels are fragmented and often hard to trust. North Haven creates a single trusted contact in existing messaging and phone channels, delivering safe and calm support without forcing a new app.

## Primary Market Narrative

North Haven is a family-safe incident concierge for older adults in SMS, WhatsApp, and voice callback, with consent-based caregiver backup for high-risk moments.

## Goals

- Deliver message-native support for troubleshooting and scam triage in SMS and WhatsApp.
- Provide reliable callback escalation with post-call continuity in the same thread.
- Enforce consent, risk-tier policy, and calm notification defaults by design.
- Route all AI outputs through a guardrailed OpenClaw runtime profile.

## Wedge Strategy (Sequenced)

1. Entry wedge: scam/fraud triage for urgent trust moments.
2. Retention wedge: everyday tech troubleshooting in familiar channels.
3. Expansion wedge: caregiver coordination and Care Circle alerting with explicit consent.

## Go-To-Market Shape (Hybrid)

- B2B2C: Medicare Advantage plans, caregiver programs, and aging-service pilots.
- D2C: family subscriptions centered on safety ROI and peace-of-mind.
- Shared product core: one policy engine and one channel/timeline foundation across both paths.

## Non-Goals

- Native iMessage integration.
- Direct RCS integrations.
- Marketplace or multi-agent orchestration ecosystem.
- Medical diagnosis and financial execution.

## Users and Context

- Primary user: older adult handling everyday digital issues.
- Secondary user: adult child caregiver in optional Care Circle model.
- Key usage context: time-sensitive support moments, often mobile-first, low tolerance for jargon.

## Requirements

### Functional

1. Unified channel layer with SMS, WhatsApp, voice callback adapters and canonical timeline.
2. Core workflows for troubleshooting, scam triage, and guided recovery.
3. Voice escalation path from explicit user request or repeated confusion/failure.
4. Consent-based Care Circle alerting for Tier 2 risk.
5. Memory controls with commands for remember/forget/no-save/pause alerts.
6. Operator visibility for timeline replay, risk flags, escalation traces, and audit events.
7. Risk assessment output includes: `riskSignals[]`, `recommendedActions[]`, and `escalationRecommendation`.
8. Care Circle alerts capture consent evidence metadata: `consentArtifactId`, `alertReason`, `initiatedBy`.
9. Conversation events include escalation analytics fields: `resolutionType` and `handoffReason`.

### Non-Functional

1. Performance:
- Message ingress p95 < 2s.
- Callback initiation p95 < 45s in staging.
2. Reliability:
- Completion summary delivery success > 99%.
- Duplicate side effects from webhook retries = 0.
3. Accessibility:
- 6th-8th grade readability and plain-language templates.
4. Security:
- PII-redacted logs, immutable audit events, explicit consent gates.
- Guardrailed OpenClaw safety policy pack applied to all model output.

## Acceptance Criteria

1. Given a user sends “call me,” when message is ingested, then callback request is queued and post-call summary is sent in origin thread.
2. Given suspicious content is forwarded, when risk workflow runs, then system returns Low/Medium/High risk with reasons, do/do-not guidance, and Tier 2 alert flow when consent exists.
3. Given suspicious content is forwarded, when risk workflow runs, then response includes `riskSignals[]`, `recommendedActions[]`, and `escalationRecommendation`.
4. Given Tier 2 alert with consent is requested, when alert call executes, then `consentArtifactId`, `alertReason`, and `initiatedBy` are required and logged.
5. Given callback escalation is queued, when conversation event is recorded, then `handoffReason` is populated for analytics.
6. Given a workflow is resolved, when completion event is recorded, then `resolutionType` is captured as one of `self_resolved`, `callback_resolved`, `caregiver_assisted`.
7. Given troubleshooting fails repeatedly, when confusion threshold is reached, then callback escalation triggers automatically.
8. Given do-not-save is active, when memory write is attempted, then write is blocked with policy response.
9. Given progress update status is invalid, when sendProgressUpdate is called, then request is rejected by policy guard.

## UX Notes

- Key user flow: inbound message -> intent/risk route -> step-by-step support -> completion summary.
- Empty and error states: always calm, actionable, and explicit about next safe step.
- Analytics events: activation, first successful resolution, escalation, scam triage completion, trusted contact conversion.

## Rollout and Measurement

- Rollout strategy: internal simulation -> staged pilot -> invite-only family beta.
- Success metric: safe first-resolution rate.
- Guardrail metric: high-risk false-negative rate and escalation latency.
- Pilot thresholds:
  - first-contact safe resolution rate target: >= 50%
  - caregiver opt-in rate target: >= 35% for eligible users
  - caregiver opt-out/complaint rate target: <= 5%
  - 30-day D2C retention target: >= 30%

## Packaging Hypothesis and Unit Economics

### Initial Plans

- Individual plan: baseline access to SMS/WhatsApp workflows + callback support.
- Family plan: includes Care Circle permissions and controls.
- Priority callback add-on: faster queue prioritization within defined service windows.

### Cost Driver Model (MVP)

Primary COGS buckets:
- Telecom: SMS volume, WhatsApp conversations, PSTN callback minutes.
- LLM: token usage during triage and troubleshooting loops.
- Operations: Tier 2 operator review and incident workflows.

### Margin Assumptions (Example Modeling Inputs)

- Individual ARPU target: $29/month.
- Family ARPU target: $59/month.
- Priority callback add-on: +$15/month.
- Gross margin target range at pilot scale: 55-70%.

### Sensitivity Parameters

- Callback minutes per active user per month.
- Average token spend per workflow.
- Tier 2 escalation frequency requiring operator support.

### Required Reporting Outputs

- Monthly gross margin estimate by plan.
- Sensitivity table for callback minutes and token usage.
- Break-even active user estimate per plan tier.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| False negatives in scam triage | High trust and safety impact | Conservative heuristics, Tier 2 friction checkpoint, operator review pathway |
| Provider webhook replay | Duplicate side effects | Idempotency key table + unique constraints + replay-safe handlers |
| Notification fatigue | User churn | Strict cap policy + quiet hours + digest mode |
| Care Circle misuse | Privacy and trust erosion | Explicit consent records, granular alert policy, audit traceability |
