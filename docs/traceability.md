# KMUTT Café Pre-Order — Requirements Traceability

> Version 2.0 (Deliverable 2, release candidate `v0.3.0-rc1`). One matrix for every baseline FR, BR and NFR, including approved changes.
> Columns: requirement → feature / system responsibility → sprint → acceptance criteria or NFR measure → planned test (STS ID) → actual file → result and version.
> **Result values:** *Pass (RC)* = the test is in the suite and passed in the CI run of the release candidate and locally; *Planned* = contract and test design exist, the test is not written or not run yet — it is **not** counted as covered.
> Test files: `server/tests/unit/*.test.ts` (Unit), `server/tests/api/*.api.test.ts` (API + PostgreSQL), `client/tests/*.test.tsx` (UI), `e2e/*.spec.ts` (E2E). STS: [Sprint 1](sprints/sprint-1/sts.md) · [Sprint 2](sprints/sprint-2/sts.md) · [Sprint 3](sprints/sprint-3/sts.md).

## Functional requirements

| Requirement | Feature | Sprint | AC | Planned tests | Actual files | Result |
|---|---|---|---|---|---|---|
| FR-01 Login | F-01 | 1 | AC-01, AC-02 | TEST-A01, TEST-A02, E2E-01 | auth.api.test.ts, auth.spec.ts | Pass (RC) |
| FR-02 Logout | F-01 | 1 | AC-03 | TEST-A03, E2E-01 | auth.api.test.ts, auth.spec.ts | Pass (RC) |
| FR-03 Current user | F-01 | 1 | AC-04 | TEST-A04 | auth.api.test.ts | Pass (RC) |
| FR-04 Menu browsing | F-03 | 1 | AC-10 | TEST-M01, UI-01, E2E-04 | menu.api.test.ts, Menu.test.tsx, order-journey.spec.ts | Pass (RC) |
| FR-05 Place order | F-04 | 1 | AC-11 | TEST-O01, UI-02, E2E-02 | orders.api.test.ts, Menu.test.tsx, order-journey.spec.ts | Pass (RC) |
| FR-06 My orders list | F-05 | 1 | AC-20 | TEST-O10 | orders.api.test.ts | Pass (RC) |
| FR-07 Order detail | F-05 | 1 | AC-21 | TEST-O11, E2E-02 | orders.api.test.ts, order-journey.spec.ts | Pass (RC) |
| FR-08 Operator queue | F-06 (+F-11 order) | 1 · 3 | AC-30 (v1.2) | TEST-Q01 (revised), TEST-PT04 | operator-orders.api.test.ts, pickup.api.test.ts | Pass (RC) |
| FR-09 Accept order | F-06 | 1 | AC-31 | TEST-Q02, E2E-03 | operator-orders.api.test.ts, order-journey.spec.ts | Pass (RC) |
| FR-10 Reject with reason | F-07 | 2 | AC-50, AC-51, AC-52 | TEST-T01, TEST-T03, TEST-R01–R03, UI-S01, E2E-S01 | order-transitions.test.ts, reject-cancel.api.test.ts, OperatorQueue.test.tsx, sprint2.spec.ts | Pass (RC) |
| FR-11 Fulfilment lifecycle | F-08 | 2 | AC-60, AC-61, AC-62, AC-65, AC-66 | TEST-T05, TEST-L01–L03, TEST-L05, TEST-L06, UI-S03, E2E-S02 | lifecycle.api.test.ts, OperatorQueue.test.tsx, sprint2.spec.ts | Pass (RC) |
| FR-12 Customer cancel | F-07 | 2 | AC-53, AC-54 | TEST-T02, TEST-R04, UI-S02 | reject-cancel.api.test.ts, OrderDetail.test.tsx | Pass (RC) |
| FR-13 Menu management | F-09 | 2 | AC-70, AC-73, AC-74 | TEST-MM01, TEST-MM04, TEST-MM05, UI-S05, UI-S06, E2E-S03 | menu-management.api.test.ts, MenuManagement.test.tsx, sprint2.spec.ts | Pass (RC) |
| FR-14 Simulated payment | F-10 | 2 | AC-80, AC-81, AC-85 | TEST-P01, TEST-P02, TEST-P06, UI-S07, E2E-S04 | payment.api.test.ts, OrderDetail.test.tsx, sprint2.spec.ts | Pass (RC) |
| FR-15 Pickup time | F-11 | 3 | AC-100–AC-105 | TEST-K01–K04, TEST-PT01–PT04, UI-K01, E2E-K01 | pickup-rules.test.ts, pickup.api.test.ts, Menu.test.tsx, sprint3.spec.ts | Pass (RC) |
| FR-16 Sales summary | F-12 | 3 | AC-110–AC-113 | TEST-SS01–SS04, E2E-SS01 | sales.api.test.ts, sprint3.spec.ts | Pass (RC) |
| FR-17 Order search/filter | F-13 | 3 | AC-120–AC-123 | TEST-F01, TEST-F02, TEST-SF01–SF03, UI-F01 | order-filters.test.ts, order-search.api.test.ts, MyOrders.test.tsx | Pass (RC) |
| FR-18 Status history view | F-08 (entries from F-06/F-07) | 2 | AC-58, AC-64 | TEST-R08, TEST-L05, UI-S02, UI-S04, E2E-S02 | reject-cancel.api.test.ts, lifecycle.api.test.ts, OrderDetail.test.tsx, sprint2.spec.ts | Pass (RC) |
| FR-19 Operator dashboard | F-12 | 3 | AC-114 | TEST-SS05, UI-SS01 | sales.api.test.ts, OperatorQueue.test.tsx | Pass (RC) |

