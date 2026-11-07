# Sprint 1 — Engineering Contracts

> Version 1.1 — written and reviewed **before** implementation (Issue #3, PR #10). Later revisions are listed below and in each contract. > Sprint goal: a Customer logs in, orders from the menu and reopens the saved order; an Operator logs in and accepts it. Totals are computed on the server, invalid quantities and sold-out items are rejected, and customers cannot see each other's orders.

| Contract | Features | Requirements | AC | Issue |
|---|---|---|---|---|
| [F-16-setup.md](F-16-setup.md) | F-16 Setup, schema, seed | NFR-07, NFR-12 | AC-40 | #4 |
| [F-01-F-02-auth.md](F-01-F-02-auth.md) | F-01 Authentication, F-02 Access control | FR-01–FR-03, BR-17, NFR-01–NFR-04, NFR-06 | AC-01–AC-07 | #5 |
| [F-03-F-04-place-order.md](F-03-F-04-place-order.md) | F-03 Menu, F-04 Place order | FR-04, FR-05, BR-01–BR-05, BR-15, NFR-05 | AC-10–AC-19 | #6 |
| [F-05-my-orders.md](F-05-my-orders.md) | F-05 My orders and detail | FR-06, FR-07, BR-08 | AC-20–AC-22 | #7 |
| [F-06-accept.md](F-06-accept.md) | F-06 Operator queue and accept | FR-08, FR-09, BR-06, BR-07, BR-09, BR-11 | AC-30–AC-35 | #8 |
| [sts.md](sts.md) | Software Test Specification for all Sprint 1 AC | — | AC-01–AC-40 | #3 |

## Product Definition of Done (Sprint 1)

A feature is **done** only when every item below is true and the evidence exists:

- [ ] Behavior in its contract is implemented in the UI, API and database layers (or the contract states that a layer needs no change).
- [ ] Every AC of the feature is covered by at least one automated test listed in [sts.md](sts.md); the tests have meaningful assertions and pass.
- [ ] Business-rule work followed TDD: the rule test was committed and **failed** before the implementation commit, then passed (commit IDs recorded in the PR).
- [ ] Authorization is enforced by the backend and tested without the UI (401 / 403 / 404 cases).
- [ ] Full suite green on the PR branch: `npm test` (server), `npm test` (client) and, for the release, `npm run test:e2e`; no test skipped or weakened.
- [ ] The PR into `sprint-1` links its Issue and contract, and was reviewed and approved by the **other** student with a specific comment.
- [ ] README, `.env.example`, migrations and seed are current; no secrets committed.
- [ ] Incomplete work, known defects and failed/skipped tests are written in the PR and in the release notes.

**Sprint 1 release** is done when `sprint-1` is merged into `main` through a reviewed release PR, tagged `v0.1.0`, and the build/test commands and results are recorded with the tagged commit.

## Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial Sprint 1 contracts and STS | Rémy + Maxime |
| 1.1 | 2026-11-07 | Issue numbers corrected (#4–#8); STS results filled from the release run; E2E-05 and E2E-06 added to show the rule rejection and forbidden operations in the browser | Rémy + Maxime |
