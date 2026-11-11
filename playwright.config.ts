// End-to-end tests: real browser → React client → Express API → PostgreSQL test database.
// `npm run test:e2e` resets and seeds cafe_test first (pretest:e2e), then starts both servers.
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Same settings as the server tests (DATABASE_URL, DEMO_USER_PASSWORD) — never committed.
dotenv.config({ path: "server/.env.test" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // the journeys share one seeded database
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npm --prefix server run start:test",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm --prefix client run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
