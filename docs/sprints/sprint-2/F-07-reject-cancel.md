# F-07 Reject and cancel

**Requirements:** FR-10, FR-12, BR-06, BR-07, BR-10, BR-11, BR-13 (refund part, see F-10) · **Issue:** #51 · **Depends on:** F-06 · **Version:** 1.0

## Feature SDS
- **Operator reject:** an Operator rejects a `SUBMITTED` order with a reason (BR-10). The order becomes `REJECTED`, which is final.
- **Customer cancel:** a Customer cancels **their own** order while it is still `SUBMITTED` (FR-12). The order becomes `CANCELLED`, which is final. No reason is required from the customer.
- **Operator cancel:** an Operator cancels an `ACCEPTED` order with a reason, for example when an item runs out after acceptance (BR-06 allows Accepted → Cancelled). A customer cannot cancel an accepted order: the kitchen has already started planning it.
- **Workflow (all three):** in one transaction the service checks the BR-06 matrix, then runs a **conditional update** `UPDATE … SET status=?, version=version+1 WHERE id=? AND status=<expected>`; 0 rows updated means the order changed in between → 409. On success it appends one history entry (actor, from, to, reason) (BR-11). If the order was `PAID`, the same transaction sets the payment status to `REFUNDED` (BR-13, implemented with F-10).
- **Shared code:** `transitionOrder(orderId, expected, to, actorId, reason?)` in `orderTransitions`/`operatorService` replaces the Sprint 1 accept-only code so that accept, reject, cancel and the F-08 lifecycle use the same rule check and the same conditional update.
- **Permissions:** reject and operator cancel: Operators only (Customer 403, anonymous 401). Customer cancel: Customers only, and only the owner; another customer's order returns 404 like F-05 (BR-08).

## Validation and errors
| Case | Response |
|---|---|
| Reason missing, not a string, empty after trimming, or longer than 300 characters (reject, operator cancel) | `422 VALIDATION_ERROR` "Please give a reason." with `details.fields.reason` = "Reason must be 1 to 300 characters." |
| Reject an order that is not `SUBMITTED` | `409 INVALID_TRANSITION` "Only submitted orders can be rejected. This order is ACCEPTED." |
| Customer cancels an order that is not `SUBMITTED` | `409 INVALID_TRANSITION` "This order can no longer be cancelled. It is ACCEPTED." |
| Operator cancels an order that is not `ACCEPTED` | `409 INVALID_TRANSITION` "Only accepted orders can be cancelled by the café. This order is SUBMITTED." |
| Two requests change the same order at the same time | exactly one succeeds; the other gets `409 INVALID_TRANSITION` "This order was just handled by someone else." |
| Unknown id; customer cancels another customer's order | `404 NOT_FOUND` "Order not found." |

## API specification
| Method / path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/operator/orders/:id/reject` | Operator | `{ "reason": "Sold out of croissants" }` | `200 { "order": { …detail…, "status": "REJECTED" } }` | 401, 403, 404, 409, 422 |
| `POST /api/operator/orders/:id/cancel` | Operator | `{ "reason": "Oven broken" }` | `200 { "order": { …, "status": "CANCELLED" } }` | 401, 403, 404, 409, 422 |
| `POST /api/orders/:id/cancel` | Customer (owner) | — | `200 { "order": { …, "status": "CANCELLED" } }` | 401, 403 (Operator), 404, 409 |

The order detail already returns `history[].reason`; no new field.

## UI specification
- **Operator queue / detail:** a Submitted order shows **Accept** and **Reject**; an Accepted order shows **Cancel order**. Reject and Cancel open an inline form with a required "Reason" text field (max 300, counter) and Confirm / Back buttons. Confirm is disabled while the request runs. 422 shows the field error under the input; 409 shows "This order was already handled." and reloads.
- **Customer order detail:** a Submitted order shows **Cancel order** with a confirmation step ("Cancel this order? This cannot be undone."). After success the status badge shows Cancelled. 409 shows "This order can no longer be cancelled." and reloads.
- **History (both roles):** each entry shows the reason when there is one, e.g. "Submitted → Rejected by Olivia Operator — Reason: Sold out of croissants".

## Data specification
No migration. Uses `Order.status`, `Order.version` and `OrderStatusChange.reason VARCHAR(300)` from the Sprint 1 schema.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-50 | Given a Submitted order, when an Operator rejects it with a reason, then 200 is returned, the stored status is `REJECTED` and one history entry `SUBMITTED → REJECTED` with the operator and the reason is stored. |
| AC-51 | Given a Submitted order, when an Operator rejects it with no reason, an empty/blank reason or a 301-character reason, then 422 is returned and the order and history are unchanged; a 300-character reason is accepted. |
| AC-52 | Given an order that is Accepted, Rejected or Cancelled, when an Operator rejects it, then 409 `INVALID_TRANSITION` is returned and nothing changes. |
| AC-53 | Given Alice's Submitted order, when Alice cancels it, then 200 is returned, the status is `CANCELLED` and one history entry `SUBMITTED → CANCELLED` with Alice as actor is stored. |
| AC-54 | Given Alice's Accepted order, when Alice cancels it, then 409 is returned and nothing changes. |
| AC-55 | Given Alice's order, when Bob cancels it, then 404 is returned and the order is unchanged; an Operator calling the customer cancel endpoint gets 403; a Customer calling reject or operator cancel gets 403; anonymous calls get 401. |
| AC-56 | Given an Accepted order, when an Operator cancels it with a reason, then the status is `CANCELLED` with a history entry `ACCEPTED → CANCELLED` and the reason; the operator cannot cancel a Submitted order (409, use Reject). |
| AC-57 | Given one Submitted order, when a reject and an accept run at the same time, then exactly one returns 200, the other 409, and exactly one new history entry is stored. |
| AC-58 | Given a rejected order, when its Customer opens the detail, then the status is Rejected and the history shows the operator's reason. |

## Definition of Done (feature-specific, in addition to the Sprint 2 DoD)
- AC-50–AC-58 covered by TEST-T01–T04 (unit) and TEST-R01–R08 (API), UI-S01, UI-S02 and E2E-S01 in [sts.md](sts.md), all passing.
- The RED commit of the transition matrix and API tests is pushed and fails in CI before the implementation commit.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Initial contract, written before implementation |
