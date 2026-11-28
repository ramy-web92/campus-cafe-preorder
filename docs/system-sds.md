# KMUTT Café Pre-Order — System-Level Software Design Specification (SDS)

> Version 1.1 (CR-01, Lab 7). Related: [srs.md](srs.md) · [features.md](features.md)

## 1. Architecture and stack

A **modular monolith** with three logical layers, packaged later as one Docker image.

```mermaid
flowchart LR
  B["Browser<br/>React SPA (Vite, Bootstrap 5)"] -- "HTTPS JSON /api/*<br/>session cookie" --> A
  subgraph A["Node.js process (Express + TypeScript)"]
    R["Routes / controllers<br/>(validation, HTTP mapping)"] --> M["Auth & role middleware"]
    M --> S["Domain services<br/>(orderService, menuService, authService)<br/>business rules BR-xx"]
    S --> P["Prisma ORM"]
  end
  P -- "SQL / TCP 5432" --> D[("PostgreSQL<br/>tables + session store")]
```

| Component | Technology | Responsibility |
|---|---|---|
| UI | React 18 + TypeScript, Vite, Bootstrap 5 ("Zen Green" theme from the TokTickIT labs) | Screens, forms, client-side validation for guidance only, calls the API with `credentials: "include"` |
| API / application layer | Node.js 22, Express 4, TypeScript | REST endpoints, input validation, authentication and role checks, **all business rules** (in domain services), safe error mapping |
| Data access | Prisma 5 | Schema, migrations, type-safe queries, transactions |
| Database | PostgreSQL 16 | Durable storage of users, menu, orders, history and sessions |
| Tests | Vitest + Supertest (unit, API/DB integration), React Testing Library (UI components), Playwright (E2E) | Automated verification against a seeded test database |

**Why this stack:** both team members used it in Labs 1–4, it gives one language end to end, Prisma migrations make the schema reproducible, and a single Node process serving the built SPA is easy to containerize for Cloud Run (Lab 5).

**Where rules are enforced:** only in the API layer. Routes validate the request shape; middleware checks authentication and role; domain services (`orderService`, `menuService`) apply BR-01…BR-17 inside database transactions. The UI hides controls a role cannot use, but this is **never** treated as authorization.

## 2. Data model

```mermaid
erDiagram
  User ||--o{ Order : "places (customer)"
  User ||--o{ OrderStatusChange : "performs (actor)"
  Category ||--o{ MenuItem : groups
  MenuItem ||--o{ OrderLine : "referenced by"
  Order ||--|{ OrderLine : contains
  Order ||--o{ OrderStatusChange : "history of"
```

*Version 1.2 (Deliverable 2): fields added by Sprint 2 (F-10) and Sprint 3 (F-11) migrations are marked with the feature.*

| Entity | Main fields | Constraints / notes |
|---|---|---|
| **User** | id, email, name, passwordHash, role (`CUSTOMER` \| `OPERATOR`), isActive, createdAt | `email` unique (lower-case); `passwordHash` bcrypt cost 12 |
| **Category** | id, name, sortOrder | `name` unique |
| **MenuItem** | id, categoryId, name, description, priceSatang, isAvailable, createdAt, updatedAt | `priceSatang` integer > 0 (CHECK) and ≤ 100 000; FK → Category |
| **Order** | id, orderNumber, customerId, status, totalSatang, note, version, createdAt, updatedAt, acceptedAt; **paymentStatus, paidAt** (F-10); **pickupAt, pickupAsap** (F-11) | `orderNumber` unique; `status` enum `SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP, REJECTED, CANCELLED`; `paymentStatus` enum `UNPAID, PAID, REFUNDED`, default `UNPAID`; `pickupAt` NOT NULL (= createdAt for ASAP orders, D-09); `version` +1 on every status change (conditional updates, BR-09); FK → User (customer); indexes (status, createdAt), (status, pickupAt), (customerId, createdAt). Reject and cancel reasons live in `OrderStatusChange.reason` (no `rejectReason` column) |
| **OrderLine** | id, orderId, menuItemId, itemName, unitPriceSatang, quantity, lineTotalSatang | `itemName` and `unitPriceSatang` are **snapshots** (BR-02); `quantity` CHECK 1–10 kept on purpose (rows stored before CR-01 may hold 6–10); new orders are limited to 1–5 by `validateOrderInput` (BR-03 v1.1); unique (orderId, menuItemId) enforces BR-04; FK → Order (cascade on delete only for test cleanup), FK → MenuItem (restrict) |
| **OrderStatusChange** | id, orderId, fromStatus, toStatus, actorId, reason, createdAt | Append-only (BR-11); index (orderId, createdAt) |
| **session** | sid, sess (JSON), expire | Session store used by `connect-pg-simple`; created by a migration |

