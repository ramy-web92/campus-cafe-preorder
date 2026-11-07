// E2E-01 — docs/sprints/sprint-1/sts.md (AC-01, AC-03, AC-04)
import { test, expect } from "@playwright/test";
import { API, SHOTS, login, logout } from "./helpers";

test("E2E-01 login shows the role home; logout ends the session on the server", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-login.png` });

  // wrong password: generic error, still on the login page
  await page.getByLabel("Email").fill("alice@cafe.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");
  await page.screenshot({ path: `${SHOTS}/02-login-invalid.png` });

  await login(page, "alice@cafe.test");
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
  await expect(page.getByText("Alice Customer")).toBeVisible();

  // the session is valid on the API
  const me = await page.request.get(`${API}/api/auth/me`);
  expect(me.status()).toBe(200);

  await logout(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  // the old session is rejected by the API after logout
  const after = await page.request.get(`${API}/api/auth/me`);
  expect(after.status()).toBe(401);
  await page.goto(`${API}/api/auth/me`);
  await page.screenshot({ path: `${SHOTS}/03-after-logout-401.png` });
});
