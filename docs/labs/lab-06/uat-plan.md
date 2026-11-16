# Lab 6 — Sprint 1 UAT plan and handoff (Product Team: Group Paris)

KMUTT Café Pre-Order · CPE 334 Section 31 · Product Team: Rémy FAHS (`ramy-web92`), Maxime DARWICHE (`Maxboox`)

## 1. What you are testing

| Item | Value |
|---|---|
| Application | KMUTT Café Pre-Order: customers pre-order food and drinks, the café operator accepts the orders |
| URL | https://cafe-rgydhkolpq-as.a.run.app |
| Tested commit | `4ce6ea8c395da2748bd887a25b3db6554e320743` on `main` (release PR #38) |
| Deployed revision | Cloud Run `cafe-00007-7m6`, image tagged with the commit above |
| Sprint 1 baseline | tag `v0.1.0` (commit `8f57a54`). The commits after it (Lab 5) only changed deployment, CI and documentation, plus a footer with opening hours. The Sprint 1 behaviour and its contract are the same. |
| Contract | `docs/sprints/sprint-1/` (F-01/F-02, F-03/F-04, F-05, F-06), acceptance criteria AC-01 to AC-35 |
| In scope | sign in and sign out, role and ownership rules, menu, placing an order, my orders and order detail, operator queue and accept |
| Not in scope (Sprint 2 and 3) | preparing / ready / collected statuses, cancelling an order, editing the menu, managing users, reports. Please do not report their absence as a defect. |

We will not deploy anything during your test session. If we must, we will tell you first and give you the new commit.

## 2. Accounts

All accounts share one demo password. **We send it to you privately** (direct message), never in this document or on GitHub. The data is synthetic.

| Label | E-mail | Role | Use |
|---|---|---|---|
| C1 | `alice@cafe.test` | Customer | has older sample orders |
| C2 | `bob@cafe.test` | Customer | owner of another customer's order (UAT-05) |
| C3 | `carol@cafe.test` | Customer | main tester account |
| OP | `olivia@cafe.test` | Operator (active) | queue and accept |
| OX | `oscar@cafe.test` | Operator (**inactive**) | must not be able to sign in |

## 3. Data, order and cleanup

- Menu prices used below: Espresso 45.00, Americano 50.00, Iced Latte 65.00, Croissant 45.00 THB. **Mocha** and **Matcha Latte** are sold out.
- Each case creates the data it needs. Only **UAT-06 depends on UAT-01** (it accepts the order created there). Suggested order: UAT-07, UAT-01, UAT-02, UAT-03, UAT-04, UAT-05, UAT-06, UAT-08.
- Orders you create stay in the database as test records; no cleanup is needed. If something blocks you (an account or a menu item changed), tell us: we re-run the seed job `cafe-migrate`, which restores accounts and menu without deleting orders.
- Order numbers use the Bangkok date: `ORD-YYYYMMDD-NNNN`. Write down every number you create.
- Use a normal browser window; UAT-04 and UAT-08 also need a private window.

## 4. Cases

### UAT-01 — Customer places an order (normal journey)
**Refs:** FR-04, FR-05, BR-01, BR-15 · AC-10, AC-11, AC-12, AC-18 · **Role:** Customer C3 · **Pre:** signed out
1. Open the URL, sign in as C3.
2. On **Menu**, click **Add** on **Iced Latte** twice and on **Croissant** once.
3. In **Your order**, check the lines and the estimate, then click **Place order**.
4. Click **My orders**.

**Expected:**
- Step 3: cart shows Iced Latte ×2 and Croissant ×1, estimate **175.00 THB** (2 × 65.00 + 1 × 45.00). After placing, the order detail opens with a number `ORD-<today's Bangkok date>-NNNN`: status **Submitted**, lines Iced Latte 65.00 × 2 = 130.00 and Croissant 45.00 × 1 = 45.00, **Total 175.00 THB**, history “Submitted by Carol Customer”.
- Step 4: the order is the first row, Items 3, Total 175.00 THB, status Submitted.
- Write down the order number (used in UAT-06).

### UAT-02 — Sold-out items cannot be ordered (business rule)
**Refs:** FR-04, BR-05 · AC-10, AC-17 · **Role:** Customer C3 · **Pre:** signed in as C3
1. On **Menu**, find **Mocha** (Coffee) and **Matcha Latte** (Tea & Others).
2. Try to click their **Add** buttons.
3. Add **Americano** once and place the order.

**Expected:** Mocha and Matcha Latte show a **Sold out** badge and a disabled **Add** button; nothing is added to the cart. The Americano order is placed normally (Total 50.00 THB) and contains no sold-out item.

### UAT-03 — Quantity limits 1 to 10 (boundary)
**Refs:** BR-03 · AC-15 · **Role:** Customer C3 · **Pre:** signed in as C3, empty cart
1. Click **Add** on **Espresso** once. Look at the **−** button.
2. Click **+** until the quantity stops increasing.
3. Place the order.

**Expected:** at quantity 1 the **−** button is disabled. The quantity stops at **10**; at 10 the **+** button and the menu **Add** button for Espresso are disabled. The order is placed with Espresso × 10, **Total 450.00 THB**.

### UAT-04 — Wrong role and no session are refused (forbidden access)
**Refs:** FR-03, BR-17 · AC-05, AC-19, AC-22, AC-33 · **Roles:** Customer C1, Operator OP, anonymous
1. Sign in as C1 (Alice). In the same tab, open `https://cafe-rgydhkolpq-as.a.run.app/api/operator/orders`.
2. Go back to the app, sign out, sign in as OP (Olivia). Look at the navigation. Then open `…/api/orders`.
3. Open a **private window** (not signed in) and open `…/api/orders` and `…/api/menu`.

**Expected:**
- Step 1: `{"error":{"code":"FORBIDDEN","message":"You don't have access to this resource."}}`, no order data.
- Step 2: Olivia sees only the **Order queue** (no Menu, no My orders). `/api/orders` returns the same FORBIDDEN body.
- Step 3: both return `{"error":{"code":"UNAUTHENTICATED","message":"Please sign in."}}`, with no menu or order data.

### UAT-05 — A customer cannot see another customer's order (ownership)
**Refs:** FR-06, FR-07, BR-08 · AC-20, AC-22 · **Roles:** Customers C2 and C1
1. Sign in as C2 (Bob). Note the order numbers in **My orders**. Open `…/api/orders` and write down the `"id"` of one of Bob's orders (for example the one numbered `ORD-20261101-0004`).
2. Sign out, sign in as C1 (Alice). Open **My orders** and compare with Bob's numbers.
3. Still as Alice, open `…/api/orders/<Bob's id>`.

**Expected:** Alice's list contains none of Bob's order numbers. Step 3 returns `{"error":{"code":"NOT_FOUND","message":"Order not found."}}` with no items, totals or customer name of Bob's order. Bob's order is unchanged when Bob signs in again.

### UAT-06 — Operator accepts the order and the customer sees it (state, history, persistence)
**Refs:** FR-08, FR-09, BR-06, BR-11 · AC-30, AC-31, AC-35 · **Roles:** Operator OP, Customer C3 · **Pre:** UAT-01 done
1. Sign in as OP. The queue shows **Submitted** orders, oldest first. Find the UAT-01 order.
2. Click **Accept** on that order.
3. Change the **Status** filter to **Accepted**.
4. Sign out, sign in as C3, open **My orders**, then open the UAT-01 order.
5. Sign out and sign in as C3 again, open the order once more.

**Expected:**
- Step 2: message “Order ORD-… accepted.” and the order leaves the Submitted list.
- Step 3: the order is listed with status **Accepted** and no Accept button.
- Step 4 and 5: status **Accepted**, same lines and total 175.00 THB, history in this order: “Submitted by Carol Customer”, then “Submitted → Accepted by Olivia Operator” with its time. The result is the same after signing in again (stored, not only on screen).

### UAT-07 — Sign in, inactive account and sign out
**Refs:** FR-01, FR-02 · AC-01, AC-02, AC-03, AC-04 · **Roles:** C3, OX, anonymous
1. On the sign-in page, enter `carol@cafe.test` with a wrong password.
2. Enter `oscar@cafe.test` with the **correct** demo password.
3. Enter `nobody@cafe.test` with any password.
4. Sign in as C3 with the correct password; check the name and role at the top right.
5. Click **Log out**, then open `…/api/auth/me`.

**Expected:** steps 1, 2 and 3 all show the same message “Invalid email or password.” and stay on the sign-in page. Step 4 shows “Carol Customer · Customer”. Step 5 returns to the sign-in page and `/api/auth/me` returns UNAUTHENTICATED.

### UAT-08 — The same order cannot be accepted twice (concurrency)
**Refs:** BR-07, BR-09 · AC-32, AC-34 · **Roles:** Customer C3, Operator OP in two windows
1. As C3, place a new order with **Thai Tea** × 1 (55.00 THB). Note its number. Sign out.
2. Open the app in a normal window **and** in a private window; sign in as OP in both. Both queues show the new order.
3. In window A click **Accept**. Then, **without refreshing**, click **Accept** in window B.
4. In either window, open the order (click its number).

**Expected:** window A shows “Order … accepted.”. Window B shows the warning “Order … was already handled. The list has been refreshed.” and the order is no longer in its Submitted list. The order detail shows status Accepted and **exactly one** “Submitted → Accepted” history entry.

## 5. Coverage

| Lab 6 category | Case(s) |
|---|---|
| Normal domain journey | UAT-01 |
| Business rule / boundary | UAT-02, UAT-03 |
| Forbidden role / ownership | UAT-04, UAT-05 |
| State / history / persistence | UAT-06, UAT-08 |
| Session and account rules | UAT-07 |

## 6. How to report a problem

Open an Issue on https://github.com/ramy-web92/campus-cafe-preorder/issues with the label `uat-finding`, or send it to us directly. Please include: case ID, tested commit (`4ce6ea8`), account label (never the password), steps, expected result, actual result, time, and a screenshot.
