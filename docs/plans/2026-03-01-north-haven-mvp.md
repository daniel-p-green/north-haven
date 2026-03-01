# North Haven v1 MVP Implementation Plan

Date: 2026-03-01
Repository: north-haven
Feature slug: north-haven-mvp

> Required workflow:
> 1) Define success criteria
> 2) If non-trivial, write a 3-step plan before code
> 3) Implement with test-first discipline

## Goal

Ship a production-lean MVP foundation for North Haven with channel ingestion, risk-aware workflows, voice escalation architecture, consentful memory controls, and operator-grade traceability.

## Inputs

- `docs/discovery/idea-brief.md`
- `docs/product/prd.md`
- `docs/product/jtbd.md`
- `docs/product/use-cases.md`
- `docs/engineering/test-strategy.md`
- `docs/architecture/system-architecture.md`
- `docs/data/data-model.md`
- `docs/api/internal-api.md`
- `docs/policy/risk-guardrails.md`
- `docs/conversation/conversation-design.md`

## Execution Plan (3 Steps)

1. Foundations and contracts: finalize architecture, schemas, API contracts, and migration baseline.
2. Core behavior: implement ingestion, workflow/risk/memory policy modules, and callback orchestration.
3. Hardening and operations: instrument metrics, enforce reliability controls, and complete runbook + launch checks.

## Task Breakdown

### Task 1: Platform Foundation and Contracts

- Files to modify:
  - `apps/api/openapi/north-haven-internal.yaml`
  - `packages/contracts/src/*.ts`
  - `infra/db/migrations/*.sql`
- Tests to add first:
  - Contract envelope tests and error code conformance.
- Definition of done:
  - API and DB schema are versioned, documented, and test-mapped.

### Task 2: Workflow, Policy, and Escalation Engine

- Files to modify:
  - `packages/policy-engine/src/index.js`
  - `packages/workflow-engine/src/index.js`
  - `apps/api/src/handlers.js`
  - `apps/worker/src/worker.js`
- Tests to add first:
  - Risk tier + escalation + policy gate unit tests.
- Definition of done:
  - Tier policies and escalation rules execute deterministically.

### Task 3: Observability, Operator Surfaces, and Launch Readiness

- Files to modify:
  - `docs/operations/runbook-local-staging.md`
  - operator console scaffolding and audit pathways.
- Tests to add first:
  - End-to-end flow checks for callback, scam triage, and troubleshooting escalation.
- Definition of done:
  - SLO checks, incident playbooks, and operator replay procedures are documented and testable.

## Verification Commands

- Dev: `npm run dev`
- Test: `npm run test`
- Lint: `npm run lint`
- Build: `npm run build`

## Risk Notes

- Telecom provider variance may affect callback SLA consistency.
- Risk classifier quality can drift without curated feedback loops.
- Alert fatigue risk requires strict policy guard enforcement.
- Consent model must be audited carefully to prevent privacy regressions.

## Retrospective Prompt

What would we do differently next time to reduce risk or increase delivery speed?
