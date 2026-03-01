# Use Cases: North Haven v1 MVP

Date: 2026-03-01
Repository: north-haven

## Primary Use Cases

### UC-1: Happy Path Troubleshooting

- Actor: older adult user
- Trigger: user sends “My printer won’t connect.”
- Preconditions: user has active channel identity and notification policy.
- Main flow:
1. System ingests message and starts troubleshoot workflow.
2. Assistant sends one clear diagnostic step.
3. User confirms completion after each step.
4. Workflow resolves and sends completion summary.
- Expected result: issue resolved without escalation and summary logged.

### UC-2: Scam Triage with Care Circle Alert

- Actor: user with Care Circle consent enabled
- Trigger: user forwards suspicious “urgent transfer” message.
- Preconditions: trusted contact + consent record exist.
- Main flow:
1. System classifies risk as Tier 2.
2. Assistant explains risk and safe next actions.
3. Tier 2 friction checkpoint is completed.
4. Care Circle alert is sent and audited.
- Expected result: user avoids risky action; trusted contact informed per consent.

## Edge Cases

### EC-1: Duplicate Webhook Delivery

- Scenario: provider retries same inbound payload.
- System behavior: idempotency key conflict detected, no duplicate side effects.
- User-visible response: none or single deduplicated acknowledgement.

### EC-2: Callback Missed

- Scenario: user does not answer callback.
- System behavior: retry policy runs, then fallback text sent with reschedule options.
- User-visible response: concise message with next steps.

## Failure Cases

### FC-1: Missing Consent for Tier 2 Alert

- Failure mode: Tier 2 risk detected but no Care Circle consent exists.
- Detection: consent lookup returns no active record.
- Recovery path: assistant proceeds with user-only safety guidance and offers consent setup.

### FC-2: Memory Write Attempt During “Don’t Save This”

- Failure mode: workflow attempts to persist memory while do-not-save active.
- Detection: policy engine blocks write.
- Recovery path: write is rejected, audit event created, workflow continues without memory persistence.
