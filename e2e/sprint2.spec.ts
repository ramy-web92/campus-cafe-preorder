// E2E-S01.. — docs/sprints/sprint-2/sts.md (Sprint 2 journeys in the browser)
import { test, expect, Page } from "@playwright/test";
import { login, logout, sql } from "./helpers";

test.describe.configure({ mode: "serial" });
const SHOTS2 = "artifacts/sprint-2/screenshots";

/** alice orders one Iced Latte in the browser and returns the order number. */
async function aliceOrders(page: Page): Promise<string> {
  await login(page, "alice@cafe.test");
  await page.getByRole("button", { name: "Add Iced Latte" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  const heading = page.getByRole("heading", { name: /^Order ORD-\d{8}-\d{4}$/ });
  await expect(heading).toBeVisible();
  const number = (await heading.textContent())!.replace("Order ", "");
  await logout(page);
  return number;
}

async function aliceOpens(page: Page, orderNumber: string) {
  await login(page, "alice@cafe.test");
  await page.getByRole("button", { name: "My orders" }).click();
  await page.getByRole("button", { name: orderNumber }).click();
}

test("E2E-S01 an Operator rejects an order with a reason and the Customer sees it (AC-50, AC-58)", async ({ page }) => {
  const orderNumber = await aliceOrders(page);

  await login(page, "olivia@cafe.test");
  await page.getByRole("button", { name: `Reject ${orderNumber}` }).click();
  await page.getByLabel("Reason").fill("Sold out of milk");
  await page.screenshot({ path: `${SHOTS2}/s01-reject-reason.png`, fullPage: true });
  await page.getByRole("button", { name: "Confirm reject" }).click();
  await expect(page.getByText(`Order ${orderNumber} rejected.`)).toBeVisible();
  await logout(page);

  await aliceOpens(page, orderNumber);
  await expect(page.getByText("Rejected").first()).toBeVisible();
  await expect(page.getByText(/Reason: Sold out of milk/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS2}/s01-customer-sees-rejected.png`, fullPage: true });

  const [row] = await sql(`SELECT status FROM "Order" WHERE "orderNumber" = $1`, [orderNumber]);
  expect(row.status).toBe("REJECTED");
});

test("E2E-S02 an Operator moves an order to Picked up and the Customer sees the full history (AC-60, AC-64)", async ({ page }) => {
  const orderNumber = await aliceOrders(page);

  await login(page, "olivia@cafe.test");
  await page.getByRole("button", { name: `Accept ${orderNumber}` }).click();
  await expect(page.getByText(`Order ${orderNumber} accepted.`)).toBeVisible();
  const status = page.getByLabel("Status");
  await status.selectOption("ACCEPTED");
  await page.getByRole("button", { name: `Start preparing ${orderNumber}` }).click();
  await expect(page.getByText(`Order ${orderNumber} is now Preparing.`)).toBeVisible();
  await status.selectOption("PREPARING");
  await page.getByRole("button", { name: `Mark ready ${orderNumber}` }).click();
  await expect(page.getByText(`Order ${orderNumber} is now Ready.`)).toBeVisible();
  await status.selectOption("READY");
  await page.screenshot({ path: `${SHOTS2}/s02-queue-ready.png`, fullPage: true });
  await page.getByRole("button", { name: `Picked up ${orderNumber}` }).click();
  await expect(page.getByText(`Order ${orderNumber} is now Picked up.`)).toBeVisible();
  await logout(page);

  await aliceOpens(page, orderNumber);
  const history = page.getByRole("list", { name: "Status history" });
  await expect(history.getByRole("listitem")).toHaveCount(5);
  await expect(history).toContainText("Ready → Picked up by Olivia Operator");
  await page.screenshot({ path: `${SHOTS2}/s02-customer-history.png`, fullPage: true });
});

test("E2E-S03 an Operator adds a menu item and a Customer can order it (AC-70, AC-73)", async ({ page }) => {
  await login(page, "olivia@cafe.test");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("Category").selectOption({ label: "Bakery" });
  await page.getByLabel("Name").fill("Banana Bread");
  await page.getByLabel("Price (THB)").fill("55");
  await page.screenshot({ path: `${SHOTS2}/s03-add-item.png`, fullPage: true });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved Banana Bread.")).toBeVisible();
  await logout(page);

  await login(page, "alice@cafe.test");
  await expect(page.getByText("Banana Bread")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Banana Bread" })).toBeEnabled();
  await page.screenshot({ path: `${SHOTS2}/s03-customer-menu.png`, fullPage: true });
  const [row] = await sql(`SELECT "priceSatang", "isAvailable" FROM "MenuItem" WHERE name = 'Banana Bread'`);
  expect(row).toEqual({ priceSatang: 5500, isAvailable: true });
});
