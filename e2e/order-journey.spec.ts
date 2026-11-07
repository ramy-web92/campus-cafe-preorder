// E2E-02..E2E-06 — docs/sprints/sprint-1/sts.md (AC-10, AC-11, AC-17, AC-21, AC-22, AC-31, AC-33, AC-35)
import { test, expect } from "@playwright/test";
import { API, SHOTS, login, logout, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

let orderNumber = "";

test("E2E-02 a Customer orders from the menu and reopens the saved order", async ({ page }) => {
  await login(page, "alice@cafe.test");
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();

  await page.getByRole("button", { name: "Add Iced Latte" }).click();
  await page.getByRole("button", { name: "Increase Iced Latte" }).click();
  await page.getByRole("button", { name: "Add Croissant" }).click();
  await page.getByLabel("Note (optional)").fill("Less ice please");
  await expect(page.getByRole("complementary").getByText("175.00 THB")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/04-menu-cart.png`, fullPage: true });

  await page.getByRole("button", { name: "Place order" }).click();

  // the app opens the order detail returned by the server
  const heading = page.getByRole("heading", { name: /^Order ORD-\d{8}-\d{4}$/ });
  await expect(heading).toBeVisible();
  orderNumber = (await heading.textContent())!.replace("Order ", "");
  await expect(page.getByText("Submitted").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "175.00 THB" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/05-order-detail-submitted.png`, fullPage: true });

  // persisted: reload and find it again in My orders
  await page.reload();
  await page.getByRole("button", { name: "My orders" }).click();
  await expect(page.getByRole("button", { name: orderNumber })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-my-orders.png`, fullPage: true });

  // and it is in the database with the server-computed total
  const [row] = await sql("SELECT status, \"totalSatang\" FROM \"Order\" WHERE \"orderNumber\" = $1", [orderNumber]);
  expect(row).toEqual({ status: "SUBMITTED", totalSatang: 17500 });
});

test("E2E-03 an Operator accepts the order and the Customer sees Accepted", async ({ page }) => {
  await login(page, "olivia@cafe.test");
  await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();
  const accept = page.getByRole("button", { name: `Accept ${orderNumber}` });
  await expect(accept).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/07-operator-queue.png`, fullPage: true });

  await accept.click();
  await expect(page.getByText(`Order ${orderNumber} accepted.`)).toBeVisible();
  await expect(page.getByRole("button", { name: `Accept ${orderNumber}` })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/08-operator-accepted.png`, fullPage: true });
  await logout(page);

  await login(page, "alice@cafe.test");
  await page.getByRole("button", { name: "My orders" }).click();
  await page.getByRole("button", { name: orderNumber }).click();
  await expect(page.getByText("Accepted").first()).toBeVisible();
  await expect(page.getByText(/Submitted → Accepted by Olivia Operator/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/09-customer-sees-accepted.png`, fullPage: true });
});

test("E2E-04 a sold-out item cannot be added", async ({ page }) => {
  await login(page, "alice@cafe.test");
  await expect(page.getByRole("button", { name: "Add Mocha" })).toBeDisabled();
  await expect(page.getByText("Sold out").first()).toBeVisible();
});

test("E2E-05 an item that sells out before submission is rejected and nothing is stored (AC-17)", async ({ page }) => {
  await login(page, "carol@cafe.test");
  await page.getByRole("button", { name: "Add Thai Tea" }).click();
  await page.getByRole("button", { name: "Add Espresso" }).click();

  // the café marks Thai Tea as sold out while Carol's cart is open
  await sql("UPDATE \"MenuItem\" SET \"isAvailable\" = false WHERE name = 'Thai Tea'");
  try {
    const before = await sql("SELECT count(*)::int AS n FROM \"Order\"");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByText("Thai Tea is sold out.")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("no longer available");
    await page.screenshot({ path: `${SHOTS}/10-rule-rejection-sold-out.png`, fullPage: true });
    const after = await sql("SELECT count(*)::int AS n FROM \"Order\"");
    expect(after[0].n).toBe(before[0].n);
  } finally {
    await sql("UPDATE \"MenuItem\" SET \"isAvailable\" = true WHERE name = 'Thai Tea'");
  }
});

test("E2E-06 the backend refuses forbidden role and ownership operations (AC-22, AC-33)", async ({ page }) => {
  await login(page, "alice@cafe.test");
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();

  // a Customer calling an Operator endpoint
  const queue = await page.request.get(`${API}/api/operator/orders`);
  expect(queue.status()).toBe(403);
  await page.goto(`${API}/api/operator/orders`);
  await page.screenshot({ path: `${SHOTS}/11-forbidden-403.png` });

  // a Customer opening another customer's order
  const [bobOrder] = await sql("SELECT o.id FROM \"Order\" o JOIN \"User\" u ON u.id = o.\"customerId\" WHERE u.email = 'bob@cafe.test' LIMIT 1");
  const other = await page.request.get(`${API}/api/orders/${bobOrder.id}`);
  expect(other.status()).toBe(404);
  await page.goto(`${API}/api/orders/${bobOrder.id}`);
  await page.screenshot({ path: `${SHOTS}/12-other-customer-404.png` });
});
