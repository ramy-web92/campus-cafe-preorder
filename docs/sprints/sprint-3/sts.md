# Sprint 3 — Software Test Specification (STS)

> Version 1.1 — test design recorded **before** implementation (v1.0, Issues #57–#60). Results filled from the CI run of the release candidate `v0.3.0-rc1`. "Planned" = not written or not run yet (F-14 accessibility and performance), never counted as passed.
> Levels and test database as in Sprint 1 and 2. Every Sprint 1 and Sprint 2 test stays in the regression suite.
> Time-dependent rules (BR-14) are tested with a **fixed clock** at unit level; API tests compute a valid pickup time from the real clock so they pass at any hour.

## F-11 Pickup time

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-K01 | AC-100 | Unit | now = 2026-11-26 10:00 Bangkok; pickup 10:15, 18:00, 08:00 tomorrow | `validatePickupTime(raw, now)` | valid, `asap: false`, same instant returned | server/tests/unit/pickup-rules.test.ts | Pass |
| TEST-K02 | AC-101 | Unit | same now; pickup 10:14, 18:01 today, 07:59 tomorrow | validate | lead-time error; hours error; hours error | pickup-rules.test.ts | Pass |
| TEST-K03 | AC-102, AC-105 | Unit | `undefined`, `null`; "tomorrow", "2026-13-01T10:00", 42 | validate | ASAP for the first two; format error for the others | pickup-rules.test.ts | Pass |
| TEST-K04 | AC-101 | Unit | now = 17:50 Bangkok; pickup 18:00 (10 min later) | validate | lead-time error (hours pass, lead time fails) | pickup-rules.test.ts | Pass |
| TEST-PT01 | AC-100, AC-104 | API | alice; next valid slot computed from the clock | `POST /api/orders` with `pickupAt` | 201, `pickupAsap: false`, DB `pickupAt` equals the slot; detail and list return it | server/tests/api/pickup.api.test.ts | Pass |
| TEST-PT02 | AC-101, AC-105 | API | pickup 07:59 Bangkok tomorrow; 18:01 tomorrow; now + 5 min; "tomorrow" | submit each | 422 `fields.pickupAt` with the right message; order, line and history counts unchanged | pickup.api.test.ts | Pass |
| TEST-PT03 | AC-102, AC-104 | API | no `pickupAt` | submit | 201, `pickupAsap: true`, `pickupAt` = `createdAt`; seeded orders are ASAP | pickup.api.test.ts | Pass |
| TEST-PT04 | AC-103 | API | three Submitted orders inserted with pickup 11:00, ASAP 09:00, 10:00 on a future day | operator queue | the three appear in the order 09:00, 10:00, 11:00 | pickup.api.test.ts | Pass |
| UI-K01 | AC-100 | UI | Menu with cart (mocked) | choose "Choose a time", fill the date/time, place order | `ordersApi.create` called with an ISO `pickupAt`; ASAP sends none | client/tests/Menu.test.tsx | Pass |
| E2E-K01 | AC-100, AC-104 | E2E | alice | order with a chosen time in the browser; olivia opens the queue | the detail and the queue show the pickup time | e2e/sprint3.spec.ts | Pass |

## F-13 Order history search and filter

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-F01 | AC-121 | Unit | `from=2026-11-25`, `to=2026-11-25` | `parseOrderFilters` | `createdAt >= 2026-11-24T17:00Z` and `< 2026-11-25T17:00Z` | server/tests/unit/order-filters.test.ts | Pass |
| TEST-F02 | AC-123 | Unit | `status=DELIVERED`, `from=2026-02-30`, `to=25/11/2026`, from > to, empty values | parse | field errors; empty values = no filter | order-filters.test.ts | Pass |
| TEST-SF01 | AC-120 | API | alice with cancelled and other orders | `GET /api/orders?status=CANCELLED` | only CANCELLED, newest first, total = DB count for alice | server/tests/api/order-search.api.test.ts | Pass |
| TEST-SF02 | AC-121, AC-122 | API | alice orders with `createdAt` set to 24/11 12:00, 25/11 23:30 and 26/11 00:10 Bangkok | filter by 25/11; status + dates; from only; to only | exactly the expected orders each time | order-search.api.test.ts | Pass |
| TEST-SF03 | AC-123 | API | — | invalid status and dates | 422 with field messages | order-search.api.test.ts | Pass |
| TEST-SF04 | AC-124 | API | bob; olivia | filters that match alice's orders; operator call | bob never gets alice's orders; olivia 403 | order-search.api.test.ts | Pass |
| UI-F01 | AC-120, AC-123 | UI | My orders (mocked) | choose status Cancelled + Apply; Clear | `list` called with the filters, then without; empty state "No orders match these filters." | client/tests/MyOrders.test.tsx | Pass |

## F-12 Sales summary and dashboard

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-SS01 | AC-110 | API | 2 picked-up orders (6500, 11000), 1 cancelled paid, 1 Ready on one day | `GET /api/operator/sales?date=` | completedOrders 2, revenueSatang 17500 | server/tests/api/sales.api.test.ts | Pass |
| TEST-SS02 | AC-111 | API | price changed after pickup | summary | uses line snapshots | sales.api.test.ts | Pass |
| TEST-SS03 | AC-112 | API | 7 items sold | summary | top 5 by quantity, ties by name | sales.api.test.ts | Pass |
| TEST-SS04 | AC-113, AC-115 | API | empty day; `date=2026-02-30`; alice; no cookie | summary | zeros; 422; 403; 401 | sales.api.test.ts | Pass |
| TEST-SS05 | AC-114 | API | today's orders in several statuses | `GET /api/operator/dashboard` | 7 keys, counts = DB counts | sales.api.test.ts | Pass |
| UI-SS01 | AC-114 | UI | dashboard (mocked) | click "Ready" card | queue filter set to READY | client/tests/OperatorQueue.test.tsx | Pass |
| E2E-SS01 | AC-110 | E2E | an order picked up in the browser | olivia opens Sales | completed orders and revenue include it | e2e/sprint3.spec.ts | Pass |

## F-14 Accessibility and performance (planned)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| E2E-A01 | AC-130 | E2E | seeded data, orders in lists | axe on each main screen | 0 serious/critical violations | e2e/accessibility.spec.ts | Planned |
| E2E-A02 | AC-131 | E2E | alice, olivia | keyboard-only order and accept | journey completes without mouse events | e2e/accessibility.spec.ts | Planned |
| TEST-PERF01 | AC-132 | API (perf) | seeded test DB | 100 sequential `POST /api/orders` | p95 < 500 ms; p50/p95 printed | server/tests/perf/order-submit.perf.test.ts | Planned |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | Test design for F-11, F-12, F-13 and F-14 (accessibility, performance), before implementation |
| 1.1 | 2026-11-27 | Results: F-11, F-12, F-13 Pass on the release candidate; F-14 (a11y, performance) still Planned. |