**Ownership links:** `Order.customerId` identifies the owner; every customer query is filtered by the session user id. Operators have café-wide scope (D-02).

**Money:** integer satang everywhere in the database and API (D-03); the UI formats `12500` as "125.00 THB".

**Migrations (current):** `20261105120000_init` (Sprint 1), `20261126090000_f10_payment` (Sprint 2), `20261126120000_f11_pickup_time` (Sprint 3, backfills `pickupAt = createdAt`).

**Migrations and seed:** schema changes are Prisma migrations committed under `server/prisma/migrations/` and applied with `npx prisma migrate dev` (local) or `npx prisma migrate deploy` (CI/cloud). `npx prisma db seed` is **idempotent** (upserts by e-mail / name): it creates 3 customers, 2 operators (one inactive), 4 categories, about 15 menu items including 2 sold-out items, and a few sample orders in different statuses. `npm run db:reset` recreates a clean demo database.

## 3. UI structure and conventions

| Screen | Role | Purpose | Sprint |
|---|---|---|---|
| Login | all | E-mail/password form; generic error | 1 |
| Menu & cart | Customer | Menu by category, Sold-out badges, quantity steppers, cart with server-confirmed total, "Place order" | 1 |
| My orders | Customer | List of own orders, newest first | 1 |
| Order detail | Customer, Operator | Lines, totals, status badge, history | 1 |
| Order queue | Operator | Today's status cards (S3), queue earliest pickup first, filter by all 7 statuses (S2), Accept / Reject / next step / Cancel order with reason (S1–S2) | 1 · 2 · 3 |
| Menu & cart: pickup | Customer | "As soon as possible" or a chosen date/time (BR-14) | 3 |
| My orders: filters | Customer | Status, From, To, Apply / Clear | 3 |
| Order detail: actions | Customer | Pay now (simulated), Cancel order with confirmation; payment and pickup lines; history with reasons | 2 · 3 |
| Menu management | Operator | Add/edit item form, Mark sold out / available | 2 |
| Sales summary | Operator | Day picker, completed orders, revenue, average, top 5 items | 3 |

Shared behavior on every screen:
- **Navigation** by role (header with user name, role and Logout); the current page is highlighted with `aria-current="page"`.
- **Loading:** skeleton or "Loading…" text with `aria-busy`.
- **Empty:** explicit message and next action (e.g. "No orders yet — Browse the menu").
- **Validation:** client checks only guide the user; server field errors (`422`) are shown under the related field and focus moves to the first error; entered data is kept.
- **Errors:** user-safe banner with Retry; `401` returns to Login; `403` shows "You don't have access"; `404` shows "Not found"; `409` explains that the order changed and reloads it.
- **Double submit:** submit buttons are disabled while a request is running.
- Status is shown with **text + icon**, not color alone.

## 4. API conventions

