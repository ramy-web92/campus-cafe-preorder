# F-08 Fulfilment lifecycle and history view

**Requirements:** FR-11, FR-18, BR-06, BR-07, BR-09, BR-11 · **Issue:** #52 · **Depends on:** F-06, F-07 (shared transition code) · **Version:** 1.0

## Feature SDS
- **Lifecycle:** an Operator moves an order forward one step at a time: `ACCEPTED → PREPARING → READY → PICKED_UP` (FR-11). `PICKED_UP` is final. Skipping a step (Accepted → Ready) or going back (Ready → Preparing) is rejected (BR-06).
- **Workflow:** same `transitionOrder` as F-07: BR-06 matrix check, conditional update on the expected current status (`version + 1`), one history entry with the operator as actor (BR-11). Two operators pressing the same button at the same time produce one success and one 409 (BR-09 extended to every transition).
- **History view (FR-18):** both roles see the append-only history of an order, oldest first: from → to, actor name, date/time and reason. The API has no endpoint that edits or deletes history; the service only ever inserts.
- **Queue:** the status filter now offers every status (Submitted, Accepted, Preparing, Ready, Picked up, Rejected, Cancelled); each row shows the one next action allowed for its status.
- **Permissions:** Operators only (Customer 403, anonymous 401). Customers read the history through their own order detail (F-05, ownership unchanged).

## Validation and errors
| Case | Response |
|---|---|
| `status` missing or not one of `PREPARING`, `READY`, `PICKED_UP` | `422 VALIDATION_ERROR` "Unknown target status." with `details.fields.status` = "Use one of PREPARING, READY, PICKED_UP." (accept, reject and cancel have their own endpoints) |
| Target not allowed from the current status | `409 INVALID_TRANSITION` "An order that is ACCEPTED cannot move to READY." |
| Concurrent change | `409 INVALID_TRANSITION` "This order was just handled by someone else." |
| Unknown id | `404 NOT_FOUND` |

## API specification
| Method / path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/operator/orders/:id/status` | Operator | `{ "status": "PREPARING" }` | `200 { "order": { …detail…, "status": "PREPARING" } }` | 401, 403, 404, 409, 422 |
| `GET /api/operator/orders?status=READY` | Operator | — | as F-06; every status value is now accepted by the filter | 401, 403, 422 |

`GET /api/orders/:id` and `GET /api/operator/orders/:id` keep returning `history: [ { fromStatus, toStatus, actorName, reason, createdAt } ]`.

## UI specification
- **Queue:** filter with all statuses. Row action by status: Submitted → Accept / Reject (F-06/F-07); Accepted → **Start preparing** / Cancel order; Preparing → **Mark ready**; Ready → **Picked up**; final statuses → no action. Buttons are disabled while a request runs; 409 shows "This order was already handled." and reloads the list.
- **Operator order detail:** same action buttons under the order, so an operator can work from the detail page.
- **History (both roles):** ordered list "Accepted → Preparing by Olivia Operator, 25/11/2026 14:02" with the reason when present. The customer sees the same list on their order detail, so they know when the order is ready.

## Data specification
No migration. Uses `Order.status`, `version` and `OrderStatusChange`.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-60 | Given an Accepted order, when an Operator moves it to Preparing, then Ready, then Picked up, then each call returns 200 with the new status and three history entries are added in that order with the operator as actor. |
| AC-61 | Given an Accepted order, when an Operator asks for Ready or Picked up directly, then 409 is returned; given a Ready order, Preparing returns 409; given a Picked-up order, any target returns 409; nothing changes in each case. |
| AC-62 | Given an order, when an Operator sends `status` `ACCEPTED`, `CANCELLED`, `DELIVERED` or no status, then 422 is returned and nothing changes. |
| AC-63 | A Customer calling the status endpoint gets 403 and an anonymous call gets 401; the order is unchanged. |
| AC-64 | Given an order that went through the full lifecycle, when its Customer opens the detail, then the history lists Submitted, Accepted, Preparing, Ready and Picked up in order with actor names and times; no API changes or deletes an existing history entry. |
| AC-65 | Given one Preparing order, when two "Ready" requests run at the same time, then exactly one returns 200, the other 409, and one history entry is added. |
| AC-66 | Given orders in several statuses, when an Operator filters the queue by Preparing or Ready, then only orders in that status are listed. |

## Definition of Done (feature-specific)
- AC-60–AC-66 covered by TEST-T05, TEST-L01–L06, UI-S03, UI-S04 and E2E-S02 in [sts.md](sts.md), all passing; RED before GREEN in CI.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Initial contract, written before implementation |
