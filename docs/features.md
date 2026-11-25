# KMUTT Café Pre-Order — Feature Inventory

> Version 1.1 (Deliverable 2). The **Status** column shows the state on the release candidate `v0.3.0-rc1`. Related: [srs.md](srs.md) · [traceability.md](traceability.md) · [sprints/plan.md](sprints/plan.md)

| ID | Feature / system responsibility | Description | Requirements | Depends on | Sprint | Status |
|---|---|---|---|---|---|---|
| F-01 | Authentication and session | E-mail/password login, logout, current user; bcrypt hashes; server-side session in PostgreSQL | FR-01, FR-02, FR-03, BR-17, NFR-03, NFR-04 | — | 1 | Accepted (v0.1.0) |
| F-02 | Role and ownership access control *(cross-cutting)* | Backend middleware for authentication and role checks; ownership filter on customer data; safe error format | NFR-01, NFR-02, NFR-06, BR-07, BR-08 | F-01 | 1 (established and verified) | Accepted (v0.1.0); re-verified for every Sprint 2–3 endpoint |
| F-03 | Menu browsing | Menu grouped by category with prices and Sold-out state | FR-04, BR-05 | F-01, F-16 | 1 | Accepted (v0.1.0) |
| F-04 | Place order | Cart and submission; server-side pricing; price snapshot; quantity/line/availability rules; atomic save; order number | FR-05, BR-01, BR-02, BR-03, BR-04, BR-05, BR-15, NFR-05 | F-02, F-03 | 1 | Accepted (v0.1.0); CR-01 released (Lab 7); pickup field added by F-11 |
| F-05 | My orders and order detail | Customer order list and persisted detail with lines and history | FR-06, FR-07, BR-08 | F-04 | 1 | Accepted (v0.1.0); filters added by F-13 |
| F-06 | Operator queue and accept | Incoming-orders queue with status filter; accept with conflict-safe transition and history entry | FR-08, FR-09, BR-06 (accept), BR-07, BR-09, BR-11 | F-02, F-04 | 1 | Accepted (v0.1.0); queue order revised (AC-30 v1.2) |
| F-07 | Reject and cancel | Operator reject with reason; customer cancel while Submitted; operator cancel while Accepted | FR-10, FR-12, BR-06, BR-07, BR-10 | F-06 | 2 | Implemented and tested, released in v0.2.0 |
| F-08 | Fulfilment lifecycle and history view | Preparing → Ready → Picked up; status history shown to both roles | FR-11, FR-18, BR-06, BR-11 | F-06 | 2 | Implemented and tested, released in v0.2.0 |
| F-09 | Menu management | Operator creates/edits items, prices and availability | FR-13, BR-12 | F-03 | 2 | Implemented and tested, released in v0.2.0 |
| F-10 | Simulated payment | Unpaid → Paid by the customer; Refunded on cancel/reject of a paid order | FR-14, BR-13 | F-07 | 2 | Implemented and tested, released in v0.2.0 |
| F-11 | Pickup time | Pickup time on order creation with opening-hours rule; queue sorted by pickup time | FR-15, BR-14 | F-04 | 3 | Implemented and tested in v0.3.0-rc1 |
| F-12 | Sales summary and operator dashboard | Daily completed orders, revenue, top items; counts per status with drill-down | FR-16, FR-19, BR-16 | F-08 | 3 | Implemented and tested in v0.3.0-rc1 |
| F-13 | Order history search and filter | Customer filters own orders by status and date | FR-17 | F-05 | 3 | Implemented and tested in v0.3.0-rc1 |
| F-14 | Quality hardening *(cross-cutting)* | Accessibility, responsive layout, performance smoke test, regression suite | NFR-08, NFR-09, NFR-10 | all UI features | 2–3 | Responsive part tested (v0.2.0); accessibility and performance **planned** |
| F-15 | Delivery: Docker, CI/CD, GCP *(cross-cutting)* | Container image, CI quality gate, Cloud Run + Cloud SQL deployment, durable data | NFR-11, NFR-12 | F-01…F-06 | Lab 5 (during Sprint 2) | Done (Lab 5); deploys every release |
| F-16 | Reproducible setup and seed *(cross-cutting)* | Migrations, idempotent seed (accounts, categories, menu, sample orders), README setup | NFR-07, NFR-12 (local) | — | 1 | Accepted (v0.1.0); seed updated for pickup time |

## Changes to the baseline

| Date | Change | Reason | Approved by |
|---|---|---|---|
| 2026-11-25 | CR-01: BR-03 quantity 1–10 → 1–5 for new orders (F-04) | Kitchen capacity at peak times (Lab 7) | TA reply, Issue #47 |
| 2026-11-26 | F-14 split: responsive part in Sprint 2, accessibility and performance in Sprint 3 (as already noted in the Sprint column) | Responsive checks are needed as soon as new screens appear | Sprint 2 contracts review |
| 2026-11-26 | D-09: pickup time optional (ASAP default) for F-11; queue earliest pickup first (AC-30 v1.2) | Keeps ordering outside opening hours working; FR-15 asks for pickup-time order | Sprint 3 contracts review |

New or changed features are added here with their reason instead of silently editing the table.
