# Idea Brief: North Haven v1 MVP

Date: 2026-03-01
Repository: north-haven
Working stack: TypeScript, Node.js, Postgres, Redis/BullMQ, OpenAPI

## 1) Problem

Older adults and families lose time, money, and confidence when everyday tech issues or scam messages appear. Most support tools require new apps, dashboards, or account complexity that users do not want. North Haven solves this by delivering support through channels users already use: SMS, WhatsApp, and voice calls.

## 2) Target User

Primary users:
- Older adults who want direct tech help in plain language.
- Adult children/caregivers who optionally co-manage safety through Care Circle.

Out of scope for v1:
- Enterprise IT support teams.
- Medical or legal advisory workflows.

## 3) Outcome

Users can ask for help in one message, get safe step-by-step support, escalate to callback when needed, and keep one continuity thread. Families are looped in only for high-risk events and only with explicit consent.

## 4) Success Signals

- Leading indicator: first-week safe first-resolution rate >= 50% in pilot cohort.
- Lagging indicator: weekly retention for activated users >= 30% by week 8.
- Manual acceptance check: in staged test runs, all 15 MVP acceptance scenarios pass.

## 5) Constraints

- Technical: idempotent webhook handling, queue-based orchestration, schema-versioned internal API.
- Timeline: MVP blueprint and scaffold ready now; implementation milestones sequenced in docs/plans.
- Compliance / policy: explicit AI disclosure, consent gating for Care Circle, PII-aware log redaction.

## 6) Non-Goals

- This effort will not implement iMessage or direct RCS integration.
- This effort will not execute financial transactions or medical diagnosis.

## 7) Assumptions

- Twilio will be used for SMS and PSTN callback operations in US-first launch.
- WhatsApp adapter will target the WhatsApp Cloud API.

## 8) Open Questions

- Which transcript provider is preferred for voice summary quality vs cost?
- Which operator console framework should be selected in milestone 6?
