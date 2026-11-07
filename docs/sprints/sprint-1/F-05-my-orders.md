# F-05 My orders and order detail

**Requirements:** FR-06, FR-07, BR-08 · **Issue:** #7 · **Depends on:** F-04 · **Version:** 1.1

## Feature SDS
- **List:** returns only orders whose `customerId` is the session user, newest first, with number, created date, total, status and number of items. Paginated: 10 per page.
- **Detail:** returns one order with its lines (snapshots), total, note, status and the status history (oldest first). The query is filtered by `id` **and** `customerId`; another customer's order, or a missing id, returns the same 404 (BR-08). Operators use the operator endpoints (F-06), so these routes are Customer-only.

## API specification
| Method / path | Auth | Success | Errors |
|---|---|---|---|
| `GET /api/orders?page=1` | Customer | `200 { "orders": [ { "id", "orderNumber", "status", "totalSatang", "itemCount", "createdAt" } ], "pagination": { "page", "pageSize": 10, "totalItems", "totalPages" } }` | 401, 403 (Operator) |
| `GET /api/orders/:id` | Customer (own) | `200 { "order": { …as in POST /api/orders…, "history": [ { "fromStatus": null, "toStatus": "SUBMITTED", "actorName": "Alice", "createdAt" } ] } }` | 401, 403 (Operator), 404 `NOT_FOUND` (missing or not owned) |

## UI specification
- **My orders:** table on desktop, cards on mobile: order number, date/time, item count, total, status badge (text + icon). Rows open the detail. Empty state: "No orders yet" with a link to the menu.
- **Order detail:** order number, status badge, date, lines (item, unit price, quantity, line total), total, note and history list. Not-found state for 404: "This order was not found." with a link back.

## Data specification
No change.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-20 | Given Alice with 3 orders and Bob with 1, when Alice lists her orders, then she gets exactly her 3 orders, newest first, and none of Bob's. |
| AC-21 | Given Alice's order, when she opens its detail, then the lines, totals, status and history match what was stored at submission. |
| AC-22 | Given Bob's order id, when Alice requests it, then 404 is returned with no order data; an Operator calling `GET /api/orders` receives 403. |

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Initial contract |
| 1.1 | 2026-11-07 | Corrected the Issue number (the baseline PR took #1, so issues are #2–#9). No behavior change. |
