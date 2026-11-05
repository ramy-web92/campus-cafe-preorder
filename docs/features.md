# KMUTT Café Pre-Order — Feature Inventory

> Version 1.0 (Sprint 1 baseline). Related: [srs.md](srs.md) · [traceability.md](traceability.md) · [sprints/plan.md](sprints/plan.md)

| ID | Feature / system responsibility | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication and session | E-mail/password login, logout, current user; bcrypt hashes; server-side session in PostgreSQL | FR-01, FR-02, FR-03, BR-17, NFR-03, NFR-04 | — | 1 |
| F-02 | Role and ownership access control *(cross-cutting)* | Backend middleware for authentication and role checks; ownership filter on customer data; safe error format | NFR-01, NFR-02, NFR-06, BR-07, BR-08 | F-01 | 1 (established and verified) |
| F-03 | Menu browsing | Menu grouped by category with prices and Sold-out state | FR-04, BR-05 | F-01, F-16 | 1 |
| F-04 | Place order | Cart and submission; server-side pricing; price snapshot; quantity/line/availability rules; atomic save; order number | FR-05, BR-01, BR-02, BR-03, BR-04, BR-05, BR-15, NFR-05 | F-02, F-03 | 1 |
| F-05 | My orders and order detail | Customer order list and persisted detail with lines and history | FR-06, FR-07, BR-08 | F-04 | 1 |
| F-06 | Operator queue and accept | Incoming-orders queue with status filter; accept with conflict-safe transition and history entry | FR-08, FR-09, BR-06 (accept), BR-07, BR-09, BR-11 | F-02, F-04 | 1 |
| F-07 | Reject and cancel | Operator reject with reason; customer cancel while Submitted; operator cancel while Accepted | FR-10, FR-12, BR-06, BR-07, BR-10 | F-06 | 2 |
| F-08 | Fulfilment lifecycle and history view | Preparing → Ready → Picked up; status history shown to both roles | FR-11, FR-18, BR-06, BR-11 | F-06 | 2 |
| F-09 | Menu management | Operator creates/edits items, prices and availability | FR-13, BR-12 | F-03 | 2 |
| F-10 | Simulated payment | Unpaid → Paid by the customer; Refunded on cancel/reject of a paid order | FR-14, BR-13 | F-07 | 2 |
| F-11 | Pickup time | Pickup time on order creation with opening-hours rule; queue sorted by pickup time | FR-15, BR-14 | F-04 | 3 |
| F-12 | Sales summary and operator dashboard | Daily completed orders, revenue, top items; counts per status with drill-down | FR-16, FR-19, BR-16 | F-08 | 3 |
| F-13 | Order history search and filter | Customer filters own orders by status and date | FR-17 | F-05 | 3 |
| F-14 | Quality hardening *(cross-cutting)* | Accessibility, responsive layout, performance smoke test, regression suite | NFR-08, NFR-09, NFR-10 | all UI features | 2–3 |
| F-15 | Delivery: Docker, CI/CD, GCP *(cross-cutting)* | Container image, CI quality gate, Cloud Run + Cloud SQL deployment, durable data | NFR-11, NFR-12 | F-01…F-06 | Lab 5 (during Sprint 2) |
| F-16 | Reproducible setup and seed *(cross-cutting)* | Migrations, idempotent seed (accounts, categories, menu, sample orders), README setup | NFR-07, NFR-12 (local) | — | 1 |

## Changes to the baseline

| Date | Change | Reason | Approved by |
|---|---|---|---|
| — | No change yet | — | — |

New or changed features are added here with their reason instead of silently editing the table.
