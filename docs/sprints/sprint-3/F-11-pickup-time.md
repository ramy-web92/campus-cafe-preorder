# F-11 Pickup time

**Requirements:** FR-15, BR-14, FR-08 (queue order), D-07, D-09 · **Issue:** #57 · **Depends on:** F-04, F-06 · **Version:** 1.0

## Feature SDS
- **Choice at ordering (FR-15):** in the cart the Customer chooses **As soon as possible** (default) or **Choose a time** with a date and time.
- **Rule for a chosen time (BR-14):** it must be inside opening hours, **08:00 to 18:00 inclusive, Asia/Bangkok** (D-07), and **at least 15 minutes after submission**, compared with the server clock at the moment of submission (not the browser clock).
- **As soon as possible (D-09):** no time is sent; the server stores `pickupAt = createdAt` and `pickupAsap = true`. BR-14 does not apply to ASAP orders, so ordering keeps working at any hour as in Sprints 1–2 (the café prepares ASAP orders when it opens). This keeps every earlier behavior and test valid.
- **Queue order (FR-15, revises FR-08 "oldest first"):** the operator queue is sorted by `pickupAt`, then id. For ASAP orders `pickupAt` is the submission time, so a list of ASAP orders is still oldest first (AC-30 revised in F-06 contract v1.2).
- **Display:** order detail (both roles), My orders and the queue show "ASAP" or the pickup date/time in Bangkok time.
- **Workflow:** `validatePickupTime(raw, now)` is a pure function (unit tested with fixed clocks); `createOrder` calls it with `now = new Date()` before the transaction and stores the result with the order. The rest of F-04 (pricing, lines, history, order number) is unchanged.
- **Permissions:** unchanged (Customers create orders; Operators read the queue).

## Validation and errors
| Case | Response (422 `VALIDATION_ERROR`, `details.fields.pickupAt`) |
|---|---|
| `pickupAt` not a string or not a valid ISO-8601 date/time | "Pickup time must be a valid date and time." |
| Bangkok time before 08:00 or after 18:00 | "Pickup time must be between 08:00 and 18:00 (Bangkok time)." |
| Less than 15 minutes after now | "Pickup time must be at least 15 minutes from now." |
| `pickupAt` omitted or `null` | accepted: ASAP |

Boundaries: 08:00 and 18:00 accepted, 07:59 and 18:01 rejected; now + 15 min accepted, now + 14 min rejected. The checks run in this order: format, opening hours, lead time.

## API specification
| Method / path | Change |
|---|---|
| `POST /api/orders` | optional `"pickupAt": "2026-11-27T02:30:00.000Z"`; response order gains `"pickupAt"` and `"pickupAsap"` |
| `GET /api/orders`, `GET /api/orders/:id` | every order gains `pickupAt`, `pickupAsap` |
| `GET /api/operator/orders` | sorted by `pickupAt` ascending, then id; rows gain `pickupAt`, `pickupAsap` |

## UI specification
- **Cart:** fieldset "Pickup" with two radio buttons, "As soon as possible" (checked) and "Choose a time". Choosing a time shows a `datetime-local` input labelled "Pickup date and time", with a hint "08:00–18:00, at least 15 minutes from now". A server field error appears under the input; the cart is kept.
- **Order detail:** line "Pickup: As soon as possible" or "Pickup: 27/11/2026 09:30".
- **Queue:** new column "Pickup" (ASAP or time), the list is earliest pickup first.

## Data specification
Migration `…_f11_pickup_time`: `Order.pickupAt TIMESTAMP(3) NOT NULL DEFAULT now()` (existing rows: set to `createdAt`), `Order.pickupAsap BOOLEAN NOT NULL DEFAULT true`, index `(status, pickupAt)` for the queue.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-100 | Given now = 10:00 Bangkok, when a Customer submits an order with pickup 10:15 or 18:00 today, then 201 is returned and `pickupAt` is stored with `pickupAsap = false`. |
| AC-101 | Given now = 10:00 Bangkok, pickup 10:14, 07:59 tomorrow and 18:01 today are rejected with 422 and the matching field message; no order, line or history row is stored. |
| AC-102 | Given an order with no `pickupAt`, then it is stored as ASAP (`pickupAsap = true`, `pickupAt = createdAt`) at any hour. |
| AC-103 | Given Submitted orders with pickup times 11:00, ASAP (submitted 09:00) and 10:00, when an Operator opens the queue, then they are listed 09:00 (ASAP), 10:00, 11:00. |
| AC-104 | The order detail, My orders and the queue show the pickup time or ASAP; orders stored before F-11 read as ASAP with their submission time. |
| AC-105 | An invalid `pickupAt` string ("tomorrow", "2026-13-01T10:00") is rejected with 422 "Pickup time must be a valid date and time.". |

## Definition of Done (feature-specific)
- AC-100–AC-105 covered by TEST-K01–K04 (unit, fixed clock), TEST-PT01–PT04 (API), UI-K01 and E2E-K01 in [sts.md](sts.md), all passing; RED before GREEN; migration applied on GCP.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | Initial contract, written before implementation |
