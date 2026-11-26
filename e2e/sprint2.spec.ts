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