- Base path `/api`; JSON request and response bodies; resource-oriented paths (`/api/orders`, `/api/orders/:id`, `/api/operator/orders`, `/api/operator/orders/:id/accept`).
- Success: `200` (read/update), `201` (create, with the created resource), `204` (logout).
- Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "fields": { … } } } }` with
  `400` malformed request · `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `404 NOT_FOUND` (also for other customers' orders) · `409 CONFLICT` / `INVALID_TRANSITION` · `422 VALIDATION_ERROR` / `ITEM_UNAVAILABLE` · `500 INTERNAL_ERROR` (generic message, no stack trace).
- Validation: request bodies are validated by small pure functions per feature (`orderRules`, `menuRules`, `pickupRules`, `orderFilters`, `validateReason`) that are unit-tested; they build the stored value field by field, so client-sent `unitPrice`, `total`, `status` or `customerId` are ignored. *(v1.2: the baseline planned zod; plain validators were used instead, with the same behavior.)*
- Status changes: one service, `changeStatus` (`orderStatusService.ts`), used by accept, reject, cancel and the lifecycle: BR-06 matrix check, conditional `UPDATE … WHERE status = <checked status>`, history insert and refund (BR-13) in one transaction.
- Each feature contract (Part E) defines its exact endpoints and shapes.

## 5. Roles, permissions and authentication

### 5.1 Role / permission matrix

| Operation | Endpoint (Sprint 1 unless noted) | Anonymous | Customer | Operator |
|---|---|---|---|---|
| Log in | `POST /api/auth/login` | ✓ | ✓ | ✓ |
| Log out / current user | `POST /api/auth/logout`, `GET /api/auth/me` | 401 | ✓ | ✓ |
| View menu | `GET /api/menu` | 401 | ✓ | ✓ |
| Place order | `POST /api/orders` | 401 | ✓ (as self) | 403 |
| List / view orders | `GET /api/orders`, `GET /api/orders/:id` | 401 | **own only** (others → 404) | 403 (uses operator endpoints) |
| View queue / any order | `GET /api/operator/orders`, `GET /api/operator/orders/:id` | 401 | 403 | ✓ all |
| Accept order | `POST /api/operator/orders/:id/accept` | 401 | 403 | ✓ |
| Reject order (S2) | `POST /api/operator/orders/:id/reject` | 401 | 403 | ✓ (Submitted, reason) |
| Café cancel (S2) | `POST /api/operator/orders/:id/cancel` | 401 | 403 | ✓ (Accepted, reason) |
| Advance order (S2) | `POST /api/operator/orders/:id/status` | 401 | 403 | ✓ (one step) |
| Cancel own order (S2) | `POST /api/orders/:id/cancel` | 401 | own, Submitted only (others → 404) | 403 |
| Manage menu (S2) | `POST /api/operator/menu-items`, `PATCH /api/operator/menu-items/:id` | 401 | 403 | ✓ |
| Simulated payment (S2) | `POST /api/orders/:id/pay` | 401 | own (others → 404) | 403 |
| Filter own orders (S3) | `GET /api/orders?status=&from=&to=` | 401 | own only | 403 |
| Sales summary, dashboard (S3) | `GET /api/operator/sales?date=`, `GET /api/operator/dashboard` | 401 | 403 | ✓ |

The customer identity always comes from the session, never from the request body.

### 5.2 Authentication and session lifecycle

- **Credentials:** seeded accounts; passwords hashed with **bcrypt (cost 12)**; login compares with `bcrypt.compare`. Unknown e-mail, wrong password and inactive account return the same `401 INVALID_CREDENTIALS`.
- **Session creation:** on success the server calls `req.session.regenerate()` (prevents session fixation) and stores `userId` and `role`. The session is persisted in PostgreSQL (`connect-pg-simple`).
- **Cookie:** `sid`, `httpOnly`, `sameSite=lax`, `secure` in production, rolling expiry of **8 hours** of inactivity.
- **Current user:** `GET /api/auth/me` reloads the user from the database (so a deactivated user loses access on the next request) and returns `{ id, name, email, role }`.
- **Logout:** `POST /api/auth/logout` destroys the server session and clears the cookie; the old cookie is rejected afterwards.
- **Middleware:** `requireAuth` (401) and `requireRole(...roles)` (403) run before every protected route.

## 6. Configuration, secrets and deployment plan

| Variable | Purpose | Example (local) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://cafe:cafe@localhost:5432/cafe` |
| `SESSION_SECRET` | Signs the session cookie | long random string (never committed) |
| `PORT` | API port | `3000` |
| `CLIENT_ORIGIN` | Allowed CORS origin in development | `http://localhost:5173` |
| `NODE_ENV` | `development` / `test` / `production` | `development` |
| `VITE_API_URL` | API base URL for the client build | `http://localhost:3000` |

- `.env` files are git-ignored; `.env.example` files document every variable with fake values. The client receives only `VITE_API_URL`; no secret is bundled.
- Tests use a separate database (`DATABASE_URL` in `.env.test`) that is reset and seeded before the suite.

**GCP deployment (built in Lab 5, used for every release):**

```mermaid
flowchart LR
  GH["GitHub<br/>PR → CI (build + tests)"] -- "merge to main" --> CB["Build Docker image"]
  CB --> AR["Artifact Registry"]
  AR --> CR["Cloud Run service<br/>(Express serves API + built SPA)"]
  CR -- "private connection" --> SQL[("Cloud SQL for PostgreSQL")]
  SM["Secret Manager<br/>SESSION_SECRET, DB password"] --> CR
```

- One container image built from a multi-stage Dockerfile (build client and server, then run `node dist/index.js`); Express serves the built SPA, so UI and API share one origin.
- `prisma migrate deploy` runs as a release step before the new revision receives traffic.
- Data lives in Cloud SQL, so it survives container restarts and redeployments (NFR-12).
- The CI pipeline (GitHub Actions) runs build and all automated tests on every PR; a failing required check blocks the merge.

## 7. Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Baseline for Project Deliverable 1. |
| 1.1 | 2026-11-25 | CR-01 (Lab 7): OrderLine note — the database CHECK stays 1–10 for historical rows, the 1–5 rule for new orders is enforced in the order validation layer. No migration. |
| 1.2 | 2026-11-27 | Deliverable 2: data model with `paymentStatus`/`paidAt` (F-10) and `pickupAt`/`pickupAsap` (F-11), list of migrations, Sprint 2–3 screens, actual validation approach (no zod), shared `changeStatus` service, complete permission matrix with the real Sprint 2–3 endpoints, GCP deployment in use. |
