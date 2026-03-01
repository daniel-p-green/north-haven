# ChatGPT Companion Surface (Secondary)

## Purpose

North Haven's ChatGPT app surface is an internal caregiver/operator companion layer.
It is secondary to SMS, WhatsApp, and voice.
It does not replace older-adult primary workflows.

## Scope (Phase 1)

Read-heavy tools:
- `get_thread_timeline`
- `get_risk_explanation`
- `get_workflow_status`
- `get_user_support_summary`

Constrained write tools:
- `request_callback`
- `append_escalation_note`

Out of scope:
- Broad write actions outside callback and escalation note append.
- Any action that executes irreversible third-party changes.

## Architecture

- MCP server package: `apps/chatgpt-mcp`
- Adapter role: transforms MCP `tools/call` into existing internal API contracts.
- Source-of-truth business logic remains in internal services and policy layer.
- All model-mediated language in this surface inherits the same guardrailed OpenClaw runtime profile.

## Tool Metadata and Policy

Each tool descriptor includes:
- `_meta.ui.resourceUri`
- `_meta.ui.visibility`
- `_meta["openai/toolInvocation/invoking"]`
- `_meta["openai/toolInvocation/invoked"]`

Read/write hints:
- Read tools set `annotations.readOnlyHint = true`.
- Write tools set `annotations.readOnlyHint = false` and remain non-destructive.

## Data Minimization Rules

- Return only context needed for current request.
- Strip trace IDs, provider IDs, debug payloads, and session internals.
- Do not request full transcript history as input.
- Keep outputs concise and operator-oriented.

## Auth and Environment Modes

- Dev: `NH_CHATGPT_AUTH_MODE=none` (internal testing only).
- Staging/Prod shape: `NH_CHATGPT_AUTH_MODE=oauth` for write tools.
- In OAuth mode, write tools require OAuth token validation context before execution.
- Current scaffold enforces a JWT-like token shape check in-server; staging/prod should validate token signature/claims at gateway or auth middleware.

## Safety Boundaries

- Tier 2 safeguards remain in force through the same policy contracts.
- Consent requirements still gate Care Circle related behavior.
- No payments, transfers, impersonation, or irreversible external actions.

## Operator Usage

Preferred use cases:
- Timeline replay during active support incidents.
- Risk explanation pull-up for high-stakes scam conversations.
- Workflow status checks for unresolved runs.
- Callback request queueing with thread continuity.
- Escalation note append for handoff continuity.

## Runbook Notes

Start locally:

```bash
npm run dev:chatgpt-mcp
```

Run MCP tests:

```bash
npm run test:chatgpt-mcp
```

Health check:

```bash
curl http://localhost:3335/health
```
