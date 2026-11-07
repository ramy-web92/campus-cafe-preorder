# Sprint 1 — Software Test Specification (STS)

> Version 1.1 — test design recorded before implementation (v1.0, PR #10); results filled from the release run (v1.1). The **Result** column is filled from the release run on `main` (tag `v0.1.0`).
> Levels: **Unit** (pure logic) · **API** (HTTP + real PostgreSQL test database) · **UI** (React component, API mocked) · **E2E** (Playwright, browser + API + database).
> Test database: `cafe_test`, reset and seeded before the suite (`npm test` runs `prisma migrate reset --force` on the test URL).

## Authentication and access control (F-01, F-02)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-A01 | AC-01 | API | Seeded active customer alice | `POST /api/auth/login` with correct password | 200, body has id/name/email/role, no `passwordHash`; `Set-Cookie` with `HttpOnly` | server/tests/api/auth.api.test.ts || Pass |
| TEST-A02 | AC-02 | API | Wrong password; unknown e-mail; inactive operator oscar | Login three times | Each 401 `INVALID_CREDENTIALS`, identical message, no session cookie | auth.api.test.ts || Pass |
| TEST-A03 | AC-03 | API | Logged-in agent | `POST /api/auth/logout`, then `GET /api/auth/me` with the old cookie | 204, then 401 | auth.api.test.ts || Pass |
| TEST-A04 | AC-04 | API | Logged-in agent / no cookie | `GET /api/auth/me` | 200 profile / 401 | auth.api.test.ts || Pass |
| TEST-A05 | AC-06 | API/DB | Seeded users | Read `passwordHash` from the database | Starts with `$2`, cost ≥ 10, `bcrypt.compare(demo password)` true; login/me responses contain no hash | auth.api.test.ts || Pass |
| TEST-S01 | AC-05 | API | No cookie | Call `GET /api/menu`, `POST /api/orders`, `GET /api/orders`, `GET /api/orders/1`, `GET /api/operator/orders`, `POST /api/operator/orders/1/accept` | Every response 401 `UNAUTHENTICATED`; body has only `error` | server/tests/api/security.api.test.ts || Pass |
| TEST-S02 | AC-19, AC-22, AC-33 | API | Logged-in customer and operator | Customer calls operator endpoints; operator calls `POST /api/orders` and `GET /api/orders` | 403 `FORBIDDEN` each; no row created or changed | security.api.test.ts || Pass |
| TEST-S03 | AC-07 | API | Malformed JSON; route that throws (test-only error route) | Send requests | 400 / 500 with standard error body; 500 body has a generic message and no stack trace | security.api.test.ts || Pass |

## Menu and place order (F-03, F-04)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-M01 | AC-10 | API | Seeded menu with 2 sold-out items | `GET /api/menu` as customer | 200, categories in order, every seeded item present, sold-out items `isAvailable: false` | server/tests/api/menu.api.test.ts || Pass |
| TEST-U01 | AC-12 | Unit | Lines with prices 6500 × 2 and 4500 × 1 | `priceOrder(lines, items)` | line totals 13000 and 4500, total 17500 | server/tests/unit/order-rules.test.ts || Pass |
| TEST-U02 | AC-15 | Unit | Quantities 1, 10, 0, 11, -1, 1.5, "2" | `validateOrderInput` | 1 and 10 valid; others field errors on `quantity` | order-rules.test.ts || Pass |
| TEST-U03 | AC-16 | Unit | 0 lines, 20 lines, 21 lines, duplicate item | `validateOrderInput` | 20 valid; 0, 21 and duplicate rejected with field errors | order-rules.test.ts || Pass |
| TEST-U04 | AC-18 | Unit | Date 2026-11-05T18:30Z (= 06 Nov in Bangkok), sequence 4 | `formatOrderNumber` | `ORD-20261106-0004` | order-rules.test.ts || Pass |
| TEST-O01 | AC-11 | API | Customer alice, two available items | `POST /api/orders` | 201, status SUBMITTED, lines returned; rows exist in DB for alice | server/tests/api/orders.api.test.ts || Pass |
| TEST-O02 | AC-12 | API | Items priced 6500 and 4500 in DB | Submit 2 × A + 1 × B | Stored `totalSatang` 17500 and line totals 13000 / 4500 | orders.api.test.ts || Pass |
| TEST-O03 | AC-13 | API | Body adds `unitPriceSatang: 1`, `totalSatang: 1`, `status: "ACCEPTED"`, `customerId` of bob | Submit | Stored prices from DB, total 17500, status SUBMITTED, customer alice | orders.api.test.ts || Pass |
| TEST-O04 | AC-14 | API | Order submitted at 6500 | Update item price to 9900 in DB, then `GET /api/orders/:id` | Line unit price still 6500, total unchanged | orders.api.test.ts || Pass |
| TEST-O05 | AC-15 | API | Quantities 0, 11, 1.5 / 1 and 10 | Submit each | 422 with field error and order count unchanged / 201 | orders.api.test.ts || Pass |
| TEST-O06 | AC-16 | API | `lines: []`, 21 lines, duplicate item | Submit each | 422, order count unchanged | orders.api.test.ts || Pass |
| TEST-O07 | AC-17 | API | One available line + one sold-out line; one unknown id | Submit | 422 `ITEM_UNAVAILABLE` naming the item; orders, lines and history counts unchanged | orders.api.test.ts || Pass |
| TEST-O08 | AC-18 | API | Two orders on the same day | Submit twice | Numbers match the format and the second is the first + 1 | orders.api.test.ts || Pass |

## My orders (F-05)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-O10 | AC-20 | API | Seed: alice 3 orders, bob 1 | `GET /api/orders` as alice | Exactly alice's orders, newest first, none of bob's | orders.api.test.ts || Pass |
| TEST-O11 | AC-21 | API | Order just created by alice | `GET /api/orders/:id` | Lines, totals, status and history equal the creation response | orders.api.test.ts || Pass |
| TEST-O12 | AC-22 | API | Bob's order id; a non-existent id | `GET /api/orders/:id` as alice | Both 404 `NOT_FOUND`, body has no order fields | orders.api.test.ts || Pass |

## Operator queue and accept (F-06)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-U10 | AC-32 | Unit | All statuses | `canTransition(from, "ACCEPTED")` | true only from SUBMITTED | server/tests/unit/order-transitions.test.ts || Pass |
| TEST-Q01 | AC-30 | API | Seeded submitted and accepted orders | `GET /api/operator/orders` and `?status=ACCEPTED` as olivia | Only matching statuses, oldest first, with customer name | server/tests/api/operator-orders.api.test.ts || Pass |
| TEST-Q02 | AC-31, AC-35 | API | New submitted order by alice | Olivia accepts; alice reads the detail | 200 ACCEPTED with `acceptedAt`; one history row `SUBMITTED → ACCEPTED`, actor olivia; alice sees Accepted | operator-orders.api.test.ts || Pass |
| TEST-Q03 | AC-32 | API | Already accepted order | Accept again | 409 `INVALID_TRANSITION`; status, version and history unchanged | operator-orders.api.test.ts || Pass |
| TEST-Q04 | AC-33 | API | Submitted order | Alice calls accept; anonymous calls accept | 403 / 401; order still SUBMITTED | operator-orders.api.test.ts || Pass |
| TEST-Q05 | AC-34 | API | One submitted order | Two accept requests in parallel (`Promise.all`) | Status codes {200, 409}; exactly one history row for the accept | operator-orders.api.test.ts || Pass |

## Setup (F-16)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-D01 | AC-40 | API/DB | Migrated test database | Run the seed twice | Identical counts of users, categories, items, orders; 2 sold-out items; inactive operator present | server/tests/api/seed.test.ts || Pass |

## UI component tests (client)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| UI-01 | AC-10 | UI | Mocked menu with one sold-out item | Render Menu | Sold-out item shows "Sold out" text and a disabled Add button | client/tests/Menu.test.tsx || Pass |
| UI-02 | AC-15, AC-17 | UI | Cart with 2 lines; API mocked to return 422 `ITEM_UNAVAILABLE` | Click Place order | Message shown on the sold-out line; cart kept; button re-enabled; quantity stepper cannot go below 1 or above 10 | client/tests/Menu.test.tsx || Pass |
| UI-03 | AC-32 | UI | Queue with one order; API mocked 409 | Click Accept | Conflict message shown and the list reloads | client/tests/OperatorQueue.test.tsx || Pass |

## End-to-end journeys

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| E2E-01 | AC-01, AC-03, AC-04 | E2E | Seeded alice | Wrong password, then log in, log out, reload; call `/api/auth/me` before and after logout | Generic error; Menu after login; Login page after logout; API 200 then 401 | e2e/auth.spec.ts || Pass |
| E2E-02 | AC-11, AC-21 | E2E | Seeded menu | Alice adds 2 items, places the order, opens My orders and the detail | Order appears with server total and status Submitted | e2e/order-journey.spec.ts || Pass |
| E2E-03 | AC-31, AC-35 | E2E | Order from E2E-02 | Olivia logs in, accepts it; alice reopens the detail | Order leaves the Submitted queue; alice sees Accepted | e2e/order-journey.spec.ts || Pass |
| E2E-04 | AC-10 | E2E | Seeded sold-out item | Alice tries to add the sold-out item | Add button disabled and "Sold out" shown | e2e/order-journey.spec.ts || Pass |
| E2E-05 | AC-17 | E2E | Carol's cart holds Thai Tea + Espresso; Thai Tea is then set sold out in the database | Place order | "Thai Tea is sold out." on the line, cart kept, order count unchanged | e2e/order-journey.spec.ts || Pass |
| E2E-06 | AC-22, AC-33 | E2E | Alice logged in | Browser calls `/api/operator/orders` and Bob's `/api/orders/:id` | 403 and 404 from the backend | e2e/order-journey.spec.ts || Pass |

## AC → test coverage

| AC | Tests | AC | Tests |
|---|---|---|---|
| AC-01 | TEST-A01, E2E-01 | AC-16 | TEST-U03, TEST-O06 |
| AC-02 | TEST-A02 | AC-17 | TEST-O07, UI-02, E2E-05 |
| AC-03 | TEST-A03, E2E-01 | AC-18 | TEST-U04, TEST-O08 |
| AC-04 | TEST-A04, E2E-01 | AC-19 | TEST-S02 |
| AC-05 | TEST-S01 | AC-20 | TEST-O10 |
| AC-06 | TEST-A05 | AC-21 | TEST-O11, E2E-02 |
| AC-07 | TEST-S03 | AC-22 | TEST-O12, TEST-S02, E2E-06 |
| AC-10 | TEST-M01, UI-01, E2E-04 | AC-30 | TEST-Q01 |
| AC-11 | TEST-O01, E2E-02 | AC-31 | TEST-Q02, E2E-03 |
| AC-12 | TEST-U01, TEST-O02 | AC-32 | TEST-U10, TEST-Q03, UI-03 |
| AC-13 | TEST-O03 | AC-33 | TEST-Q04, TEST-S02, E2E-06 |
| AC-14 | TEST-O04 | AC-34 | TEST-Q05 |
| AC-15 | TEST-U02, TEST-O05, UI-02 | AC-35 | TEST-Q02, E2E-03 |
| | | AC-40 | TEST-D01 |

## TDD evidence
For the rule work in F-04 (BR-01, BR-03–BR-05) and F-06 (BR-09), the tests were committed first in a `test:` commit and ran **red**; the implementation followed in a `feat:` commit and the same tests ran **green**.

| Feature | Red (tests only) | Green (implementation) | PR |
|---|---|---|---|
| F-03/F-04 Place order | `1b7b6c8` — order-rules unit tests fail with "Not implemented", menu/order API tests fail with 404 | `d273644` | #13 |
| F-06 Accept | `65d94fd` — transition unit test and operator API tests fail | `7ddee00` | #16 |

## Manual checks (supplement only)
| Check | AC | How |
|---|---|---|
| MAN-01 Data survives restart | NFR-12 | Place an order, stop and restart the server and database container, reopen the order |
| MAN-02 Fresh-clone setup time | AC-40 | Follow the README on a clean folder and time it |

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Initial STS |
| 1.1 | 2026-11-07 | Result column filled from the release run; E2E-05/E2E-06 added; TDD evidence recorded |
