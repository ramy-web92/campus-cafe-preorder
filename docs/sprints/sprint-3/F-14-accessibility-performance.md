# F-14 Quality hardening — accessibility and performance (Sprint 3 part)

**Requirements:** NFR-08, NFR-10 · **Issue:** #60 · **Depends on:** every UI screen; F-04 (order submission) · **Version:** 1.0 · **Status at Deliverable 2: contract only, planned (see README)**

The responsive part (NFR-09) was delivered in Sprint 2 (`docs/sprints/sprint-2/F-14-responsive.md`).

## Feature SDS
- **Accessibility (NFR-08):** the main screens (Login, Menu with cart, My orders, Order detail, Order queue, Menu management, Sales) have **0 serious or critical axe-core violations** and can be used with the keyboard only: every action reachable with Tab, visible focus, Enter/Space activate buttons, form errors linked to their inputs (`aria-describedby`), status messages in `role="status"` regions.
- **Measurement:** `@axe-core/playwright` in an E2E test that opens each screen with data and asserts no violation with impact `serious` or `critical`; a keyboard-only E2E journey places an order and an operator accepts it without the mouse.
- **Performance (NFR-10):** `POST /api/orders` responds in **< 500 ms at the 95th percentile** locally with the seeded data. A script sends 100 sequential orders (3 lines each) through supertest against the test database and reports p50/p95; the test fails above 500 ms.
- **Layers:** UI fixes only where axe finds a problem; API and database unchanged unless the performance test fails (then: index review).

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-130 | Each main screen has 0 serious/critical axe violations, with seeded data and at least one order in each list. |
| AC-131 | A Customer can log in, add two items, place an order and open it using only the keyboard; an Operator can accept it using only the keyboard. |
| AC-132 | 100 order submissions locally have p95 < 500 ms; p50 and p95 are printed in the test output and recorded in the release notes. |

## Definition of Done (feature-specific)
- AC-130–AC-132 covered by E2E-A01, E2E-A02 and TEST-PERF01 in [sts.md](sts.md); planned for 09/12/2026.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | Initial contract; implementation planned after Deliverable 2 |
