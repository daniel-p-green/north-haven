# North Haven System Architecture (v1)

## Overview

North Haven is built as a message-native, voice-escalation architecture with one canonical timeline per conversation thread.

Core services:
1. Channel Gateway
2. Conversation Orchestrator
3. Policy and Risk Engine
4. Memory Service
5. Workflow Engine
6. LLM Runtime
7. Audit and Observability
8. Operator API and Console backend

## Component Responsibilities

### 1) Channel Gateway

- Receives provider webhooks (SMS, WhatsApp, voice status updates).
- Normalizes payloads to a shared schema.
- Applies ingress idempotency guard.
- Forwards normalized events to Conversation Orchestrator.

### 2) Conversation Orchestrator

- Maintains canonical timeline in `ConversationThread` + `MessageEvent`.
- Routes events to workflow engine by intent and risk state.
- Coordinates progress notifications under policy.
- Produces post-call continuity summaries.

### 3) Policy and Risk Engine

- Evaluates Tier 0/1/2 risk for suspicious content and high-consequence actions.
- Enforces Tier 2 controls:
  - reconfirmation
  - friction phrase checkpoint
  - consent check for Care Circle alerts
- Blocks disallowed behaviors and logs policy events.

### 4) Memory Service

- Stores consentful, useful context (`MemoryFact`).
- Applies memory controls:
  - what do you remember
  - forget this conversation
  - don't save this
  - pause alerts for 24 hours
- Supports retention and deletion pathways.

### 5) Workflow Engine

- Uses BullMQ + Redis for async execution and retries.
- Persists deterministic state transitions in `WorkflowRun`.
- Supports callback, scam triage, and troubleshooting flows.

### 6) LLM Runtime

- Provides role-safe system prompts and task prompts.
- Enforces AI identity disclosure.
- Applies PII redaction for logs and summarized outputs.

### 7) Audit and Observability

- Immutable `AuditEvent` stream.
- OpenTelemetry traces with `requestId/threadId/workflowRunId`.
- Operational dashboards for latency, delivery success, and risk workload.

### 8) Operator API and Console

- Read-only timeline replay.
- Risk event inspection and escalation traceability.
- Audit and failure investigation views.

## Reliability Controls

- Idempotent webhook handling via `idempotency_keys` table + unique constraints.
- Retry with exponential backoff and DLQ for non-recoverable jobs.
- Outbox-style message dispatch pattern for at-least-once safety.
- Provider failure isolation and replay tooling.

## Security and Privacy Baseline

- Explicit AI disclosure in all channels and voice openings.
- PII redaction strategy for logs and operator payload previews.
- Consent records for Care Circle actions.
- Export/delete pathways with auditable completion events.

## Deployment Shape (MVP)

- API service (ingress + orchestrator endpoints).
- Worker service (workflow execution + retries + callback scheduler).
- Postgres (state of record).
- Redis (queue + transient workflow signals).
- Optional operator console backend in same API process for MVP.
