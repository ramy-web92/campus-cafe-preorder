# F-14 Quality hardening — responsive layout (Sprint 2 part)

**Requirements:** NFR-09 · **Issue:** #55 · **Depends on:** every UI screen of Sprints 1–2 · **Version:** 1.0

The accessibility (NFR-08) and performance (NFR-10) parts of F-14 are Sprint 3 and have their own contract in `docs/sprints/sprint-3/`.

## Feature SDS
- **Rule (NFR-09):** no horizontal page scroll at viewport widths **360, 768 and 1280 px** on the main screens: Login, Menu with a filled cart, My orders, Order detail (customer), Order queue (operator) and Menu management (operator).
- **Approach:** Bootstrap grid and `table-responsive` wrappers already used in Sprint 1. Wide tables scroll **inside** their wrapper, never the page. Action buttons wrap on small screens (`flex-wrap`). No fixed widths larger than 320 px.
- **Measurement:** a Playwright test opens each screen at each width and checks `document.documentElement.scrollWidth <= window.innerWidth`. A screenshot per screen and width is saved in `artifacts/sprint-2/responsive/`.
- **Layers:** UI only. API and database: no change.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-90 | At 360, 768 and 1280 px, each of the six main screens has `scrollWidth <= innerWidth` (no horizontal page scroll), with seeded data and at least one order in the lists. |
| AC-91 | At 360 px, every action button of the queue and of the order detail is visible and clickable without horizontal scrolling of the page. |

## Definition of Done (feature-specific)
- AC-90 and AC-91 covered by E2E-R01 in [sts.md](sts.md), passing in CI; screenshots stored as artifacts.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Initial contract, written before implementation |
