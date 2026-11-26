// E2E-K01 — docs/sprints/sprint-3/sts.md (Sprint 3 journeys in the browser)
import { test, expect } from "@playwright/test";
import { login, logout, sql } from "./helpers";

test.describe.configure({ mode: "serial" });
const SHOTS3 = "artifacts/sprint-3/screenshots";

/** "YYYY-MM-DDTHH:mm" for the datetime-local input: tomorrow 09:30 in the browser's time zone (Asia/Bangkok in CI config). */
function tomorrowAt0930(): string {
  const d = new Date(Date.now() + 24 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:30`;
}

test.use({ timezoneId: "Asia/Bangkok" });

test("E2E-K01 a Customer chooses a pickup time and the Operator sees it in the queue (AC-100, AC-104)", async ({ page }) => {
  await login(page, "alice@cafe.test");
  await page.getByRole("button", { name: "Add Iced Latte" }).click();
  await page.getByRole("radio", { name: "Choose a time" }).check();
  await page.getByLabel("Pickup date and time").fill(tomorrowAt0930());
  await page.screenshot({ path: `${SHOTS3}/k01-cart-pickup.png`, fullPage: true });
  await page.getByRole("button", { name: "Place order" }).click();
  const heading = page.getByRole("heading", { name: /^Order ORD-\d{8}-\d{4}$/ });
  await expect(heading).toBeVisible();
  const orderNumber = (await heading.textContent())!.replace("Order ", "");
  await expect(page.getByText(/Pickup: .*9:30/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS3}/k01-detail-pickup.png`, fullPage: true });
  await logout(page);

  await login(page, "olivia@cafe.test");
  const row = page.getByRole("row", { name: new RegExp(orderNumber) });
  await expect(row).toContainText(/9:30/);
  await page.screenshot({ path: `${SHOTS3}/k01-queue-pickup.png`, fullPage: true });

  const [stored] = await sql(`SELECT "pickupAsap" FROM "Order" WHERE "orderNumber" = $1`, [orderNumber]);
  expect(stored.pickupAsap).toBe(false);
});

test("E2E-SS01 an order picked up today appears in the Operator's sales summary (AC-110, AC-114)", async ({ page }) => {
  await login(page, "alice@cafe.test");
  await page.getByRole("button", { name: "Add Croissant" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  const heading = page.getByRole("heading", { name: /^Order ORD-\d{8}-\d{4}$/ });
  await expect(heading).toBeVisible();
  const orderNumber = (await heading.textContent())!.replace("Order ", "");
  await logout(page);

  await login(page, "olivia@cafe.test");
  await page.getByRole("button", { name: "Sales", exact: true }).click();
  const before = Number(await page.getByTestId("completed-orders").textContent());
  await page.getByRole("button", { name: "Order queue", exact: true }).click();
  for (const step of ["Accept", "Start preparing", "Mark ready", "Picked up"]) {
    const filter = { Accept: "SUBMITTED", "Start preparing": "ACCEPTED", "Mark ready": "PREPARING", "Picked up": "READY" }[step]!;
    await page.getByLabel("Status").selectOption(filter);
    await page.getByRole("button", { name: `${step} ${orderNumber}` }).click();
    await expect(page.getByRole("status").filter({ hasText: orderNumber })).toBeVisible();
  }
  await page.getByRole("button", { name: "Sales", exact: true }).click();
  await expect(page.getByTestId("completed-orders")).toHaveText(String(before + 1));
  await expect(page.getByRole("table", { name: "Top items" })).toContainText("Croissant");
  await page.screenshot({ path: `${SHOTS3}/ss01-sales.png`, fullPage: true });
});
