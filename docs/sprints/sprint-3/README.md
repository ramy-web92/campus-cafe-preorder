# Sprint 3 — Engineering Contracts and Status

> Version 1.0 — contracts for **all remaining baseline features**, written and reviewed before Sprint 3 implementation (Issues #57–#60).
> Sprint goal: pickup times, sales summary and dashboard, order search, accessibility and performance checks, regression and defect fixes, final release by 13 December 2026.
> Baseline: Sprint 2 release `v0.2.0` on `main`.

| Contract | Feature | Requirements | AC | Issue | Plan at Deliverable 2 |
|---|---|---|---|---|---|
| [F-11-pickup-time.md](F-11-pickup-time.md) | F-11 Pickup time | FR-15, BR-14 | AC-100–AC-105 | #57 | implement and test **before 29/11** |
| [F-13-order-search.md](F-13-order-search.md) | F-13 Order history search and filter | FR-17 | AC-120–AC-124 | #59 | implement and test **before 29/11** |
| [F-12-sales-dashboard.md](F-12-sales-dashboard.md) | F-12 Sales summary and operator dashboard | FR-16, FR-19, BR-16 | AC-110–AC-115 | #58 | implement and test **before 29/11** |
| [F-14-accessibility-performance.md](F-14-accessibility-performance.md) | F-14 Accessibility and performance | NFR-08, NFR-10 | AC-130–AC-132 | #60 | contract now, checks after 29/11 |
| [sts.md](sts.md) | Software Test Specification for all Sprint 3 AC | — | AC-100–AC-132 | — | |

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
