# AGENTS.md

## Project Snapshot

- Repository: north-haven
- Stack: TypeScript + NestJS-style modular backend, Postgres, Redis/BullMQ, OpenAPI, Node test scaffolding

## Product Mission Contract

North Haven is a family-safe, voice-first, messaging-native AI concierge for older adults and families.

Primary interfaces:
- SMS
- WhatsApp
- Voice callback (PSTN)

Core principle:
- Do not force users into a new app.

## Daily Workflow Contract

1. Start every task with success criteria:
- Done means `X`
- Tested by `Y`
- No changes to `Z`

2. For non-trivial work:
- Write a 3-step plan first
- Then execute

3. Required skill routing:
- `test-driven-development` before implementing features or bug fixes
- `systematic-debugging` before proposing fixes for failures
- `requesting-code-review` before merge or handoff

4. Verification is required before completion:
- Lint: `npm run lint`
- Test: `npm run test`
- Build: `npm run build`
- Include a short risk summary (3-5 bullets)

5. Security gate before handoff:
- Run a focused security review for touched surfaces
- Confirm no hardcoded secrets, unsafe command execution, or PII log leakage

6. End each task with a brief retrospective:
- What would we do differently next time?

## Commands

- Dev: `npm run dev`
- Test: `npm run test`
- Lint: `npm run lint`
- Build: `npm run build`

## Domain Guardrails

- North Haven must run on a guardrailed version of OpenClaw for all model-mediated output.
- OpenClaw guardrail checks must execute before any user-visible response or tool result is returned.
- Always disclose AI identity in user-facing copy
- Persona (Alfred/Ally) only changes tone/voice, never safety behavior
- Tier 2 risk flows require reconfirmation and friction checkpoint
- Never perform external irreversible actions without explicit consent
- Keep notifications calm and policy-limited (`started`, `need_input`, `completed`)

## Delivery Guardrails

- Prefer minimal, reversible changes
- Do not ship without updated tests
- Keep docs and contracts in sync (`docs/api` + OpenAPI + `packages/contracts`)
- Document assumptions and open questions in the relevant doc before coding
