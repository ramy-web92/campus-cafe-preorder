# F-10 Simulated payment

**Requirements:** FR-14, BR-13, BR-08 · **Issue:** #54 · **Depends on:** F-07 (refund on cancel/reject) · **Version:** 1.0

## Feature SDS
- **Payment is simulated** (no card data, no payment provider). A Customer presses **Pay now** on their own order; the order's payment status goes from `UNPAID` to `PAID` and `paidAt` is stored (FR-14).
- **When payment is allowed (BR-13):** only while the order status is `SUBMITTED`, `ACCEPTED`, `PREPARING` or `READY`, and only once. A `CANCELLED`, `REJECTED` or `PICKED_UP` order cannot be paid online (a picked-up order is paid at the counter).
- **Refund (BR-13):** when a `PAID` order is cancelled (by the customer or the café) or rejected, the same transaction sets the payment status to `REFUNDED`. An `UNPAID` order that is cancelled stays `UNPAID`. `REFUNDED` is final.
- **Workflow:** conditional update `UPDATE … SET paymentStatus='PAID', paidAt=now() WHERE id=? AND customerId=? AND paymentStatus='UNPAID' AND status IN (…)`. If no row matches, the service reads the order to return the right error (404 / 409). A payment and a cancel at the same time are serialized by the row lock: either the payment lands first and the cancel refunds it, or the cancel lands first and the payment gets 409.
- **Order status and payment status are independent:** paying does not accept the order, and the operator can accept unpaid orders (pay at the counter). Payment changes are not status changes, so they are not added to the status history; `paidAt` records the time.
- **Permissions:** Customer owner only. Another customer's order → 404 (BR-08); Operator → 403; anonymous → 401. Operators see the payment status in the queue and order detail but cannot change it.

## Validation and errors
| Case | Response |
|---|---|
| Order already `PAID` or `REFUNDED` | `409 PAYMENT_NOT_ALLOWED` "This order is already paid." / "This order was refunded." |
| Order `CANCELLED`, `REJECTED` or `PICKED_UP` | `409 PAYMENT_NOT_ALLOWED` "A CANCELLED order cannot be paid." |
| Unknown id or not the owner | `404 NOT_FOUND` |

## API specification
| Method / path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/orders/:id/pay` | Customer (owner) | — | `200 { "order": { …detail…, "paymentStatus": "PAID", "paidAt": "…" } }` | 401, 403, 404, 409 |
| `GET /api/orders`, `GET /api/orders/:id`, `GET /api/operator/orders`, `GET /api/operator/orders/:id` | as before | — | every order object gains `"paymentStatus": "UNPAID" \| "PAID" \| "REFUNDED"`; details also `"paidAt"` | as before |

## UI specification
- **Customer order detail:** a payment line "Payment: Unpaid / Paid on 25/11/2026 14:10 / Refunded". When payment is allowed, a **Pay now (simulated)** button; it shows "Paying…" while running and the badge changes to Paid on success. 409 shows the server message and reloads.
- **My orders and operator queue:** a small payment badge next to the status (text, not colour only).
- After a cancel or reject of a paid order, the detail shows "Refunded".

## Data specification
Migration `2026112..._payment`:
- new enum `PaymentStatus` (`UNPAID`, `PAID`, `REFUNDED`);
- `Order.paymentStatus PaymentStatus NOT NULL DEFAULT 'UNPAID'` (existing orders become `UNPAID`, which is true: Sprint 1 had no payment);
- `Order.paidAt TIMESTAMP NULL`.
No change to order lines or history.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-80 | Given Alice's Submitted unpaid order, when she pays, then 200 is returned and the stored payment status is `PAID` with `paidAt`; the order status is still Submitted. |
| AC-81 | Given Alice's orders that are Accepted, Preparing and Ready and unpaid, when she pays, then each payment succeeds. |
| AC-82 | Given a Paid order, when Alice pays again, then 409 is returned and `paidAt` is unchanged; given Cancelled, Rejected or Picked-up unpaid orders, payment returns 409 and they stay `UNPAID`. |
| AC-83 | Given a Paid Submitted order, when Alice cancels it, then the status is Cancelled and the payment status is `REFUNDED`; the same happens when an Operator rejects a paid order or cancels a paid accepted order; an unpaid cancelled order stays `UNPAID`. |
| AC-84 | Given Alice's order, when Bob pays it, then 404 is returned and it stays unpaid; an Operator calling pay gets 403; anonymous gets 401. |
| AC-85 | Order list, detail and operator queue return `paymentStatus`; seeded and Sprint 1 orders read as `UNPAID` after the migration. |

## Definition of Done (feature-specific)
- AC-80–AC-85 covered by TEST-P01–P06 (API), TEST-T06 (unit), UI-S07 and E2E-S04 in [sts.md](sts.md), all passing; RED before GREEN in CI; migration applied by the deploy script on GCP.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Initial contract, written before implementation |
