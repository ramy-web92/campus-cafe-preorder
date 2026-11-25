# CR-01 — Line quantity limit 1–10 → 1–5 (Lab 7)

**Status:** Proposed — waiting for instructor/TA approval · **Requested by:** Rémy FAHS · **Reviewer:** Maxime DARWICHE · **Date:** 2026-11-25
**Issue:** #TBD · **Approval:** _approver, date and message reference are added here when received_

## 1. Versions

| Role | Version |
|---|---|
| Accepted Sprint 1 baseline (old rule in force) | tag `v0.1.0`; accepted UAT release `4ce6ea8` (PR #38), Cloud Run revision `cafe-00007-7m6`, accepted by EN-036 on 19/11/2026 (Lab 6) |
| Actual pre-change implementation | `main` at `48659b4` (release PR #46, Deploy demo #7). Between `4ce6ea8` and `48659b4`: Lab 6 UAT plan (docs, PR #40) and the Lab 6 controlled-defect fix (PR #45); BR-03 code is identical in both. No Sprint 2/3 code on `main` at this point. |
| Code to modify | `server/src/services/orderRules.ts` (`MAX_QTY`), `client/src/Menu.tsx` (`MAX_QTY`) |

## 2. Change

| | Rule |
|---|---|
| Original requirement (SRS v1.0, BR-03, AC-15) | A line quantity must be an integer from **1 to 10**. Quantity 1 and 10 are accepted; 0, 11, -1, 1.5 and "2" are rejected with 422 and no order is stored. |
| Implemented in Sprint 1 | `validateOrderInput` rejects quantities outside `MIN_QTY = 1 … MAX_QTY = 10`; the cart stepper stops at 10; DB CHECK `quantity BETWEEN 1 AND 10`. |
| **New rule** | A line quantity must be an integer from **1 to 5** for every new order. 5 is accepted; 6 and above (including the old maximum 10) are rejected with 422 `VALIDATION_ERROR`, field error "Quantity must be an integer from 1 to 5.", and no order, line or history row is stored. |
| Reason | At peak times the café kitchen cannot prepare more than 5 units of the same item for one customer, and large quantities block limited stock (bakery items) for the next customers. |

**Boundaries and invalid cases:** accepted 1, 5 · rejected 0, 6, 10, 11, -1, 1.5, "2", null. The 1–20 lines rule (BR-04), duplicate-item rule, unavailable-item rule (BR-05) and server-side pricing (BR-01) are unchanged. A rejected order is rejected as a whole (one invalid line → nothing stored).

**Access:** unchanged. Only a signed-in Customer can place an order (Operator 403, anonymous 401); a customer reads only their own orders (BR-08).

**Existing data:** orders stored before the change with a quantity of 6–10 stay valid and unchanged (BR-02 snapshot) — they are read, listed and can still be accepted. No migration; the DB CHECK stays 1–10 on purpose.

## 3. Acceptance criteria (revised contract)

- **AC-15 (revised):** quantity 1 and 5 accepted; 0, 6, 10, 11, -1, 1.5 and "2" rejected with 422, field error "Quantity must be an integer from 1 to 5.", nothing stored.
- **AC-15a (new):** an order stored before CR-01 with a quantity from 6 to 10 is still returned unchanged by the order detail, listed in My orders and in the operator queue, and can be accepted.

## 4. Impact

| Item | Affected? | Detail / reason |
|---|---|---|
| Requirement | BR-03 (changed), D-05 (wording) | SRS §5, §7, §8 → v1.1 |
| Feature | F-04 Place order | Feature SDS F-03/F-04 → v1.2: validation step, API error example, cart UI, AC-15, AC-15a |
| System-level SDS | §2 Data model, OrderLine | Note only: CHECK stays 1–10 for historical rows; rule enforced in validation → v1.1 |
| Acceptance criteria | AC-15 revised, AC-15a new | Other AC of F-04 unchanged |
| STS tests | TEST-U02, TEST-O05, UI-02 revised; TEST-O14 new | STS → v1.2. Old expected result "10 accepted" legitimately replaced; the rejected values 0, 11, -1, 1.5, "2" are kept |
| Server code | `orderRules.ts` | `MAX_QTY` 10 → 5; message is built from the constant |
| Client code | `Menu.tsx` | Cart stepper and menu Add button stop at 5 |
| API contract | `POST /api/orders` 422 text | Same status and error code; only the number in the message changes |
| Callers / dependencies | `orderService.createOrder` | Calls `validateOrderInput` before any DB write — no change needed; transaction unchanged |
| Roles / ownership | none | Rule applies to Customers only, who were already the only ones allowed to order |
| Persistence / migration | none | CHECK 1–10 kept so that historical rows stay valid; no data rewrite |
| Historical data | read paths | Order detail, My orders, operator queue and accept use stored quantities → protected by TEST-O14 |
| Seed / demo data | none | Seed orders use quantities 1–2 (`server/prisma/seed.ts`) |
| Pricing / totals | none | BR-01 calculation unchanged (`priceOrder`); TEST-U01, TEST-O02 stay as they are |
| Lab 6 UAT plan (UAT-03 "stops at 10") | not edited | Historical record of the accepted Sprint 1 test; the new limit is verified by the CR-01 checks |

## 5. Behavior that must stay unchanged and how it is protected

| Preserved behavior | Regression tests |
|---|---|
| Server-side pricing and snapshots (BR-01, BR-02) | TEST-U01, TEST-O02, TEST-O03, TEST-O04 |
| 1–20 lines, no duplicates, no empty order (BR-04, incl. DEF-D01) | TEST-U03, TEST-U07, TEST-O06, TEST-O13 |
| Unavailable / unknown items rejected (BR-05) | TEST-O07, UI-02 |
| Order numbers (BR-15) | TEST-U04, TEST-O08 |
| Ownership and roles (BR-07, BR-08) | security.api.test.ts, operator-orders.api.test.ts (403/401/404) |
| Operator accept, history, double accept (BR-09, BR-11) | TEST-Q01…TEST-Q05 |
| Orders stored before the change | TEST-O14 (new) |

Selected regression suite: full server suite (unit + API) and client suite, run in CI on the PR and before release; Playwright E2E-02 (place an order) in CI.
