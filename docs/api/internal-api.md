# North Haven Internal API Contracts

Schema header:
- `X-NH-Schema-Version: 1.0.0`

Backward compatibility policy:
- Previous minor schema version accepted for 90 days.

Standard success envelope:

```json
{ "ok": true, "data": {}, "requestId": "req_123", "schemaVersion": "1.0.0" }
```

Standard error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "field x is required",
    "retryable": false,
    "details": {}
  },
  "requestId": "req_123",
  "schemaVersion": "1.0.0"
}
```

Canonical error codes:
- `INVALID_PAYLOAD`
- `UNSUPPORTED_CHANNEL`
- `IDEMPOTENCY_CONFLICT`
- `CONSENT_REQUIRED`
- `RISK_CONFIRMATION_REQUIRED`
- `POLICY_BLOCKED`
- `RATE_LIMITED`
- `UPSTREAM_PROVIDER_ERROR`
- `INTERNAL_ERROR`

## Endpoints

### POST `/internal/messages:ingest`

- Purpose: normalize inbound channel payload, enforce idempotency, route workflow.
- Body:
  - `channel`: `sms | whatsapp | voice`
  - `payload`: provider-specific payload object

### POST `/internal/callbacks:request`

- Purpose: create callback request from user message or escalation state.
- Body:
  - `userId`
  - `sourceThreadId`
  - `reason` (optional)
- Success `data` includes:
  - `callbackRequestId`
  - `targetSlaSeconds`
  - `state`
  - `conversationEvent.handoffReason`

### POST `/internal/risk:assess`

- Purpose: classify suspicious content into Tier 0/1/2 and required safety actions.
- Body:
  - `content`
  - `context`
- Success `data` includes:
  - `tier`: `0 | 1 | 2`
  - `label`: `low | medium | high`
  - `why`
  - `doNext[]`
  - `doNot[]`
  - `riskSignals[]`
  - `recommendedActions[]`
  - `escalationRecommendation`: `none | callback | care_circle_alert`
- Tier 2 checkpoint behavior:
  - If reconfirmation/friction phrase is missing, response returns `RISK_CONFIRMATION_REQUIRED`.
  - `error.details.assessment` includes the same structured fields for safe UI rendering.

### POST `/internal/workflows:start`

- Purpose: enqueue workflow execution.
- Body:
  - `type`: `troubleshoot | scam_triage | callback`
  - `context`

### POST `/internal/memory:write`

- Purpose: persist consentful memory facts.
- Body:
  - `userId`
  - `category`
  - `key`
  - `value`
  - `doNotSave`

### POST `/internal/memory:read`

- Purpose: read memory facts for a user and optional category.
- Body:
  - `userId`
  - `category` (optional)

### POST `/internal/notifications:progress`

- Purpose: send policy-aware progress updates.
- Body:
  - `userId`
  - `threadId`
  - `status`: `started | need_input | completed`
  - `message`

### POST `/internal/care-circle:alert`

- Purpose: trigger trusted contact alert for Tier 2 risk with consent.
- Body:
  - `userId`
  - `riskTier`
  - `hasConsent`
  - `channel` (optional)
  - `consentArtifactId` (required when `hasConsent=true`)
  - `alertReason` (required when `hasConsent=true`)
  - `initiatedBy`: `user_request | policy_trigger` (required when `hasConsent=true`)

## MCP Companion Surface Endpoints

These endpoints are consumed by the ChatGPT companion MCP server for operator/caregiver workflows.

### GET `/internal/threads/{threadId}/timeline`

- Purpose: read canonical timeline for a thread with minimized operator-safe fields.
- Path params:
  - `threadId`
- Query params:
  - `limit` (optional, default 20, max 100)
- Response data:
  - `threadId`
  - `userId`
  - `status`
  - `lastUpdatedAt`
  - `events[]` with `occurredAt`, `channel`, `direction`, `kind`, `summary`, optional `riskTier`, optional `resolutionType`, optional `handoffReason`

### GET `/internal/risks/{riskAssessmentId}`

- Purpose: read one risk assessment explanation with actionable guidance.
- Path params:
  - `riskAssessmentId`
- Response data:
  - `riskAssessmentId`
  - `threadId` (optional)
  - `tier` + `label`
  - `why[]`
  - `doNext[]`
  - `dontDo[]`
  - `assessedAt`

### GET `/internal/workflows/{workflowRunId}`

- Purpose: read workflow state and next action.
- Path params:
  - `workflowRunId`
- Response data:
  - `workflowRunId`
  - `type`
  - `status`
  - `currentStep`
  - `nextAction`
  - `startedAt`
  - `updatedAt`

### GET `/internal/users/{userId}/summary`

- Purpose: read support-focused summary for caregiver/operator context.
- Path params:
  - `userId`
- Response data:
  - `userId`
  - `displayName`
  - `personaVoiceStyle`
  - `preferredChannel`
  - `quietHours`
  - `activeWorkflowsOpen`
  - `tier2Incidents30d`
  - `lastResolutionAt`

### POST `/internal/threads/{threadId}:appendEscalationNote`

- Purpose: append constrained operator note for escalation continuity.
- Path params:
  - `threadId`
- Body:
  - `operatorId`
  - `note`
- Constraints:
  - note is required
  - empty note blocked
  - unsafe content blocked (`<script>` tags, SQL-like injection patterns)

## Companion Surface Data Minimization Rules

- Return only fields required for the active operator question.
- Strip trace IDs, debug payloads, provider IDs, and session internals from user-visible responses.
- Never require full transcript history as input for any MCP tool.
- Enforce existing consent and Tier 2 controls for write operations.
