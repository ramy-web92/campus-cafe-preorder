# F-12 Sales summary and operator dashboard

**Requirements:** FR-16, FR-19, BR-16, BR-02, D-07 · **Issue:** #58 · **Depends on:** F-08 (Picked-up status), F-10 · **Version:** 1.0

## Feature SDS
- **Sales summary (FR-16):** an Operator chooses a day (default today, Bangkok) and sees: number of completed orders, revenue, and the top 5 items by quantity.
- **Rule (BR-16):** only orders whose status is `PICKED_UP` count. Revenue is the sum of the stored order totals (snapshot prices, BR-02), not current menu prices. Cancelled and Rejected orders are excluded even if they were paid and refunded. The day is the Bangkok calendar day of the **pickup** status change (the time the order was completed).
- **Dashboard (FR-19):** counts of today's orders per status (by submission day, Bangkok) shown as cards; each card links to the queue filtered by that status (F-08 filter).
- **Workflow:** `GET /api/operator/sales?date=` runs one aggregate query on `OrderStatusChange` (toStatus = PICKED_UP, createdAt in the Bangkok day) joined to `Order` and `OrderLine`; `GET /api/operator/dashboard` runs a `groupBy(status)` on today's orders. Read-only; no new table.
- **Permissions:** Operators only (Customer 403, anonymous 401).

## Validation and errors
| Case | Response |
|---|---|
| `date` not a real `YYYY-MM-DD` date | `422 VALIDATION_ERROR` `fields.date` "Use a date in the format YYYY-MM-DD." |
| A day with no picked-up order | `200` with `completedOrders: 0`, `revenueSatang: 0`, `topItems: []` |

## API specification
| Method / path | Auth | Success |
|---|---|---|
| `GET /api/operator/sales?date=2026-11-27` | Operator | `200 { "date": "2026-11-27", "completedOrders": 12, "revenueSatang": 98500, "topItems": [ { "menuItemId", "itemName", "quantity", "revenueSatang" } ] }` |
| `GET /api/operator/dashboard` | Operator | `200 { "date": "2026-11-27", "counts": { "SUBMITTED": 3, "ACCEPTED": 1, …, "CANCELLED": 0 } }` (all 7 keys) |

## UI specification
- New operator tab **Sales**: date input (default today), three figures (Completed orders, Revenue in THB, Average order), and a "Top items" table (item, quantity, revenue). Empty state "No completed orders on this day."
- **Dashboard** at the top of the Order queue screen: 7 status cards with count and label; activating a card sets the queue filter to that status. Cards are buttons (keyboard accessible).

## Data specification
No migration. Uses `Order`, `OrderLine` (snapshots) and `OrderStatusChange` (pickup time).

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-110 | Given on one day two picked-up orders (65.00 and 110.00 THB), one cancelled paid order and one Ready order, when an Operator opens the summary for that day, then completed orders = 2 and revenue = 175.00 THB. |
| AC-111 | Given an item whose price changed after an order was picked up, the summary uses the stored line totals (snapshot), not the new price. |
| AC-112 | Top items are ordered by quantity (ties by name), at most 5, with quantity and revenue per item from picked-up orders only. |
| AC-113 | A day with no picked-up order returns zeros and an empty list; an invalid date returns 422. |
| AC-114 | The dashboard returns today's count for each of the 7 statuses; the counts equal the database counts; activating a card filters the queue. |
| AC-115 | Customers get 403 and anonymous users 401 on both endpoints. |

## Definition of Done (feature-specific)
- AC-110–AC-115 covered by TEST-SS01–SS05 (API), UI-SS01 and E2E-SS01 in [sts.md](sts.md), all passing; RED before GREEN.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | Initial contract, written before implementation |
