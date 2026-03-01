# Test Strategy: North Haven v1 MVP

Date: 2026-03-01
Repository: north-haven
Working stack: Node.js test runner + scaffolded policy/workflow modules + API handlers

## Quality Gates

- Lint: `npm run lint`
- Test: `npm run test`
- Build: `npm run build`

## Test Scope

### Unit

- Risk tier classification and Tier 2 checkpoint enforcement.
- Progress status guard (`started`, `need_input`, `completed`).
- Workflow escalation logic and state transitions.

### Integration

- API handlers with channel normalization + workflow detection.
- Risk assessment flow with policy gate interaction.
- Memory and Care Circle API policy responses.

### End-to-End

- “Call me” ingestion -> callback request payload -> success envelope.
- Scam triage path for Tier 2 with/without consent.
- Troubleshooting escalation trigger path.

## Requirement-to-Test Mapping

| PRD criterion | Test level | Test case id |
|---|---|---|
| Callback request on “call me” | Integration + E2E | INT-CALL-001 / E2E-CALL-001 |
| Tiered scam output and guardrails | Unit + Integration | UNIT-RISK-001 / INT-RISK-001 |
| Repeated confusion triggers escalation | Unit + E2E | UNIT-WF-002 / E2E-WF-001 |
| Progress status policy enforcement | Unit + Integration | UNIT-POL-003 / INT-POL-001 |
| Memory blocked on do-not-save | Integration | INT-MEM-001 |

## Test Data and Fixtures

- Required fixtures: representative inbound payloads for SMS, WhatsApp, and voice event callbacks.
- Synthetic data needs: Tier 0/1/2 scam text corpus and troubleshooting transcripts.
- Cleanup strategy: deterministic fixture reset in DB-backed test phase (milestone 2+).

## Release Verification Checklist

- [ ] All new/changed behavior covered by tests
- [ ] Regression tests pass
- [ ] No flaky tests introduced
- [ ] Risk summary written
- [ ] Security review completed for touched surfaces
