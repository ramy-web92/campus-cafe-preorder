# F-06 Operator order queue and accept

**Requirements:** FR-08, FR-09, BR-06 (accept), BR-07, BR-09, BR-11 · **Issue:** #7 · **Depends on:** F-02, F-04 · **Version:** 1.0

## Feature SDS
- **Queue:** Operators list orders filtered by status (default `SUBMITTED`), oldest first (first come, first served), with customer name, number, item count, total and age.
- **Operator detail:** same detail as F-05 plus customer name, for any order of the café.
- **Accept:** allowed only when the current status is `SUBMITTED` (transition table in `orderTransitions.ts`, Sprint 1 part of BR-06). In a transaction the service runs a **conditional update** `UPDATE … SET status='ACCEPTED', acceptedAt=now(), version=version+1 WHERE id=? AND status='SUBMITTED'`; if no row is updated, the order was already changed and the request returns 409. On success it appends a history entry `SUBMITTED → ACCEPTED` with the operator as actor (BR-11). This makes two simultaneous accepts produce exactly one success (BR-09).
- **Permissions:** only Operators (Customers → 403, anonymous → 401).

## API specification
| Method / path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/operator/orders?status=SUBMITTED&page=1` | Operator | — | `200 { "orders": [ { "id", "orderNumber", "customerName", "status", "totalSatang", "itemCount", "createdAt" } ], "pagination": {…} }` | 401, 403, 422 (unknown status) |
| `GET /api/operator/orders/:id` | Operator | — | `200 { "order": { …detail…, "customer": { "id", "name" } } }` | 401, 403, 404 |
| `POST /api/operator/orders/:id/accept` | Operator | — | `200 { "order": { …, "status": "ACCEPTED", "acceptedAt": "…" } }` | 401, 403, 404, `409 INVALID_TRANSITION` "Only submitted orders can be accepted. This order is ACCEPTED." |

## UI specification — Order queue (Operator)
- Status filter (Submitted by default), list oldest first with number, customer, items, total, time since submission and an **Accept** button.
- Accept disables the button while running; on 200 the row shows "Accepted" and leaves the Submitted list; on 409 a message explains that the order was already handled and the list reloads.
- Clicking a row opens the operator order detail. Empty state: "No submitted orders right now."

## Data specification
Uses `Order.status`, `acceptedAt`, `version` and `OrderStatusChange` (F-16). No new migration.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-30 | Given submitted and accepted orders, when an Operator opens the queue, then only Submitted orders are listed, oldest first; with `status=ACCEPTED` only accepted ones are listed. |
| AC-31 | Given a Submitted order, when an Operator accepts it, then 200 is returned, the stored status is `ACCEPTED` with `acceptedAt`, and one history entry `SUBMITTED → ACCEPTED` with the operator as actor is stored. |
| AC-32 | Given an order that is already Accepted, when an Operator accepts it again, then 409 `INVALID_TRANSITION` is returned and nothing changes. |
| AC-33 | A Customer calling the accept or queue endpoints receives 403; an anonymous request receives 401; the order is unchanged. |
| AC-34 | Given one Submitted order, when two accept requests run at the same time, then exactly one returns 200, the other 409, and only one history entry is stored. |
| AC-35 | Given an order accepted by an Operator, when its Customer opens the order detail, then the status is Accepted and the history shows the change. |

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Initial contract |
