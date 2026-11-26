// E2E-R01 — docs/sprints/sprint-2/sts.md (F-14 responsive part, NFR-09, AC-90, AC-91)
import { test, expect, Page } from "@playwright/test";
import { login, logout } from "./helpers";

const WIDTHS = [360, 768, 1280];
const SHOTS = "artifacts/sprint-2/responsive";

async function noHorizontalScroll(page: Page, screen: string, width: number) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  await page.screenshot({ path: `${SHOTS}/${screen}-${width}.png`, fullPage: true });
  expect(scrollWidth, `${screen} at ${width}px`).toBeLessThanOrEqual(innerWidth);
}

for (const width of WIDTHS) {
  test(`E2E-R01 main screens have no horizontal scroll at ${width}px (AC-90, AC-91)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await noHorizontalScroll(page, "login", width);

    // Customer: menu with a filled cart, My orders, order detail
    await login(page, "alice@cafe.test");
    await page.getByRole("button", { name: "Add Iced Latte" }).click();
    await page.getByRole("button", { name: "Add Croissant" }).click();
    await noHorizontalScroll(page, "menu-cart", width);
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByRole("heading", { name: /^Order ORD-/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay now (simulated)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toBeVisible();
    await noHorizontalScroll(page, "order-detail", width);
    await page.getByRole("button", { name: "My orders", exact: true }).click();
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
    await noHorizontalScroll(page, "my-orders", width);
    await logout(page);

    // Operator: queue with action buttons, menu management
    await login(page, "olivia@cafe.test");
    await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();
    const accept = page.getByRole("button", { name: /^Accept ORD-/ }).first();
    await accept.scrollIntoViewIfNeeded();
    await expect(accept).toBeVisible();
    await expect(page.getByRole("button", { name: /^Reject ORD-/ }).first()).toBeVisible();
    await noHorizontalScroll(page, "operator-queue", width);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Menu management" })).toBeVisible();
    await noHorizontalScroll(page, "menu-management", width);
  });
}
