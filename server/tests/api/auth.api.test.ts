// TEST-A01..TEST-A05 — docs/sprints/sprint-1/sts.md (AC-01..AC-04, AC-06)
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { DEMO_PASSWORD, USERS, loginAs } from "../helpers/agents.js";

afterAll(async () => {
  await prisma.$disconnect();
  sessionStore.close();
});

describe("POST /api/auth/login", () => {
  it("TEST-A01 valid credentials return the safe profile and an httpOnly session cookie (AC-01)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: USERS.alice, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: expect.any(Number), name: "Alice Customer", email: USERS.alice, role: "CUSTOMER" });
    expect(res.body).not.toHaveProperty("passwordHash");
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("accepts the e-mail in any letter case", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "ALICE@Cafe.Test", password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
  });

  it("TEST-A02 wrong password, unknown e-mail and inactive account give the same 401 (AC-02)", async () => {
    const attempts = [
      { email: USERS.alice, password: "wrong-password" },
      { email: "nobody@cafe.test", password: DEMO_PASSWORD },
      { email: USERS.oscarInactive, password: DEMO_PASSWORD },
    ];
    const bodies = [];
    for (const a of attempts) {
      const res = await request(app).post("/api/auth/login").send(a);
      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
      bodies.push(res.body);
    }
    expect(bodies[0]).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
  });

  it("rejects a missing e-mail or password with 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: USERS.alice });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});

describe("Session lifecycle", () => {
  it("TEST-A04 /api/auth/me returns the profile with a session and 401 without (AC-04)", async () => {
    const agent = await loginAs(USERS.olivia);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: USERS.olivia, role: "OPERATOR" });

    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("TEST-A03 logout destroys the session; the old cookie is rejected afterwards (AC-03, NFR-04)", async () => {
    const agent = await loginAs(USERS.alice);
    expect((await agent.get("/api/auth/me")).status).toBe(200);

    const out = await agent.post("/api/auth/logout");
    expect(out.status).toBe(204);

    const after = await agent.get("/api/auth/me");
    expect(after.status).toBe(401);
  });

  it("a deactivated user loses access on the next request", async () => {
    const agent = await loginAs(USERS.carol);
    await prisma.user.update({ where: { email: USERS.carol }, data: { isActive: false } });
    try {
      expect((await agent.get("/api/auth/me")).status).toBe(401);
    } finally {
      await prisma.user.update({ where: { email: USERS.carol }, data: { isActive: true } });
    }
  });
});

describe("Password storage", () => {
  it("TEST-A05 passwords are bcrypt hashes with cost ≥ 10 and are never returned (AC-06, NFR-03)", async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect(u.passwordHash).toMatch(/^\$2[aby]\$(\d{2})\$/);
      expect(Number(u.passwordHash.slice(4, 6))).toBeGreaterThanOrEqual(10);
      expect(u.passwordHash).not.toContain(DEMO_PASSWORD);
    }
    expect(await bcrypt.compare(DEMO_PASSWORD, users[0].passwordHash)).toBe(true);

    const agent = await loginAs(USERS.alice);
    const me = await agent.get("/api/auth/me");
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
