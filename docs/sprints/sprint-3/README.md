# Sprint 3 — Engineering Contracts and Status

> Version 1.1 — status and remaining-work plan added for Deliverable 2 (release candidate `v0.3.0-rc1`). Version 1.0: contracts for **all remaining baseline features**, written and reviewed before Sprint 3 implementation (Issues #57–#60).
> Sprint goal: pickup times, sales summary and dashboard, order search, accessibility and performance checks, regression and defect fixes, final release by 13 December 2026.
> Baseline: Sprint 2 release `v0.2.0` on `main`.

| Contract | Feature | Requirements | AC | Issue | Plan at Deliverable 2 |
|---|---|---|---|---|---|
| [F-11-pickup-time.md](F-11-pickup-time.md) | F-11 Pickup time | FR-15, BR-14 | AC-100–AC-105 | #57 | implement and test **before 29/11** |
| [F-13-order-search.md](F-13-order-search.md) | F-13 Order history search and filter | FR-17 | AC-120–AC-124 | #59 | implement and test **before 29/11** |
| [F-12-sales-dashboard.md](F-12-sales-dashboard.md) | F-12 Sales summary and operator dashboard | FR-16, FR-19, BR-16 | AC-110–AC-115 | #58 | implement and test **before 29/11** |
| [F-14-accessibility-performance.md](F-14-accessibility-performance.md) | F-14 Accessibility and performance | NFR-08, NFR-10 | AC-130–AC-132 | #60 | contract now, checks after 29/11 |
| [sts.md](sts.md) | Software Test Specification for all Sprint 3 AC | — | AC-100–AC-132 | — | |

## Status at Deliverable 2 (29/11/2026)

| Feature / item | Planned | In progress | Implemented | Tested (CI) | Accepted (release on `main`) |
|---|---|---|---|---|---|
| F-11 Pickup time (AC-100–105) | ✓ | ✓ | ✓ | ✓ RED `ed49bf4` → GREEN `ab60692` | ✓ `v0.3.0-rc1` (release candidate) |
| F-13 Order search (AC-120–124) | ✓ | ✓ | ✓ | ✓ RED `919765e` → GREEN `5d02f0f` | ✓ `v0.3.0-rc1` |
| F-12 Sales and dashboard (AC-110–115) | ✓ | ✓ | ✓ | ✓ RED `6d00afc` → GREEN `97b2df3` (+ test fix `a9058db`) | ✓ `v0.3.0-rc1` |
| F-14 Accessibility (AC-130, AC-131) | ✓ | — | partly (labels, roles, keyboard-usable controls since Sprint 1) | ✗ no axe run yet | ✗ |
| F-14 Performance (AC-132) | ✓ | — | — | ✗ | ✗ |
| UAT re-test of Sprint 2–3 journeys | ✓ | — | — | — | ✗ |
| Final video and final release `v1.0.0` | ✓ | — | — | — | ✗ |

## Remaining-work plan to 13 December 2026

The final examination period is 1–11 December, so the product workflows are finished before 29/11; what remains is bounded verification work, mostly scheduled before or between exams.

| Feature or defect | Current status | Remaining action | Owner and target |
|---|---|---|---|
| F-14 / NFR-10 (AC-132) | contract + STS (TEST-PERF01) | write the 100-order script with supertest, record p50/p95 in the release notes; if p95 ≥ 500 ms, review indexes | FAHS Rémy · 30/11/2026 |
| F-14 / NFR-08 (AC-130, AC-131) | contract + STS (E2E-A01, E2E-A02); UI uses labels, roles, `aria-live` | add `@axe-core/playwright`, run on the 7 main screens, fix serious/critical findings, keyboard-only journey test | DARWICHE Maxime · 03/12/2026 |
| TD-1 (Lab 7): `MAX_QTY` defined in server and client | open debt | expose limits in `GET /api/menu`, client reads them; regression TEST-O05/UI-02 | FAHS Rémy · 30/11/2026 |
| UAT re-test with EN-036 (YQueFue) | Sprint 1 accepted in Lab 6; Sprint 2–3 not yet re-tested by them | send the live URL + private accounts; re-test cancel, lifecycle, payment/refund, menu management, pickup time, filters; log findings as `uat` Issues | FAHS Rémy + DARWICHE Maxime · invite 30/11, results by 06/12/2026 |
| Defects found by UAT or the checks above | none open at 29/11 | triage within 24 h; fix with a failing test first; re-test | both · until 10/12/2026 |
| Final video (≤ 5 min) | not started | script from the E2E journeys; record customer + operator flows on the live URL | DARWICHE Maxime · 11/12/2026 |
| Final release `v1.0.0` | `v0.3.0-rc1` deployed | STS results v1.2, traceability v2.1 (NFR-08/10), release PR, tag, deploy, live checks, final report | FAHS Rémy · 12/12/2026 |

## Baseline revisions recorded with these contracts

| ID | Revision | Rationale | Approved |
|---|---|---|---|
| D-09 (SRS v1.2) | Pickup time is optional: "As soon as possible" (default) or a chosen time; BR-14 applies to a chosen time. | Ordering must keep working outside opening hours as in Sprints 1–2 (and the existing tests); FR-15 is about letting the customer choose, not forcing a time. | Team review of this PR |
| AC-30 (F-06 v1.2) | Queue order "oldest first" becomes "earliest pickup first (ASAP orders by submission time)". | FR-15 asks for orders sorted by pickup time; for ASAP orders the result is unchanged. | Team review of this PR |

## Sprint 3 Definition of Done

Same as the Sprint 2 DoD ([../sprint-2/README.md](../sprint-2/README.md)), plus:
- time-dependent rules are tested with a fixed clock (unit) and with a clock-independent API test;
- the release candidate is deployed on GCP, its revision matched to the tag, commit and CI run, and checked on the live URL.

## Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-26 | Contracts and STS for F-11, F-12, F-13, F-14 (a11y/perf); D-09 and AC-30 revisions | Rémy |
| 1.1 | 2026-11-27 | Status table and remaining-work plan for Deliverable 2 | Rémy |
