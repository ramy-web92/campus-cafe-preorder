# Release candidate — v0.3.0-rc1 (Deliverable 2)

> Integrated candidate on `main`: Sprint 1 (`v0.1.0`), Lab 6 fix, Lab 7 CR-01, Sprint 2 (`v0.2.0`) and the implemented Sprint 3 features F-11, F-12, F-13. Release PR from `staging` to `main`, tag **`v0.3.0-rc1`** on the release merge commit, deployed by the "Deploy demo" run of that merge (run number and Cloud Run revision recorded in the Deliverable 2 report, Part E).

## Contents since v0.2.0

| Item | Issue | PR | Author | Reviewer |
|---|---|---|---|---|
| Sprint 3 contracts and STS (F-11, F-12, F-13, F-14), D-09, AC-30 v1.2 | #57–#60 | #68 | Rémy | Maxime |
| F-11 Pickup time | #57 | #69 | Rémy | Maxime |
| F-13 Order history search and filter | #59 | #70 | Rémy | Maxime |
| F-12 Sales summary and dashboard | #58 | #71 | Rémy | Maxime |
| Documents for Deliverable 2 (SDS v1.2, features v1.1, traceability v2.0, STS results, this file) | — | #72 | Rémy | Maxime |

## Build and test results (candidate commit)

| Suite | Command | Files | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server unit + API/DB integration | `cd server && npm test` | 18 | 207 | 0 | 0 |
| Client UI components + production build | `cd client && npm test && npm run build` | 6 | 31 | 0 | 0 |
| End-to-end (browser → API → DB) | `npm run test:e2e` | 5 | 15 | 0 | 0 |
| Production Docker image | CI step "Verify production Dockerfile build" | — | passed | — | — |

Not run yet (planned, see README remaining-work plan): accessibility E2E (E2E-A01, E2E-A02) and the performance test (TEST-PERF01). They are not reported as passed anywhere.

## Cross-feature checks in the suite

| Check | Features | Test |
|---|---|---|
| Cancel/reject of a paid order refunds it | F-07 × F-10 | TEST-P04, E2E-S04 |
| Price change keeps old orders' snapshot; sales use snapshots | F-09 × F-04 × F-12 | TEST-MM02, TEST-SS02 |
| Sold-out item refused at ordering | F-09 × F-04 | TEST-MM04 |
| Queue order by pickup time with older ASAP orders and CR-01 orders | F-11 × F-06 × CR-01 | TEST-PT04, TEST-Q01, TEST-O14 |
| Filters never cross ownership | F-13 × F-02 | TEST-SF04 |
| Sales count only Picked-up orders reached through the lifecycle | F-12 × F-08 × F-07 | TEST-SS01, E2E-SS01 |
| Every new endpoint: 401 anonymous, 403 wrong role, 404 other customer | F-02 × all | TEST-R05, TEST-L04, TEST-MM06, TEST-P05, TEST-SF04, TEST-SS04 |

## Database changes

- `20261126120000_f11_pickup_time`: `Order.pickupAt` (NOT NULL, existing rows set to `createdAt`), `Order.pickupAsap` (default true), index `(status, pickupAt)`. Applied on Cloud SQL by the release job before traffic moves.

## CI incidents during Sprint 3

- PR #71 (F-12): the GREEN commit failed in CI on the client step. The existing `App.test.tsx` mocked only `operatorApi.list`; the queue now also calls `operatorApi.dashboard`, so Vitest reported an unhandled rejection. Commit `a9058db` adds the missing mock; no product code changed. Lesson: read the whole Vitest summary (including "Errors"), not only the "Tests" line, before pushing.

## Known limitations and defects at the candidate

- NFR-08 and NFR-10 not verified yet (planned 30/11 and 03/12).
- TD-1: `MAX_QTY` is defined in both server and client (server enforces; planned 30/11).
- Pickup times are validated against the server clock; the cart hint shows the rule but does not block an invalid time before submission (the server answers 422 with the message).
- No open UAT defect; Sprint 2–3 journeys not yet re-tested by the UAT team (planned).
