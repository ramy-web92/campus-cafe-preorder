# KMUTT Café Pre-Order — Three-Sprint Plan

> Version 1.0. Related: [../features.md](../features.md) · [../traceability.md](../traceability.md)

| Sprint | Goal | Features | Depends on | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| **1** | Small working ordering slice with authentication, permissions and persistence | F-01, F-02, F-03, F-04, F-05, F-06, F-16 | — | A Customer logs in, orders from the menu and reopens the saved order; an Operator logs in and accepts it. Totals are computed on the server; invalid quantities, sold-out items and other customers' orders are rejected. Tests for rules, persistence and access pass on `main`, tagged `v0.1.0`. | Deliverable 1 — 8 Nov |
| **2** | Complete the order lifecycle and let the café run its menu | F-07, F-08, F-09, F-10, F-14 (responsive part), F-15 (Lab 5) | Sprint 1 release | Reject/cancel, Preparing → Ready → Picked up with visible history, menu management with price rules, simulated payment and refunds; deployed on GCP with CI. | Deliverable 2 — 29 Nov |
| **3** | Remaining features, integration and product hardening | F-11, F-12, F-13, F-14 (accessibility, performance) | Sprint 2 release | Pickup times, sales summary and dashboard, order search; accessibility and performance checks; regression suite and defect fixes; final release. | Progress 29 Nov · complete 13 Dec |

## Sprint 1 scope and why it is feasible

Sprint 1 delivers the smallest slice that still exercises every layer and the core rules of the theme:
authentication and two roles (F-01, F-02), the menu (F-03), order placement with server pricing and validation (F-04), the customer's persisted order (F-05) and the operator's accept transition (F-06), on a reproducible seeded database (F-16).

It excludes reject/cancel, the rest of the lifecycle, menu editing and payment: they reuse the same order model and transition service, so they extend Sprint 1 without redesign. The team has about five working days; the slice reuses the stack and patterns of Labs 1–4.

## Work allocation (Sprint 1)

Both students work on requirements, contracts, tests, implementation and review. Each Issue has an author and a reviewer; PRs are always reviewed by the other student.

| Issue | Scope | Author | Reviewer |
|---|---|---|---|
| S1-1 | Baseline documents (SRS, features, traceability, SDS, plan) | Rémy + Maxime (pair) | both |
| S1-2 | Sprint 1 engineering contracts and STS | Rémy + Maxime (pair) | both |
| S1-3 | Project skeleton, schema, migration, seed (F-16) | Rémy | Maxime |
| S1-4 | Authentication and access control (F-01, F-02) | Maxime | Rémy |
| S1-5 | Menu and place order (F-03, F-04) | Rémy | Maxime |
| S1-6 | My orders and order detail (F-05) | Maxime | Rémy |
| S1-7 | Operator queue and accept (F-06) | Maxime | Rémy |
| S1-8 | Integration, E2E, release `v0.1.0` | Rémy + Maxime (pair) | both |

## Dependencies

F-16 → F-01 → F-02 → (F-03 → F-04 → F-05) and (F-04 → F-06). Sprint 2 features depend on the Sprint 1 order model and transition service; Lab 5 (F-15) packages the Sprint 1 release.
