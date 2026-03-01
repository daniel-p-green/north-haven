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

### POST `/internal/risk:assess`

- Purpose: classify suspicious content into Tier 0/1/2 and required safety actions.
- Body:
  - `content`
  - `context`

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
