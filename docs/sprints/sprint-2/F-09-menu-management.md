# F-09 Menu management

**Requirements:** FR-13, BR-12, BR-02, BR-05, BR-07 · **Issue:** #53 · **Depends on:** F-03 · **Version:** 1.0

## Feature SDS
- **Create item:** an Operator adds a menu item to an existing category with name, description, price and availability (FR-13).
- **Edit item:** an Operator changes any of these fields, including moving the item to another category and marking it sold out or available again.
- **Price rule (BR-12):** a price must be greater than 0 and at most 1,000.00 THB (integer satang 1–100000). A price change applies only to orders submitted after the change: existing order lines keep their snapshot price (BR-02), new orders use the new price.
- **Availability:** marking an item sold out makes new orders that contain it fail with `ITEM_UNAVAILABLE` (BR-05, unchanged F-04 code). Orders already submitted are not affected.
- **No delete:** items referenced by order lines cannot be deleted (foreign key `RESTRICT`); the operator marks them sold out instead. This keeps order history readable. Stated here so that the missing Delete button is a decision, not a gap.
- **Categories:** fixed by the seed in Sprint 2 (Coffee, Tea & Other Drinks, Bakery, Light Meals). Category management is out of scope.
- **Workflow:** validate the body (all fields on create, only present fields on edit), check that the category exists, write the row. The unique index `(categoryId, name)` rejects a duplicate name in the same category → 409.
- **Permissions:** Operators only (Customer 403, anonymous 401). Customers keep reading the menu through `GET /api/menu` (F-03).

## Validation and errors
| Field | Rule | Error (422 `VALIDATION_ERROR`, `details.fields.<field>`) |
|---|---|---|
| `name` | string, 1–80 characters after trimming | "Name must be 1 to 80 characters." |
| `description` | string, 0–300 characters (optional, default "") | "Description must be at most 300 characters." |
| `priceSatang` | integer, 1–100000 (BR-12) | "Price must be greater than 0 and at most 1,000.00 THB." |
| `categoryId` | integer id of an existing category | "Choose an existing category." |
| `isAvailable` | boolean (optional on create, default `true`) | "Availability must be true or false." |

Other responses: unknown item id → `404 NOT_FOUND` "Menu item not found."; same name already used in the target category → `409 DUPLICATE_ITEM` "An item with this name already exists in this category."; empty PATCH body → 422 "Nothing to update.". Unknown extra fields are ignored.

## API specification
| Method / path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/menu` | any signed-in user | — | as F-03 (every item, with `isAvailable`) | 401 |
| `POST /api/operator/menu-items` | Operator | `{ "categoryId": 3, "name": "Banana Bread", "description": "…", "priceSatang": 5500, "isAvailable": true }` | `201 { "item": { "id", "categoryId", "name", "description", "priceSatang", "isAvailable" } }` | 401, 403, 409, 422 |
| `PATCH /api/operator/menu-items/:id` | Operator | any subset, e.g. `{ "priceSatang": 7500 }` or `{ "isAvailable": false }` | `200 { "item": { … } }` | 401, 403, 404, 409, 422 |

## UI specification
- Operators get a second tab **Menu** next to **Order queue**.
- **Menu management screen:** items grouped by category in a table: name, description, price (THB), availability badge, and **Edit**. A toggle button **Mark sold out / Mark available** changes availability in one click.
- **Item form** (used for Add and Edit): Category (select), Name, Description (textarea, counter), Price in THB (number input, step 0.25, converted to satang), Available (checkbox). Save is disabled while saving; field errors from 422 appear under each input; 409 appears under Name.
- After saving, the list reloads and a success message "Saved Banana Bread." is announced (`role="status"`).

## Data specification
No migration. Uses `MenuItem` (F-16): `priceSatang` integer with the database CHECK `0 < price <= 100000`, unique `(categoryId, name)`, `updatedAt` set by Prisma. Order lines keep `itemName` and `unitPriceSatang` snapshots (BR-02).

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-70 | Given an Operator, when they create an item with valid fields, then 201 is returned, the row is stored, and the item appears in `GET /api/menu` for a Customer. |
| AC-71 | Given an item priced 6500, when an Operator changes the price to 7500, then orders submitted before keep 6500 per unit and a new order uses 7500 (BR-12, BR-02). |
| AC-72 | Prices 0, -100, 100001, 12.5 and "abc" are rejected with 422; prices 1 and 100000 are accepted; a name of 0 or 81 characters, an unknown category and a non-boolean availability are rejected with 422; nothing is stored or changed on rejection. |
| AC-73 | Given an available item, when an Operator marks it sold out, then `GET /api/menu` shows `isAvailable: false` and a new order containing it returns 422 `ITEM_UNAVAILABLE`; marking it available again lets it be ordered. |
| AC-74 | Creating or renaming an item to a name that already exists in the same category returns 409 and nothing changes; the same name in another category is allowed. |
| AC-75 | A Customer calling the create or edit endpoints gets 403, an anonymous call gets 401, and editing an unknown id returns 404; the menu is unchanged. |

## Definition of Done (feature-specific)
- AC-70–AC-75 covered by TEST-V01–V03 (unit) and TEST-MM01–MM06 (API), UI-S05, UI-S06 and E2E-S03 in [sts.md](sts.md), all passing; RED before GREEN in CI.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Initial contract, written before implementation |
