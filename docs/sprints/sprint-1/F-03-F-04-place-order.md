# F-03 Menu browsing · F-04 Place order

**Requirements:** FR-04, FR-05, BR-01, BR-02, BR-03, BR-04, BR-05, BR-15, NFR-05 · **Issue:** #6 · **Depends on:** F-01, F-02, F-16 · **Version:** 1.1

## Feature SDS
- **Menu (F-03):** returns all categories (by `sortOrder`) with their items, including sold-out items flagged `isAvailable: false` so the customer understands why they cannot be added.
- **Place order (F-04):** a Customer sends only `menuItemId` + `quantity` for each line and an optional note. In **one database transaction** the order service:
  1. validates the shape: 1–20 lines, integer quantity 1–10, no duplicate `menuItemId`, note ≤ 200 characters (BR-03, BR-04);
  2. loads the referenced items and rejects the whole order if one is unknown or sold out (BR-05);
  3. computes `lineTotal = unitPrice × quantity` and `total = Σ lineTotal` from the database prices (BR-01);
  4. stores the order (status `SUBMITTED`, customer = session user) and its lines with snapshots of item name and unit price (BR-02);
  5. writes the first history entry (`null → SUBMITTED`, actor = customer) (BR-11);
  6. assigns the order number `ORD-YYYYMMDD-NNNN`, the next number of the Bangkok day (BR-15).
  Any failure rolls back the transaction, so no partial order or line remains (NFR-05).
- **Ignored input:** `unitPrice`, `lineTotal`, `total`, `status`, `customerId` and `orderNumber` in the request are stripped by the schema and never used (BR-01).
- **Permissions:** only Customers can place orders (Operators → 403); menu readable by both roles.

## API specification
`GET /api/menu` — Customer, Operator
```json
200 { "categories": [ { "id": 1, "name": "Coffee", "items": [
  { "id": 3, "name": "Iced Latte", "description": "Double shot, fresh milk", "priceSatang": 6500, "isAvailable": true } ] } ] }
```

`POST /api/orders` — Customer
```json
Request  { "lines": [ { "menuItemId": 3, "quantity": 2 }, { "menuItemId": 9, "quantity": 1 } ], "note": "Less ice" }
201 { "order": { "id": 12, "orderNumber": "ORD-20261106-0004", "status": "SUBMITTED",
       "totalSatang": 17500, "note": "Less ice", "createdAt": "…",
       "lines": [ { "menuItemId": 3, "itemName": "Iced Latte", "unitPriceSatang": 6500, "quantity": 2, "lineTotalSatang": 13000 },
                  { "menuItemId": 9, "itemName": "Croissant", "unitPriceSatang": 4500, "quantity": 1, "lineTotalSatang": 4500 } ] } }
```
| Error | When |
|---|---|
| `400 BAD_REQUEST` | Body is not JSON / `lines` missing or not an array |
| `401 UNAUTHENTICATED` | No session |
| `403 FORBIDDEN` | Operator |
| `422 VALIDATION_ERROR` | `details.fields` e.g. `{ "lines[0].quantity": "Quantity must be an integer from 1 to 10." }`, `{ "lines": "An order must have 1 to 20 lines." }`, `{ "lines[1].menuItemId": "This item is already in the order." }` |
| `422 ITEM_UNAVAILABLE` | `details.items: [ { "menuItemId": 7, "name": "Matcha Latte" } ]` — sold out or unknown (unknown items report `name: null`) |

## UI specification — Menu & cart (Customer)
- Categories as sections; each item shows name, description, price "65.00 THB" and an **Add** button; sold-out items show a "Sold out" badge (text, not color only) and a disabled button.
- Cart panel (beside the menu on desktop, below on mobile): lines with − / + steppers limited to 1–10, Remove, optional note, **estimated** total labelled "Total (confirmed by the café on submit)".
- **Place order:** disabled while the cart is empty or the request runs. On 201, go to the order detail with "Order placed". On 422, show the server message on the related line (e.g. "Matcha Latte is sold out") and **keep the cart**. Other errors show a banner with Retry.
- States: loading skeleton for the menu, "The menu is empty" message, error banner.

## Data specification
Uses Order, OrderLine, OrderStatusChange and MenuItem (F-16). No new migration.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-10 | Given a logged-in user, `GET /api/menu` returns categories with items, prices in satang and availability; sold-out items have `isAvailable: false`. The menu screen shows them as Sold out and does not allow adding them. |
| AC-11 | Given a Customer and valid lines, when the order is submitted, then 201 is returned with status `SUBMITTED`, the lines and totals, and the order is stored for that customer. |
| AC-12 | The stored line totals and order total equal the database prices × quantities (e.g. 2 × 65.00 + 1 × 45.00 = 175.00 THB). |
| AC-13 | Given a request that also sends `unitPriceSatang: 1`, `totalSatang: 1`, `status: "ACCEPTED"` or another `customerId`, then the stored order uses the database prices, status `SUBMITTED` and the session customer. |
| AC-14 | Given a submitted order, when the item price is later changed in the database, then the order's lines and total are unchanged. |
| AC-15 | Quantity 1 and 10 are accepted; 0, 11, -1, 1.5 and "2" are rejected with 422 and no order is stored. |
| AC-16 | An order with 0 lines, 21 lines or the same item twice is rejected with 422 and no order is stored. |
| AC-17 | An order containing a sold-out or unknown item is rejected with 422 `ITEM_UNAVAILABLE` naming the item; no order, line or history row is stored, even if the other lines are valid. |
| AC-18 | Order numbers follow `ORD-YYYYMMDD-NNNN` (Bangkok date) and the second order of the day has the next number. |
| AC-19 | An Operator calling `POST /api/orders` receives 403 and no order is stored. |

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Initial contract |
| 1.1 | 2026-11-07 | Corrected the Issue number (the baseline PR took #1, so issues are #2–#9). No behavior change. |