## Business rules

| Requirement | Feature | Sprint | AC | Planned tests | Actual files | Result |
|---|---|---|---|---|---|---|
| BR-01 Server-side totals | F-04 | 1 | AC-12, AC-13 | TEST-U01, TEST-O02, TEST-O03 | order-rules.test.ts, orders.api.test.ts | Pass (RC) |
| BR-02 Price snapshot | F-04, F-09, F-12 | 1 · 2 · 3 | AC-14, AC-71, AC-111 | TEST-O04, TEST-MM02, TEST-SS02 | orders.api.test.ts, menu-management.api.test.ts, sales.api.test.ts | Pass (RC) |
| BR-03 Quantity 1–5 (CR-01; 1–10 in S1) | F-04 | 1 · CR-01 | AC-15, AC-15a | TEST-U02, TEST-O05, TEST-O14, UI-02 | order-rules.test.ts, orders.api.test.ts, Menu.test.tsx | Pass (RC) |
| BR-04 1–20 lines, no duplicates | F-04 | 1 · Lab 6 | AC-16 | TEST-U03, TEST-U07, TEST-O06, TEST-O13, UI-04 | order-rules.test.ts, orders.api.test.ts, Menu.test.tsx | Pass (RC) |
| BR-05 Available items only | F-03, F-04, F-09 | 1 · 2 | AC-17, AC-73 | TEST-O07, E2E-05, TEST-MM04 | orders.api.test.ts, order-journey.spec.ts, menu-management.api.test.ts | Pass (RC) |
| BR-06 Transition matrix | F-06, F-07, F-08 | 1 · 2 | AC-32, AC-52, AC-54, AC-56, AC-61 | TEST-U10, TEST-T01, TEST-T02, TEST-T04, TEST-T05, TEST-Q03, TEST-R03, TEST-R06, TEST-L02 | order-transitions.test.ts, operator-orders.api.test.ts, reject-cancel.api.test.ts, lifecycle.api.test.ts | Pass (RC) |
| BR-07 Operator-only transitions; customer cancels own | F-02, F-06, F-07, F-08 | 1 · 2 | AC-33, AC-55, AC-63 | TEST-Q04, TEST-R05, TEST-L04, E2E-06 | operator-orders.api.test.ts, reject-cancel.api.test.ts, lifecycle.api.test.ts, order-journey.spec.ts | Pass (RC) |
| BR-08 Own orders only | F-02, F-05, F-07, F-10, F-13 | 1 · 2 · 3 | AC-22, AC-55, AC-84, AC-124 | TEST-O12, TEST-R05, TEST-P05, TEST-SF04 | orders.api.test.ts, reject-cancel.api.test.ts, payment.api.test.ts, order-search.api.test.ts | Pass (RC) |
| BR-09 One concurrent change wins | F-06, F-07, F-08 | 1 · 2 | AC-34, AC-57, AC-65 | TEST-Q05, TEST-R07, TEST-L05 | operator-orders.api.test.ts, reject-cancel.api.test.ts, lifecycle.api.test.ts | Pass (RC) |
| BR-10 Reject reason 1–300 | F-07 | 2 | AC-51 | TEST-T03, TEST-R02, UI-S01 | order-transitions.test.ts, reject-cancel.api.test.ts, OperatorQueue.test.tsx | Pass (RC) |
| BR-11 Append-only history | F-06, F-07, F-08 | 1 · 2 | AC-31, AC-50, AC-60, AC-64 | TEST-Q02, TEST-R01, TEST-L01, TEST-L05 | operator-orders.api.test.ts, reject-cancel.api.test.ts, lifecycle.api.test.ts | Pass (RC) |
| BR-12 Price 0.01–1,000 THB; new orders only | F-09 | 2 | AC-71, AC-72 | TEST-V01–V03, TEST-MM02, TEST-MM03, UI-S05 | menu-rules.test.ts, menu-management.api.test.ts, MenuManagement.test.tsx | Pass (RC) |
| BR-13 Payment rules and refund | F-10, F-07 | 2 | AC-80–AC-83 | TEST-T06, TEST-P01–P04, E2E-S04 | order-transitions.test.ts, payment.api.test.ts, sprint2.spec.ts | Pass (RC) |
| BR-14 Pickup window (chosen times, D-09) | F-11 | 3 | AC-100, AC-101, AC-105 | TEST-K01–K04, TEST-PT01, TEST-PT02 | pickup-rules.test.ts, pickup.api.test.ts | Pass (RC) |
| BR-15 Order number format | F-04 | 1 | AC-18 | TEST-U04, TEST-O08 | order-rules.test.ts, orders.api.test.ts | Pass (RC) |
| BR-16 Sales on picked-up orders only | F-12 | 3 | AC-110, AC-111 | TEST-SS01, TEST-SS02 | sales.api.test.ts | Pass (RC) |
| BR-17 Inactive accounts refused | F-01 | 1 | AC-02 | TEST-A02 | auth.api.test.ts | Pass (RC) |

