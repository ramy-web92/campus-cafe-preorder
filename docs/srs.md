# KMUTT Café Pre-Order — Software Requirements Specification (SRS)

> CPE 334 Group Project · Theme 4 — E-Commerce or Ordering System · Version 1.0 (Sprint 1 baseline)
> Team: FAHS Rémy (69546000443) · DARWICHE Maxime (69540460044)
> Change history is kept in Git; revisions are listed in §8.

## 1. Stakeholder problem and context

The campus café serves students and staff between classes. At peak times customers queue to order, wait again for their drinks, and the café cannot see demand in advance. The café wants customers to **pre-order from the menu before arriving**, see what they ordered and its status, and **pick it up at the counter**. Café staff want one list of incoming orders that they can accept and then prepare in order.

The product is a web application for **one café** (single shop). Prices are in Thai Baht (THB). Payment is **simulated**; no real payment gateway is used.

## 2. Actors and responsibilities

| Actor | Who | Responsibilities in the product |
|---|---|---|
| **Customer** | Student or staff member with a seeded account | Browse the menu, place pre-orders, view their own orders and status, cancel an order that is not accepted yet (Sprint 2), simulate payment (Sprint 2), choose a pickup time (Sprint 3) |
| **Operator** | Café staff member with a seeded account | View incoming orders, accept or reject them, move accepted orders through preparation to pickup, maintain the menu (prices, availability), view sales summaries |
| System | KMUTT Café Pre-Order | Authenticates users, enforces permissions and business rules, calculates totals, stores orders and their history |

Each account has exactly one role. Operators handle **all orders of the café** (one shop, no branch scope) — see D-02.

## 3. Product scope

**In scope (whole product, three sprints):** authentication with two roles; menu browsing; order creation with multiple lines and server-side pricing; customer order list and detail; operator order queue; order lifecycle (accept, reject, prepare, ready, picked up, cancel) with history; menu management; simulated payment and refund status; pickup time; operator sales summary and dashboard; order search/filter; accessibility, responsive UI, Docker/CI/GCP delivery (Lab 5).

**Explicit exclusions:** real payment gateways or card data; delivery to an address; self-registration, password recovery, email verification; e-mail/SMS/LINE/push notifications; loyalty points, coupons and discounts; multiple cafés/branches; inventory of ingredients or stock counting; tax invoices and accounting; mobile native apps.

## 4. Functional requirements

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A user can log in with e-mail and password; on success the system creates a session and returns the user's id, name and role. Invalid credentials or an inactive account return the same generic error. | 1 |
| FR-02 | A logged-in user can log out; the server session is destroyed and later requests with the old cookie are treated as unauthenticated. | 1 |
| FR-03 | The client can retrieve the current user (id, name, role) from the session. | 1 |
| FR-04 | A Customer can view the menu grouped by category, with name, description, price and availability. Unavailable items are shown as "Sold out" and cannot be added. | 1 |
| FR-05 | A Customer can submit an order with one or more lines (menu item + quantity) and an optional note; the system stores the order, assigns an order number and returns its detail. | 1 |
| FR-06 | A Customer can list their own orders (newest first) with number, date, total and status. | 1 |
| FR-07 | A Customer can open the detail of one of their orders: lines with item name, unit price, quantity, line total, order total, status and status history. | 1 |
| FR-08 | An Operator can view incoming orders (default: status Submitted, oldest first) and filter the list by status. | 1 |
| FR-09 | An Operator can accept a Submitted order; the status changes to Accepted and the change is recorded in the history. | 1 |
| FR-10 | An Operator can reject a Submitted order with a reason. | 2 |
| FR-11 | An Operator can move an order through Accepted → Preparing → Ready → Picked up. | 2 |
| FR-12 | A Customer can cancel their own order while it is still Submitted. | 2 |
| FR-13 | An Operator can create and edit menu items (name, description, category, price) and mark them available or sold out. | 2 |
| FR-14 | A Customer can simulate payment of an order (Unpaid → Paid); a cancelled or rejected paid order becomes Refunded. | 2 |
| FR-15 | A Customer chooses a pickup time when ordering; Operators see orders sorted by pickup time. | 3 |
| FR-16 | An Operator can view a sales summary for a chosen day: number of completed orders, revenue, and top items. | 3 |
| FR-17 | A Customer can search and filter their order history by status and date. | 3 |
| FR-18 | Users can see the append-only status history of an order (actor, time, from → to, reason). | 2 |
| FR-19 | An Operator sees a dashboard with today's counts per status and links to the filtered queue. | 3 |

