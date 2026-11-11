// Test helpers: log in as a seeded user and keep the session cookie (supertest agent).
import request from "supertest";
import { app } from "../../src/app.js";

// Same value as the one the seed used for the test database (server/.env.test or the CI env).
export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";
if (!DEMO_PASSWORD) throw new Error("DEMO_USER_PASSWORD is not set for the tests (see server/.env.test.example).");
export const USERS = {
  alice: "alice@cafe.test",
  bob: "bob@cafe.test",
  carol: "carol@cafe.test",
  olivia: "olivia@cafe.test",
  oscarInactive: "oscar@cafe.test",
} as const;

export async function loginAs(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: DEMO_PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status}`);
  return agent;
}
