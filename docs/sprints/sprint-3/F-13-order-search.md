# F-13 Order history search and filter

**Requirements:** FR-17, BR-08, D-07 · **Issue:** #59 · **Depends on:** F-05 · **Version:** 1.0

## Feature SDS
- **Filter (FR-17):** a Customer filters **their own** order history by status and by a date range on the submission date (Bangkok calendar days, D-07). Filters combine with AND and keep the F-05 order (newest first) and pagination (10 per page).
- **Ownership (BR-08):** the query always starts from `customerId = session user`; a filter can only narrow it. No filter value can reveal another customer's order.
- **Date range:** `from` and `to` are `YYYY-MM-DD`; both are inclusive. `from=2026-11-25` means from 2026-11-25 00:00 Bangkok (2026-11-24T17:00Z); `to=2026-11-25` means before 2026-11-26 00:00 Bangkok. Either can be omitted.
- **Workflow:** `parseOrderFilters(query)` validates and converts the query (pure function, unit tested); `listCustomerOrders(customerId, page, filters)` adds the conditions to the Prisma `where`.
- **Permissions:** Customers only (Operator 403, anonymous 401), as F-05.

## Validation and errors
| Case | Response (422 `VALIDATION_ERROR`, `details.fields.<field>`) |
|---|---|
| `status` not one of the 7 order statuses | `status`: "Use one of SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP, REJECTED, CANCELLED." |
| `from` / `to` not a real `YYYY-MM-DD` date (e.g. `2026-02-30`, `25/11/2026`) | `from` / `to`: "Use a date in the format YYYY-MM-DD." |
| `from` after `to` | `to`: "The end date must be on or after the start date." |

Empty values (`status=`) mean "no filter".

## API specification
| Method / path | Auth | Query | Success | Errors |
|---|---|---|---|---|
| `GET /api/orders` | Customer | `status`, `from`, `to`, `page` (all optional) | `200 { "orders": [ … ], "pagination": { … }, "filters": { "status", "from", "to" } }` | 401, 403, 422 |

## UI specification
- **My orders:** a filter bar above the list: "Status" select (All statuses + the 7 statuses), "From" and "To" date inputs, **Apply** and **Clear** buttons. Field errors from 422 appear under the inputs.
- When filters are active the result count is announced ("3 orders match") and the empty state reads "No orders match these filters." with a **Clear filters** button. Pagination keeps the filters.

## Data specification
No migration. Uses the existing index `(customerId, createdAt)`.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-120 | Given Alice's orders in several statuses, when she filters by `CANCELLED`, then only her cancelled orders are returned, newest first, and the total matches the database count. |
| AC-121 | Given orders submitted on 2026-11-24, 2026-11-25 and 2026-11-26 (Bangkok), when Alice filters `from=2026-11-25&to=2026-11-25`, then only the 2026-11-25 orders are returned; an order at 2026-11-25 23:30 Bangkok (16:30Z) is included and one at 2026-11-26 00:10 Bangkok is not. |
| AC-122 | Status and dates combine (AND); `from` alone and `to` alone work. |
| AC-123 | `status=DELIVERED`, `from=2026-02-30`, `to=25/11/2026` and `from` after `to` return 422 with the field message. |
| AC-124 | Bob filtering with any values never receives Alice's orders; an Operator calling the endpoint gets 403. |

## Definition of Done (feature-specific)
- AC-120–AC-124 covered by TEST-F01–F02 (unit), TEST-SF01–SF04 (API), UI-F01 in [sts.md](sts.md), all passing; RED before GREEN.

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | Initial contract, written before implementation |
