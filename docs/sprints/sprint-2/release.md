# Sprint 2 Release — v0.2.0

> Release of the Sprint 2 increment from `staging` into `main` through a release PR. Tag: **`v0.2.0`** (points at the release merge commit on `main`). Deployed by "Deploy demo" on Cloud Run.
> Baseline: Sprint 1 `v0.1.0` + Lab 6 fix (DEF-D01, PR #45/#46) + Lab 7 CR-01 (PR #48–#50).

## Delivered features

| Feature | Issue | Contract PR | Feature PR | Author | Reviewer |
|---|---|---|---|---|---|
| Sprint 2 contracts, STS, DoD | #51–#55 | #56 | — | Rémy | Maxime |
| F-07 Reject and cancel | #51 | #56 | #61 | Rémy | Maxime |
| F-08 Lifecycle and history view | #52 | #56 | #62 | Rémy | Maxime |
| F-09 Menu management | #53 | #56 | #63 | Rémy | Maxime |
| F-10 Simulated payment and refund | #54 | #56 | #64 | Rémy | Maxime |
| F-14 Responsive check (NFR-09) | #55 | #56 | #65 | Rémy | Maxime |

Every Sprint 2 feature of the plan is complete; none was moved to Sprint 3.

## Build and test results (release code)

Same commit as the last feature merge into `staging`; CI "CI & Docker Build" ran on each PR and on the release PR.

| Suite | Command | Files | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server unit + API/DB integration | `cd server && npm test` | 13 | 171 | 0 | 0 |
| Client UI components + production build | `cd client && npm test && npm run build` | 6 | 27 | 0 | 0 |
| End-to-end (browser → API → DB) | `npm run test:e2e` | 4 | 13 | 0 | 0 |
| Production Docker image | `docker build .` (CI step) | — | passed | — | — |

No test was skipped, disabled or weakened. Sprint 1 and CR-01 tests are unchanged and pass.

## TDD evidence (first commit of each PR = tests only, CI red; second = implementation, CI green)

| Feature | RED commit | CI on RED | GREEN commit | CI on GREEN |
|---|---|---|---|---|
| F-07 | `0364aee` | failed: 18 tests (e.g. `validateReason is not a function`, TEST-R08 status still SUBMITTED) | `42720ff` | passed |
| F-08 | `849bd09` | failed (no lifecycle endpoint) | `78a74d3` | passed |
| F-09 | `bf7751b` | failed (no `menuRules`, no endpoints) | `1db6cd6` | passed |
| F-10 | `88e4010` | failed: `canPay is not a function`, payment API tests | `c0bf841` | passed |
| F-14 | `abb63b4` | failed: operator queue 721 px wide at 360 px (E2E step) | `38eddd9` | passed |

## Database changes

- Migration `20261126090000_f10_payment`: enum `PaymentStatus`, `Order.paymentStatus` (default `UNPAID`), `Order.paidAt`. Applied on Cloud SQL by the release job (`prisma migrate deploy`) before the new revision takes traffic. Existing orders become `UNPAID` (true: Sprint 1 had no payment).

## Known limitations

- Payment is simulated (no provider, no card data), as in the baseline scope.
- Menu items cannot be deleted (they are referenced by order lines); operators mark them sold out (F-09 contract).
- Categories are fixed by the seed.
- Accessibility (NFR-08) and performance (NFR-10) checks are Sprint 3.

## Contribution

| Student | Sprint 2 |
|---|---|
| FAHS Rémy (69540460043) | Contracts and STS; tests and implementation of F-07, F-08, F-09, F-10, F-14; CI follow-up; release |
| DARWICHE Maxime (69540460044) | Review and approval of the contracts PR and of the five feature PRs (questions recorded in the PRs); release review |
