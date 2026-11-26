# Sprint 2 — Engineering Contracts

> Version 1.0 — written and reviewed **before** implementation (Issues #51–#55). Later revisions are listed below and in each contract.
> Sprint goal: complete the order lifecycle and let the café run its menu. An Operator rejects, cancels and moves orders through Preparing → Ready → Picked up; both roles see the full history; the Operator edits menu items and prices; a Customer cancels, and pays (simulated) with refunds on cancel/reject. All main screens work at 360–1280 px.
> Baseline: Sprint 1 release `v0.1.0`, plus the Lab 6 fix (DEF-D01) and the Lab 7 change CR-01 (quantity 1–5), released on `main` at `cf19c4a`.

| Contract | Feature | Requirements | AC | Issue |
|---|---|---|---|---|
| [F-07-reject-cancel.md](F-07-reject-cancel.md) | F-07 Reject and cancel | FR-10, FR-12, BR-06, BR-07, BR-10, BR-11 | AC-50–AC-58 | #51 |
| [F-08-lifecycle-history.md](F-08-lifecycle-history.md) | F-08 Fulfilment lifecycle and history view | FR-11, FR-18, BR-06, BR-09, BR-11 | AC-60–AC-66 | #52 |
| [F-09-menu-management.md](F-09-menu-management.md) | F-09 Menu management | FR-13, BR-12, BR-02, BR-05 | AC-70–AC-75 | #53 |
| [F-10-payment.md](F-10-payment.md) | F-10 Simulated payment | FR-14, BR-13, BR-08 | AC-80–AC-85 | #54 |
| [F-14-responsive.md](F-14-responsive.md) | F-14 Quality hardening (responsive part) | NFR-09 | AC-90–AC-91 | #55 |
| [sts.md](sts.md) | Software Test Specification for all Sprint 2 AC | — | AC-50–AC-91 | #51–#55 |

## Layers changed per feature

| Feature | UI | API | Data / migration | Shared code |
|---|---|---|---|---|
| F-07 | queue and detail actions, reason form, customer cancel | 3 endpoints | none | `transitionOrder` (replaces the accept-only code) |
| F-08 | queue filter with all statuses, lifecycle buttons, history with reasons | 1 endpoint; queue filter | none | `transitionOrder`, BR-06 matrix completed |
| F-09 | new operator "Menu" tab and item form | 2 endpoints | none (uses F-16 schema and CHECK) | `menuRules` validation |
| F-10 | payment line, Pay now button, badges | 1 endpoint; `paymentStatus` in every order object | **yes**: `PaymentStatus` enum, `paymentStatus`, `paidAt` | refund inside `transitionOrder` |
| F-14 | layout fixes only if the test finds overflow | none | none | — |

## Product Definition of Done (Sprint 2)

A feature is **done** only when every item below is true and the evidence exists:

- [ ] The contract (feature SDS, API/UI/data, validation, AC) was merged into `staging` **before** the first implementation commit, and reviewed by the other student.
- [ ] Behavior in the contract is implemented in every layer it names; layers marked "no change" are untouched.
- [ ] Every AC is covered by at least one automated test in [sts.md](sts.md) with meaningful assertions on the response **and** on the database (status, history rows, payment status, prices).
- [ ] TDD: the test commit was pushed first and **failed in CI**, then the implementation commit made it pass (both commit IDs in the PR).
- [ ] Authorization is enforced by the backend and tested without the UI (401 / 403 / 404).
- [ ] Full suite green on the PR: server (unit + API), client, E2E and Docker build; no test skipped or weakened; Sprint 1 regression tests unchanged except where a contract revision says so.
- [ ] PR into `staging` links its Issue and contract and is approved by the **other** student with a specific comment.
- [ ] Migrations, seed, README and `.env.example` current; no secrets committed.
- [ ] Known defects, failed or skipped tests are written in the PR and the release notes.

**Sprint 2 release** is done when `staging` is merged into `main` through a reviewed release PR, tagged `v0.2.0`, deployed on Cloud Run by the Lab 5 pipeline, and checked on the live URL.

## Work allocation (Sprint 2)

| Issue | Scope | Author | Reviewer |
|---|---|---|---|
| #51 | F-07 Reject and cancel | Rémy | Maxime |
| #52 | F-08 Lifecycle and history | Rémy | Maxime |
| #53 | F-09 Menu management | Rémy | Maxime |
| #54 | F-10 Simulated payment | Rémy | Maxime |
| #55 | F-14 Responsive check | Rémy | Maxime |
| — | Contracts review, release review, live checks | Maxime | Rémy |

## Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-25 | Initial Sprint 2 contracts, STS and DoD | Rémy |
| 1.1 | 2026-11-27 | Release notes added ([release.md](release.md)); all Sprint 2 features done | Rémy |
