# KMUTT Café Pre-Order — System-Level Software Design Specification (SDS)

> Version 1.0 (Sprint 1 baseline). Related: [srs.md](srs.md) · [features.md](features.md)

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

| Entity | Main fields | Constraints / notes |
|---|---|---|
| **User** | id, email, name, passwordHash, role (`CUSTOMER` \| `OPERATOR`), isActive, createdAt | `email` unique (lower-case); `passwordHash` bcrypt cost 12 |
| **Category** | id, name, sortOrder | `name` unique |
| **MenuItem** | id, categoryId, name, description, priceSatang, isAvailable, createdAt, updatedAt | `priceSatang` integer > 0 (CHECK) and ≤ 100 000; FK → Category |
| **Order** | id, orderNumber, customerId, status, totalSatang, note, version, createdAt, updatedAt, acceptedAt; later: paymentStatus, pickupAt, rejectReason | `orderNumber` unique; `status` enum `SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP, REJECTED, CANCELLED`; FK → User (customer); index (status, createdAt) and (customerId, createdAt) |
| **OrderLine** | id, orderId, menuItemId, itemName, unitPriceSatang, quantity, lineTotalSatang | `itemName` and `unitPriceSatang` are **snapshots** (BR-02); `quantity` CHECK 1–10; unique (orderId, menuItemId) enforces BR-04; FK → Order (cascade on delete only for test cleanup), FK → MenuItem (restrict) |
| **OrderStatusChange** | id, orderId, fromStatus, toStatus, actorId, reason, createdAt | Append-only (BR-11); index (orderId, createdAt) |
| **session** | sid, sess (JSON), expire | Session store used by `connect-pg-simple`; created by a migration |

**Ownership links:** `Order.customerId` identifies the owner; every customer query is filtered by the session user id. Operators have café-wide scope (D-02).

**Money:** integer satang everywhere in the database and API (D-03); the UI formats `12500` as "125.00 THB".

**Migrations and seed:** schema changes are Prisma migrations committed under `server/prisma/migrations/` and applied with `npx prisma migrate dev` (local) or `npx prisma migrate deploy` (CI/cloud). `npx prisma db seed` is **idempotent** (upserts by e-mail / name): it creates 3 customers, 2 operators (one inactive), 4 categories, about 15 menu items including 2 sold-out items, and a few sample orders in different statuses. `npm run db:reset` recreates a clean demo database.

## 3. UI structure and conventions

| Screen | Role | Purpose | Sprint |
|---|---|---|---|
| Login | all | E-mail/password form; generic error | 1 |
| Menu & cart | Customer | Menu by category, Sold-out badges, quantity steppers, cart with server-confirmed total, "Place order" | 1 |
| My orders | Customer | List of own orders, newest first | 1 |
| Order detail | Customer, Operator | Lines, totals, status badge, history | 1 |
| Order queue | Operator | Incoming orders (Submitted, oldest first), status filter, Accept button | 1 |
| Menu management | Operator | Create/edit items, availability toggle | 2 |
| Sales summary / dashboard | Operator | Daily figures and counts with drill-down | 3 |

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
- Validation: request bodies are validated with schemas (zod) in the route layer; unknown fields are stripped, so client-sent `unitPrice`, `total`, `status` or `customerId` are ignored.
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
| Reject / advance order (S2) | `POST /api/operator/orders/:id/reject`, `…/status` | 401 | 403 | ✓ |
| Cancel own order (S2) | `POST /api/orders/:id/cancel` | 401 | own, Submitted only | 403 (operators use status endpoint) |
| Manage menu (S2) | `POST/PATCH /api/operator/menu-items` | 401 | 403 | ✓ |
| Simulated payment (S2) | `POST /api/orders/:id/pay` | 401 | own | 403 |
| Sales summary (S3) | `GET /api/operator/summary` | 401 | 403 | ✓ |

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

**Planned GCP deployment (Lab 5):**

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
