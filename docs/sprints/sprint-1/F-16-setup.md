# F-16 — Reproducible setup, schema and seed

**Requirements:** NFR-07, NFR-12 (local) · **Issue:** #4 · **Depends on:** — · **Version:** 1.1

## Feature SDS
Create the project skeleton (`server/` Express + TypeScript + Prisma, `client/` React + Vite), the first database migration and an idempotent seed so that any team member or TA can run the product from a fresh clone.

## Data specification
Prisma models as in the System SDS §2:

| Model | Fields (type) | Constraints |
|---|---|---|
| User | id (Int, PK), email (String), name (String), passwordHash (String), role (`Role`: CUSTOMER, OPERATOR), isActive (Boolean, default true), createdAt | email unique |
| Category | id, name, sortOrder (Int) | name unique |
| MenuItem | id, categoryId (FK), name, description, priceSatang (Int), isAvailable (Boolean, default true), createdAt, updatedAt | priceSatang CHECK > 0 AND ≤ 100000; unique (categoryId, name) |
| Order | id, orderNumber (String), customerId (FK User), status (`OrderStatus`), totalSatang (Int), note (String?, ≤ 200), version (Int, default 1), acceptedAt (DateTime?), createdAt, updatedAt | orderNumber unique; index (status, createdAt), (customerId, createdAt) |
| OrderLine | id, orderId (FK), menuItemId (FK), itemName, unitPriceSatang, quantity, lineTotalSatang | quantity CHECK 1–10; unique (orderId, menuItemId) |
| OrderStatusChange | id, orderId (FK), fromStatus (OrderStatus?), toStatus, actorId (FK User), reason (String?), createdAt | index (orderId, createdAt) |
| session | sid (PK), sess (Json), expire (DateTime) | index on expire (connect-pg-simple) |

`OrderStatus` enum contains all values of the product (SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP, REJECTED, CANCELLED) so Sprint 2 needs no enum migration; Sprint 1 only uses SUBMITTED and ACCEPTED. CHECK constraints are added in the migration SQL.

## Seed (idempotent — upsert by e-mail / name)
- Customers: `alice@cafe.test`, `bob@cafe.test`, `carol@cafe.test` (no orders); Operators: `olivia@cafe.test` (active), `oscar@cafe.test` (inactive). Synthetic demo password documented in the README only (local use).
- 4 categories (Coffee, Tea & Others, Bakery, Meals) and 15 menu items, of which 2 are sold out.
- Sample orders: Alice 2 Submitted + 1 Accepted, Bob 1 Submitted, created through the same order service as the API (so totals follow BR-01).

## UI / API
No screen or endpoint in this feature. `GET /api/health` returns `{ "status": "ok" }`.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-40 | Given a fresh clone, when the README commands are run (`npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`), then the app starts with the seeded data; running the seed a second time leaves identical row counts. |

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Initial contract |
| 1.1 | 2026-11-07 | Corrected the Issue number (the baseline PR took #1, so issues are #2–#9). No behavior change. |
