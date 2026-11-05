# KMUTT Café Pre-Order — Requirements Traceability

> Version 1.0. Requirement → feature/responsibility → sprint → verification.
> Sprint 1 rows link to the acceptance criteria and tests in [sprints/sprint-1/](sprints/sprint-1/). Later sprints are allocated now; their AC and tests are written when their contracts are prepared.

| Requirement | Feature / responsibility | Sprint | Verification (AC / test) | Status |
|---|---|---|---|---|
| FR-01 Login | F-01 | 1 | AC-01, AC-02 / TEST-A01, TEST-A02, E2E-01 | Planned |
| FR-02 Logout | F-01 | 1 | AC-03 / TEST-A03, E2E-01 | Planned |
| FR-03 Current user | F-01 | 1 | AC-04 / TEST-A04 | Planned |
| FR-04 Menu browsing | F-03 | 1 | AC-10 / TEST-M01, UI-01 | Planned |
| FR-05 Place order | F-04 | 1 | AC-11 / TEST-O01, UI-02, E2E-02 | Planned |
| FR-06 My orders list | F-05 | 1 | AC-20 / TEST-O10 | Planned |
| FR-07 Order detail | F-05 | 1 | AC-21 / TEST-O11, E2E-02 | Planned |
| FR-08 Operator queue | F-06 | 1 | AC-30 / TEST-Q01 | Planned |
| FR-09 Accept order | F-06 | 1 | AC-31 / TEST-Q02, E2E-03 | Planned |
| FR-10 Reject with reason | F-07 | 2 | Sprint 2 contract | Allocated |
| FR-11 Fulfilment lifecycle | F-08 | 2 | Sprint 2 contract | Allocated |
| FR-12 Customer cancel | F-07 | 2 | Sprint 2 contract | Allocated |
| FR-13 Menu management | F-09 | 2 | Sprint 2 contract | Allocated |
| FR-14 Simulated payment | F-10 | 2 | Sprint 2 contract | Allocated |
| FR-15 Pickup time | F-11 | 3 | Sprint 3 contract | Allocated |
| FR-16 Sales summary | F-12 | 3 | Sprint 3 contract | Allocated |
| FR-17 Order search/filter | F-13 | 3 | Sprint 3 contract | Allocated |
| FR-18 Status history view | F-08 (data from F-06 in Sprint 1) | 2 | Sprint 2 contract (history recorded from Sprint 1: AC-31) | Allocated |
| FR-19 Operator dashboard | F-12 | 3 | Sprint 3 contract | Allocated |
| BR-01 Server-side totals | F-04 | 1 | AC-12, AC-13 / TEST-U01, TEST-O02, TEST-O03 | Planned |
| BR-02 Price snapshot | F-04 | 1 | AC-14 / TEST-O04 | Planned |
| BR-03 Quantity 1–10 | F-04 | 1 | AC-15 / TEST-U02, TEST-O05 | Planned |
| BR-04 1–20 lines, no duplicates | F-04 | 1 | AC-16 / TEST-U03, TEST-O06 | Planned |
| BR-05 Available items only | F-03, F-04 | 1 | AC-17 / TEST-O07 | Planned |
| BR-06 Transition matrix | F-06 (accept), F-07, F-08 | 1 · 2 | AC-32 / TEST-U10, TEST-Q03 (Sprint 1 part) | Planned (S1 part) |
| BR-07 Operator-only transitions; customer cancel own | F-02, F-06, F-07 | 1 · 2 | AC-33 / TEST-Q04 (Sprint 1 part) | Planned (S1 part) |
| BR-08 Own orders only | F-02, F-05 | 1 | AC-22 / TEST-O12 | Planned |
| BR-09 Accept once, conflict-safe | F-06 | 1 | AC-34 / TEST-Q05 | Planned |
| BR-10 Reject reason | F-07 | 2 | Sprint 2 contract | Allocated |
| BR-11 Append-only history | F-06, F-08 | 1 · 2 | AC-31 / TEST-Q02 (entry written) | Planned (S1 part) |
| BR-12 Price limits | F-09 | 2 | Sprint 2 contract | Allocated |
| BR-13 Simulated payment rules | F-10 | 2 | Sprint 2 contract | Allocated |
| BR-14 Pickup time window | F-11 | 3 | Sprint 3 contract | Allocated |
| BR-15 Order number format | F-04 | 1 | AC-18 / TEST-U04, TEST-O08 | Planned |
| BR-16 Sales counted on picked-up orders | F-12 | 3 | Sprint 3 contract | Allocated |
| BR-17 Inactive accounts refused | F-01 | 1 | AC-02 / TEST-A02 | Planned |
| NFR-01 401 without session | F-02 | 1 | AC-05 / TEST-S01 | Planned |
| NFR-02 Backend role/ownership | F-02 | 1 | AC-22, AC-33 / TEST-O12, TEST-Q04, TEST-S02 | Planned |
| NFR-03 bcrypt hashes | F-01 | 1 | AC-06 / TEST-A05 | Planned |
| NFR-04 Session lifecycle | F-01 | 1 | AC-03 / TEST-A03 | Planned |
| NFR-05 Atomic order save | F-04 | 1 | AC-17 / TEST-O07 (no partial rows) | Planned |
| NFR-06 Safe error format | F-02 | 1 | AC-07 / TEST-S03 | Planned |
| NFR-07 Reproducible setup, idempotent seed | F-16 | 1 | AC-40 / TEST-D01 | Planned |
| NFR-08 Accessibility | F-14 | 3 | Sprint 3 contract (labels and keyboard from Sprint 1 UI) | Allocated |
| NFR-09 Responsive | F-14 | 2 | Sprint 2 contract | Allocated |
| NFR-10 Performance smoke | F-14 | 3 | Sprint 3 contract | Allocated |
| NFR-11 Docker, env config, no secrets | F-15 | Lab 5 | Lab 5 evidence | Allocated |
| NFR-12 Durable data | F-16 (local), F-15 (GCP) | 1 · Lab 5 | Manual restart check (S1) · Lab 5 redeploy | Planned (S1 part) |

## Coverage summary

- Every FR, BR and NFR of the baseline has a feature/responsibility and a sprint.
- Sprint 1 verifies: FR-01…FR-09, BR-01…BR-05, BR-08, BR-09, BR-15, BR-17, the accept part of BR-06/BR-07/BR-11, NFR-01…NFR-07 and the local part of NFR-12.
- Uncovered requirements: **none**.
- Approved changes: none yet (see [features.md](features.md) "Changes to the baseline").