## Non-functional requirements

| Requirement | Feature / responsibility | Sprint | Measure | Planned verification | Actual file / evidence | Result |
|---|---|---|---|---|---|---|
| NFR-01 401 without session | F-02 (cross-cutting) | 1 · 2 · 3 | AC-05, AC-55, AC-63, AC-75, AC-84, AC-115 | TEST-S01 + 401 cases of every Sprint 2–3 API test | security.api.test.ts and each Sprint 2–3 API file | Pass (RC) |
| NFR-02 Backend role/ownership | F-02 (cross-cutting) | 1 · 2 · 3 | AC-22, AC-33, AC-55, AC-63, AC-75, AC-84, AC-115, AC-124 | TEST-S02, TEST-O12, TEST-Q04, TEST-R05, TEST-L04, TEST-MM06, TEST-P05, TEST-SS04, TEST-SF04 | security, orders, operator-orders, reject-cancel, lifecycle, menu-management, payment, sales, order-search API tests | Pass (RC) |
| NFR-03 bcrypt hashes | F-01 | 1 | AC-06 | TEST-A05 | auth.api.test.ts | Pass (RC) |
| NFR-04 Session lifecycle | F-01 | 1 | AC-03 | TEST-A03 | auth.api.test.ts | Pass (RC) |
| NFR-05 Atomic order save | F-04 | 1 · 3 | AC-17, AC-101 | TEST-O07, TEST-PT02 (no rows on rejection) | orders.api.test.ts, pickup.api.test.ts | Pass (RC) |
| NFR-06 Safe error format | F-02 | 1 | AC-07 | TEST-S03 | security.api.test.ts | Pass (RC) |
| NFR-07 Reproducible setup, idempotent seed | F-16 | 1 | AC-40 | TEST-D01; README fresh-clone check | seed.test.ts; README | Pass (RC) (fresh-clone timing not re-measured for the RC) |
| NFR-08 Accessibility (0 serious/critical axe, keyboard) | F-14 | 3 | AC-130, AC-131 | E2E-A01, E2E-A02 | — | **Planned** (labels, roles and `aria-*` used since Sprint 1; no automated axe run yet) |
| NFR-09 Responsive 360/768/1280 px | F-14 | 2 | AC-90, AC-91 | E2E-R01 | responsive.spec.ts | Pass (RC) — failed first at 360 px, fixed |
| NFR-10 Order submission p95 < 500 ms | F-14 | 3 | AC-132 | TEST-PERF01 | — | **Planned** |
| NFR-11 Docker, env config, no secrets | F-15 | Lab 5 | Docker build, secret scan | CI "Verify production Dockerfile build"; deploy workflow | ci-docker.yml, deploy.yml, Deploy demo runs | Pass (RC) |
| NFR-12 Durable data | F-16 (local), F-15 (GCP) | 1 · Lab 5 · RC | Data survives redeploy | Live check after the RC deploy: order placed before the deploy still present | Cloud Run revision of the RC, post-deployment checks | Pass (RC) |

## Coverage summary

- **Covered and passing on the release candidate:** FR-01…FR-19, BR-01…BR-17, NFR-01…NFR-07, NFR-09, NFR-11, NFR-12.
- **Uncovered at this checkpoint (planned final verification):** **NFR-08** (axe + keyboard E2E, AC-130/131) and **NFR-10** (performance test, AC-132), both in F-14, owner and date in [sprints/sprint-3/README.md](sprints/sprint-3/README.md) (remaining-work plan). Neither is reported as done.
- **Approved baseline changes:** CR-01 (Lab 7, BR-03 1–10 → 1–5); D-09 (SRS v1.2, pickup time optional, BR-14 on chosen times); AC-30 v1.2 (queue earliest pickup first). Test revisions caused by them: TEST-U02, TEST-O05, UI-02 (CR-01); TEST-Q01 (AC-30 v1.2); TEST-O14 fixture gains `pickupAt` (F-11 migration).
- An AC counts as verified only through the tests listed in its row; an unrelated green test is never used as coverage.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Baseline matrix (Deliverable 1). |
| 1.1 | 2026-11-07 | Sprint 1 results. |
| 1.2 | 2026-11-25 | CR-01 (Lab 7). |
| 2.0 | 2026-11-27 | Deliverable 2: complete matrix with actual files and results for Sprints 1–3; NFR-08 and NFR-10 shown as planned. |
