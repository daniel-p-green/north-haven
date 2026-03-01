# Risk and Guardrail Policy Spec (MVP)

## Tier Definitions

- Tier 0: informational, low risk.
- Tier 1: moderate risk (login/account and suspicious-link cases).
- Tier 2: high risk (money transfer pressure, identity compromise, urgent social engineering).

## Mandatory Tier 2 Controls

1. Explicit reconfirmation required before continuing.
2. Friction checkpoint phrase required: `I understand and want to continue safely`.
3. Optional trusted contact path only if active Care Circle consent exists.

## Hard Prohibitions Without Explicit Consent

- Contacting third parties.
- Initiating irreversible external actions.
- Handling payments/transfers.
- Impersonating user identity.

## Notification Guardrails

- Allowed proactive statuses:
  - `started`
  - `need_input`
  - `completed`
- Default proactive cap: 3 updates per workflow.
- Quiet hours supported.
- Digest mode supported.

## Memory Guardrails

User commands:
- `What do you remember?`
- `Forget this conversation`
- `Don't save this`
- `Pause alerts for 24 hours`

Enforcement:
- `Don't save this` blocks memory writes at policy layer.
- `Forget this conversation` tombstones conversation memory and appends audit event.
- `Pause alerts for 24 hours` updates notification policy with expiration job.

## Identity and Transparency Rules

- Always disclose AI identity on session start and voice openings.
- Persona style (Alfred/Ally) only changes tone and voice style.
- Safety behavior must remain identical across persona styles.

## Failure Modes and Recovery

- Missing consent for Tier 2 alerts:
  - Continue user-only safety guidance.
  - Offer opt-in consent flow.
- Provider outage:
  - Queue retry with exponential backoff.
  - Add incident audit event.
- Duplicate ingress event:
  - Detect idempotency conflict.
  - Skip duplicate side effects.