## 5. Business rules

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | The order total and every line total are calculated **by the server** from the authoritative menu prices at submission time (`lineTotal = unitPrice × quantity`, `total = Σ lineTotal`). Prices or totals sent by the client are ignored. | 1 |
| BR-02 | Each order line stores a **snapshot** of the item name and unit price at submission. Later menu changes never change an existing order. | 1 |
| BR-03 | A line quantity must be an integer from **1 to 10**. Anything else is rejected and no order is stored. | 1 |
| BR-04 | An order contains **1 to 20 lines**, and the same menu item may appear only once per order (duplicate lines are rejected). | 1 |
| BR-05 | Only menu items that exist and are **available** can be ordered. If any line refers to an unavailable or unknown item, the whole order is rejected and nothing is stored. | 1 |
| BR-06 | Order status transitions are limited to: Submitted → Accepted / Rejected / Cancelled; Accepted → Preparing / Cancelled; Preparing → Ready; Ready → Picked up. Picked up, Rejected and Cancelled are final. Any other transition is rejected. | 1 (accept) · 2 (rest) |
| BR-07 | Only Operators can accept, reject or advance orders. A Customer can only cancel **their own** order and only while it is Submitted. | 1 · 2 |
| BR-08 | A Customer can only read their own orders. Requesting another customer's order returns "not found" without revealing that it exists. | 1 |
| BR-09 | An order can be accepted only while it is Submitted. If two Operators accept the same order at the same time, exactly one succeeds; the other receives a conflict and the order is accepted once. | 1 |
| BR-10 | Rejecting an order requires a reason of 1–300 characters, visible to the Customer. | 2 |
| BR-11 | Every status change is appended to the order history with actor, timestamp, from-status, to-status and optional reason; history entries are never edited or deleted. | 1 |
| BR-12 | A menu price must be greater than 0 and at most 1,000.00 THB. A price change applies only to orders submitted after the change (follows from BR-02). | 2 |
| BR-13 | Payment is simulated. An order can be paid only while it is Submitted, Accepted, Preparing or Ready; a Cancelled or Rejected order cannot be paid; cancelling or rejecting a Paid order sets the payment status to Refunded. | 2 |
| BR-14 | A pickup time must fall inside opening hours (08:00–18:00, Asia/Bangkok) and be at least 15 minutes after submission. | 3 |
| BR-15 | Order numbers are unique and readable: `ORD-YYYYMMDD-NNNN`, sequential per day (Asia/Bangkok). | 1 |
| BR-16 | Sales summaries count only Picked-up orders and use the snapshot prices; Cancelled and Rejected orders are excluded. | 3 |
| BR-17 | Inactive accounts cannot log in; the error is the same as for a wrong password. | 1 |

## 6. Non-functional requirements

| ID | Requirement (measurable target) | Verification method | Sprint |
|---|---|---|---|
| NFR-01 | Every protected endpoint returns **401** for an unauthenticated request and the body contains no private data. | API tests on each protected route | 1 |
| NFR-02 | Role and ownership rules are enforced by the backend: forbidden role operations return **403**, other customers' orders return **404**. | API tests bypassing the UI | 1 |
| NFR-03 | Passwords are stored only as **bcrypt hashes (cost ≥ 10)**; no plaintext password is stored or logged. | Unit/DB test on seeded users; code review | 1 |
| NFR-04 | Sessions use an **httpOnly** cookie, expire after **8 hours** of inactivity and are destroyed on logout. | API test: request with the old cookie after logout returns 401 | 1 |
| NFR-05 | An order and its lines are stored **atomically**: a rejected order leaves no partial rows. | API/DB integration test on a rejected order | 1 |
| NFR-06 | Error responses use the format `{ "error": { "code", "message", "details?" } }` and never contain stack traces or SQL. | API tests on 4xx/5xx responses | 1 |
| NFR-07 | A fresh clone can be set up and seeded by following the README in **≤ 10 minutes**; the seed is idempotent (two runs give identical counts). | Seed test + manual fresh-clone check | 1 |
| NFR-08 | Main screens have **0 serious/critical axe** violations and can be operated with the keyboard only. | Playwright + axe E2E | 3 (basic labels from 1) |
| NFR-09 | No horizontal page scroll at **360, 768 and 1280 px** on the main screens. | Playwright responsive test | 2 |
| NFR-10 | Order submission responds in **< 500 ms (p95)** locally with the seeded data. | Performance smoke test | 3 |
| NFR-11 | The application runs as a Docker container configured only through environment variables; no secrets in Git or client code. | Docker build/run, repository secret scan | Lab 5 (Sprint 2) |
| NFR-12 | Data survives an application restart or redeployment (persistent PostgreSQL). | Restart check locally (S1); redeploy check on GCP (Lab 5) | 1 · Lab 5 |

## 7. Assumptions, decisions and questions

| ID | Type | Statement | Resolution |
|---|---|---|---|
| D-01 | Decision | Context: pre-orders for a single campus café with pickup at the counter. | Chosen by the team (theme 4 allows a bounded domain such as food pre-orders). |
| D-02 | Decision | Operators handle all orders of the café (one shop, no branch or station scope). | Recorded; multi-branch is excluded. |
| D-03 | Decision | Money is stored as integer **satang** (1 THB = 100 satang) to avoid rounding errors; the UI formats it as THB with 2 decimals. | Recorded. |
| D-04 | Decision | Duplicate lines for the same item are rejected instead of merged, so the customer sees exactly what is stored. | Recorded (BR-04). |
| D-05 | Decision | Quantity 1–10 per line and 1–20 lines per order: realistic for a café and easy to test at the boundaries. | Recorded (BR-03, BR-04). |
| D-06 | Decision | Accounts are seeded (no self-registration), as allowed for Sprint 1. | Recorded. |
| D-07 | Decision | Time zone Asia/Bangkok for order numbers, opening hours and daily summaries. | Recorded. |
| D-08 | Decision | Session-cookie authentication (server-side session store in PostgreSQL) instead of JWT, so logout really invalidates the session. | Recorded; see SDS §5. |
| A-01 | Assumption | Each account has exactly one role; an Operator does not place orders for themselves through the Customer screens. | Accepted for the whole product. |
| A-02 | Assumption | Availability is a simple "available / sold out" flag set by Operators; no stock counting. | Accepted. |
| Q-01 | Question | Can a Customer edit an order after submission? | Resolved: no. They can cancel while Submitted and order again (keeps BR-02 simple). |
| Q-02 | Question | Can Operators cancel an accepted order? | Resolved: yes, Accepted → Cancelled (e.g. item ran out), Sprint 2. |

## 8. Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Baseline for Project Deliverable 1. |
