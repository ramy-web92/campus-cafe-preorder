# Sprint 2 — Software Test Specification (STS)

> Version 1.0 — test design recorded **before** implementation (Issues #51–#55). The **Result** column stays "Planned" in this version and is filled from the CI run of the Sprint 2 release in a later version.
> Levels: **Unit** (pure logic) · **API** (HTTP + real PostgreSQL test database, reset and seeded before the suite) · **UI** (React component with the API mocked) · **E2E** (Playwright, browser + API + database).
> Regression: every Sprint 1 test in [../sprint-1/sts.md](../sprint-1/sts.md) stays in the suite and must still pass (access control, pricing, quantity rule, ownership, accept).

## F-07 Reject and cancel

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-T01 | AC-50, AC-52 | Unit | Transition matrix | `canTransition` for SUBMITTED→REJECTED, ACCEPTED→REJECTED, REJECTED→REJECTED | true, false, false | server/tests/unit/order-transitions.test.ts | Planned |
| TEST-T02 | AC-53, AC-54, AC-56 | Unit | Transition matrix | SUBMITTED→CANCELLED, ACCEPTED→CANCELLED, PREPARING→CANCELLED, READY→CANCELLED | true, true, false, false | order-transitions.test.ts | Planned |
| TEST-T03 | AC-51 | Unit | Reasons `undefined`, `""`, `"   "`, 300 × "a", 301 × "a", `42` | `validateReason` | only the 300-character string is valid (trimmed); others give "Reason must be 1 to 300 characters." | order-transitions.test.ts | Planned |
| TEST-T04 | AC-52 | Unit | Final statuses PICKED_UP, REJECTED, CANCELLED | `canTransition` to every status | always false | order-transitions.test.ts | Planned |
| TEST-R01 | AC-50 | API | Submitted order of alice; olivia | `POST /api/operator/orders/:id/reject` `{reason}` | 200 REJECTED; DB status REJECTED, version +1; one history row SUBMITTED→REJECTED, actor olivia, reason stored | server/tests/api/reject-cancel.api.test.ts | Planned |
| TEST-R02 | AC-51 | API | Submitted order | reject with no body, `""`, `"  "`, 301 chars; then 300 chars | 422 with `fields.reason` and status/history unchanged ×4; then 200 | reject-cancel.api.test.ts | Planned |
| TEST-R03 | AC-52 | API | Accepted order; already rejected order | reject | 409 `INVALID_TRANSITION`, nothing changes | reject-cancel.api.test.ts | Planned |
| TEST-R04 | AC-53, AC-54 | API | alice's Submitted order; alice's Accepted order | `POST /api/orders/:id/cancel` as alice | 200 CANCELLED + history row (actor alice); 409 for the accepted one, unchanged | reject-cancel.api.test.ts | Planned |
| TEST-R05 | AC-55 | API | alice's Submitted order | cancel as bob; customer cancel as olivia; reject and operator cancel as alice; all three without a cookie | 404; 403; 403; 401; order still SUBMITTED, no history row added | reject-cancel.api.test.ts | Planned |
| TEST-R06 | AC-56 | API | Accepted order; Submitted order | `POST /api/operator/orders/:id/cancel` `{reason}` | 200 CANCELLED + history ACCEPTED→CANCELLED with reason; 409 for the Submitted one | reject-cancel.api.test.ts | Planned |
| TEST-R07 | AC-57 | API | One Submitted order | reject and accept with `Promise.all` | statuses {200, 409}; exactly one new history row | reject-cancel.api.test.ts | Planned |
| TEST-R08 | AC-58 | API | Order rejected with reason "Sold out" | `GET /api/orders/:id` as owner | status REJECTED; last history entry has reason "Sold out" and actorName "Olivia Operator" | reject-cancel.api.test.ts | Planned |
| UI-S01 | AC-50, AC-51 | UI | Queue with a Submitted order (API mocked) | click Reject, Confirm with empty reason; then type reason and Confirm | Confirm disabled while empty; API called once with the reason; success message | client/tests/OperatorQueue.test.tsx | Planned |
| UI-S02 | AC-53, AC-58 | UI | Customer detail of a Submitted order; detail of a Rejected order with reason | click Cancel order → confirm; render rejected order | cancel API called; reason text shown in history | client/tests/OrderDetail.test.tsx | Planned |
| E2E-S01 | AC-50, AC-58 | E2E | alice places an order | olivia rejects it with a reason in the browser; alice opens the order | alice sees Rejected and the reason | e2e/sprint2.spec.ts | Planned |

## F-08 Fulfilment lifecycle and history

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-T05 | AC-60, AC-61 | Unit | Matrix | ACCEPTED→PREPARING, PREPARING→READY, READY→PICKED_UP true; ACCEPTED→READY, ACCEPTED→PICKED_UP, READY→PREPARING, SUBMITTED→PREPARING false | as listed | order-transitions.test.ts | Planned |
| TEST-L01 | AC-60 | API | Accepted order | `POST …/status` PREPARING, READY, PICKED_UP | 200 each; DB status PICKED_UP; 3 new history rows in order, actor olivia | server/tests/api/lifecycle.api.test.ts | Planned |
| TEST-L02 | AC-61 | API | Accepted, Ready and Picked-up orders | skip / go back / change a final order | 409 each; status and history unchanged | lifecycle.api.test.ts | Planned |
| TEST-L03 | AC-62 | API | Accepted order | `status` ACCEPTED, CANCELLED, DELIVERED, missing | 422 each, unchanged | lifecycle.api.test.ts | Planned |
| TEST-L04 | AC-63 | API | Accepted order | status call as alice; without cookie | 403; 401; unchanged | lifecycle.api.test.ts | Planned |
| TEST-L05 | AC-64, AC-65 | API | Full-lifecycle order; a Preparing order | owner reads detail; two READY requests in parallel | history SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP with actor names; {200, 409} and one new row | lifecycle.api.test.ts | Planned |
| TEST-L06 | AC-66 | API | Orders in PREPARING and READY | queue `?status=PREPARING`, `?status=READY` | only that status in each list | lifecycle.api.test.ts | Planned |
| UI-S03 | AC-60 | UI | Queue rows Accepted, Preparing, Ready (mocked) | render; click Start preparing | buttons "Start preparing", "Mark ready", "Picked up" shown on the right rows; API called with PREPARING | OperatorQueue.test.tsx | Planned |
| UI-S04 | AC-64 | UI | Detail with 5 history entries | render | 5 list items in order with actor names | OrderDetail.test.tsx | Planned |
| E2E-S02 | AC-60, AC-64 | E2E | alice's accepted order | olivia: Start preparing → Mark ready → Picked up; alice opens detail | alice sees Picked up and the full history | e2e/sprint2.spec.ts | Planned |

## F-09 Menu management

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-V01 | AC-72 | Unit | priceSatang 0, -100, 100001, 12.5, "abc", 1, 100000 | `validateMenuItemInput` | only 1 and 100000 valid | server/tests/unit/menu-rules.test.ts | Planned |
| TEST-V02 | AC-72 | Unit | name "", "   ", 81 chars, 80 chars; description 301 chars; isAvailable "yes" | validate (create) | field errors except the 80-character name | menu-rules.test.ts | Planned |
| TEST-V03 | AC-72 | Unit | PATCH body `{}`; `{ priceSatang: 7500 }` | validate (partial) | "Nothing to update."; valid with only priceSatang | menu-rules.test.ts | Planned |
| TEST-MM01 | AC-70 | API | olivia | `POST /api/operator/menu-items` valid body | 201; row in DB; listed in `GET /api/menu` for alice | server/tests/api/menu-management.api.test.ts | Planned |
| TEST-MM02 | AC-71 | API | Item at 6500; alice orders it | PATCH price 7500; alice orders again; read both orders | first order unit price 6500, second 7500 | menu-management.api.test.ts | Planned |
| TEST-MM03 | AC-72 | API | olivia | create/patch with the invalid values of TEST-V01/V02 and unknown category; then prices 1 and 100000 | 422 with field errors and DB unchanged; then 201/200 | menu-management.api.test.ts | Planned |
| TEST-MM04 | AC-73 | API | Available item | PATCH `isAvailable:false`; alice orders it; PATCH true; alice orders it | menu shows false; 422 `ITEM_UNAVAILABLE`; then 201 | menu-management.api.test.ts | Planned |
| TEST-MM05 | AC-74 | API | Item "Iced Latte" in Coffee | create "Iced Latte" in Coffee; in Bakery | 409 `DUPLICATE_ITEM`, count unchanged; 201 in Bakery | menu-management.api.test.ts | Planned |
| TEST-MM06 | AC-75 | API | — | create/patch as alice; without cookie; PATCH id 99999999 as olivia | 403; 401; 404; menu unchanged | menu-management.api.test.ts | Planned |
| UI-S05 | AC-70, AC-72 | UI | Menu management (mocked) | open Add item, Save with price 0; then valid values | field error shown, API not called; then API called with priceSatang 5500 | client/tests/MenuManagement.test.tsx | Planned |
| UI-S06 | AC-73 | UI | Item available | click Mark sold out | PATCH called with `isAvailable:false`; badge Sold out | MenuManagement.test.tsx | Planned |
| E2E-S03 | AC-70, AC-73 | E2E | olivia | adds "Banana Bread" in the browser; alice sees it on the menu | item visible with its price | e2e/sprint2.spec.ts | Planned |

## F-10 Simulated payment

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| TEST-T06 | AC-80–AC-82 | Unit | every (status, paymentStatus) pair | `canPay` | true only for UNPAID with SUBMITTED/ACCEPTED/PREPARING/READY | order-transitions.test.ts | Planned |
| TEST-P01 | AC-80 | API | alice's Submitted unpaid order | `POST /api/orders/:id/pay` | 200 PAID, `paidAt` set; DB PAID; status still SUBMITTED | server/tests/api/payment.api.test.ts | Planned |
| TEST-P02 | AC-81 | API | alice's orders in ACCEPTED, PREPARING, READY | pay each | 200 each | payment.api.test.ts | Planned |
| TEST-P03 | AC-82 | API | Paid order; Cancelled, Rejected and Picked-up unpaid orders | pay | 409 `PAYMENT_NOT_ALLOWED`; `paidAt` unchanged; others stay UNPAID | payment.api.test.ts | Planned |
| TEST-P04 | AC-83 | API | Paid Submitted order; paid order rejected; paid accepted order cancelled by olivia; unpaid order cancelled | cancel / reject | payment REFUNDED ×3; UNPAID for the unpaid one | payment.api.test.ts | Planned |
| TEST-P05 | AC-84 | API | alice's order | pay as bob; as olivia; no cookie | 404; 403; 401; still UNPAID | payment.api.test.ts | Planned |
| TEST-P06 | AC-85 | API | Seeded orders | list, detail, queue | every order has `paymentStatus`; seeded orders UNPAID | payment.api.test.ts | Planned |
| UI-S07 | AC-80 | UI | Customer detail of an unpaid Submitted order (mocked) | click Pay now | pay API called once; "Paid" shown | OrderDetail.test.tsx | Planned |
| E2E-S04 | AC-80, AC-83 | E2E | alice's order | alice pays, then cancels | detail shows Paid, then Cancelled and Refunded | e2e/sprint2.spec.ts | Planned |

## F-14 Responsive layout (NFR-09)

| Test | AC | Level | Precondition / input | Action | Expected result | File | Result |
|---|---|---|---|---|---|---|---|
| E2E-R01 | AC-90, AC-91 | E2E | Seeded data, alice and olivia | open the six main screens at 360, 768, 1280 px | `scrollWidth <= innerWidth` on each; queue and detail buttons visible at 360 px; screenshots saved | e2e/responsive.spec.ts | Planned |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Test design for F-07, F-08, F-09, F-10 and F-14 (responsive), before implementation |
