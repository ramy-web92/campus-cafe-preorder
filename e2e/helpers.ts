import { Page, expect } from "@playwright/test";
import pg from "pg";

export const PASSWORD = "Cafe1234!"; // synthetic local seed password
export const API = "http://localhost:3000";
export const SHOTS = "artifacts/sprint-1/screenshots";

export async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

/** Direct SQL access to the test database, used only to set up a scenario (never to check the app's own writes). */
export async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://cafe:cafe@localhost:5432/cafe_test" });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}
