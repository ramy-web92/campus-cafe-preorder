// TEST-S01, TEST-S03 — docs/sprints/sprint-1/sts.md (AC-05, AC-07).
// TEST-S01 lists every protected route that exists so far; routes are added here with their features
// (menu and orders in #6/#7, operator routes in #8). TEST-S02 grows with the role-restricted routes.
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

afterAll(async () => {
  await prisma.$disconnect();
  sessionStore.close();
});

export const PROTECTED_ROUTES: Array<[method: "get" | "post", path: string]> = [
  ["get", "/api/auth/me"],
  ["post", "/api/auth/logout"],
  ["get", "/api/menu"],
  ["post", "/api/orders"],
  ["get", "/api/orders"],
  ["get", "/api/orders/1"],
];

describe("TEST-S01 — protected routes reject anonymous requests (AC-05, NFR-01)", () => {
  it.each(PROTECTED_ROUTES)("%s %s returns 401 with no private data", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(Object.keys(res.body)).toEqual(["error"]);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("TEST-S02 — role restrictions enforced by the backend (AC-19)", () => {
  it("an Operator cannot place an order and nothing is stored", async () => {
    const olivia = await loginAs(USERS.olivia);
    const before = await prisma.order.count();
    const item = await prisma.menuItem.findFirstOrThrow({ where: { isAvailable: true } });
    const res = await olivia.post("/api/orders").send({ lines: [{ menuItemId: item.id, quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await prisma.order.count()).toBe(before);
  });
});

describe("TEST-S02 — Customer-only order endpoints (AC-22)", () => {
  it("an Operator calling the customer order endpoints gets 403", async () => {
    const olivia = await loginAs(USERS.olivia);
    const order = await prisma.order.findFirstOrThrow();
    expect((await olivia.get("/api/orders")).status).toBe(403);
    expect((await olivia.get(`/api/orders/${order.id}`)).status).toBe(403);
  });
});

describe("TEST-S03 — safe error responses (AC-07, NFR-06)", () => {
  it("malformed JSON returns 400 with the standard error body", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: "BAD_REQUEST", message: expect.any(String) } });
  });

  it("an unexpected error returns 500 with a generic message, no stack trace or SQL", async () => {
    const res = await request(app).get("/api/__test__/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT|secret_table|at line|Error:/);
  });

  it("an unknown API route returns 404 with the standard error body", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
