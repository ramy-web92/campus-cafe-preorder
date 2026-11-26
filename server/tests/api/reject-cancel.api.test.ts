// TEST-R01..TEST-R08 — docs/sprints/sprint-2/sts.md (F-07, AC-50..AC-58)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

type Agent = Awaited<ReturnType<typeof loginAs>>;
let olivia: Agent;
let alice: Agent;
let bob: Agent;
let oliviaId: number;
let aliceId: number;
let latteId: number;

async function newOrder(): Promise<number> {
  const res = await alice.post("/api/orders").send({ lines: [{ menuItemId: latteId, quantity: 1 }] });
  expect(res.status).toBe(201);
  return res.body.order.id;
}
async function newAcceptedOrder(): Promise<number> {
  const id = await newOrder();
  expect((await olivia.post(`/api/operator/orders/${id}/accept`)).status).toBe(200);
  return id;
}
const stored = (id: number) => prisma.order.findUniqueOrThrow({ where: { id } });
const historyCount = (id: number) => prisma.orderStatusChange.count({ where: { orderId: id } });

beforeAll(async () => {
  olivia = await loginAs(USERS.olivia);
  alice = await loginAs(USERS.alice);
  bob = await loginAs(USERS.bob);
  oliviaId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.olivia } })).id;
  aliceId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.alice } })).id;
  latteId = (await prisma.menuItem.findFirstOrThrow({ where: { name: "Iced Latte" } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  sessionStore.close();
});

describe("Operator reject (FR-10, BR-10)", () => {
  it("TEST-R01 rejects a Submitted order with a reason and records it in the history (AC-50)", async () => {
    const id = await newOrder();
    const res = await olivia.post(`/api/operator/orders/${id}/reject`).send({ reason: "Sold out of milk" });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("REJECTED");

    const order = await stored(id);
    expect(order.status).toBe("REJECTED");
    expect(order.version).toBe(2);
    const rows = await prisma.orderStatusChange.findMany({ where: { orderId: id, toStatus: "REJECTED" } });
    expect(rows).toEqual([expect.objectContaining({ fromStatus: "SUBMITTED", actorId: oliviaId, reason: "Sold out of milk" })]);
  });

  it("TEST-R02 requires a reason of 1 to 300 characters (AC-51)", async () => {
    const id = await newOrder();
    for (const body of [{}, { reason: "" }, { reason: "   " }, { reason: "a".repeat(301) }, { reason: 42 }]) {
      const res = await olivia.post(`/api/operator/orders/${id}/reject`).send(body);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.fields.reason).toBe("Reason must be 1 to 300 characters.");
    }
    expect((await stored(id)).status).toBe("SUBMITTED");
    expect(await historyCount(id)).toBe(1);

    const ok = await olivia.post(`/api/operator/orders/${id}/reject`).send({ reason: "b".repeat(300) });
    expect(ok.status).toBe(200);
  });

  it("TEST-R03 cannot reject an order that is no longer Submitted (AC-52)", async () => {
    const accepted = await newAcceptedOrder();
    const res = await olivia.post(`/api/operator/orders/${accepted}/reject`).send({ reason: "Too late" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
    expect((await stored(accepted)).status).toBe("ACCEPTED");

    const rejected = await newOrder();
    expect((await olivia.post(`/api/operator/orders/${rejected}/reject`).send({ reason: "First" })).status).toBe(200);
    const before = await historyCount(rejected);
    expect((await olivia.post(`/api/operator/orders/${rejected}/reject`).send({ reason: "Again" })).status).toBe(409);
    expect(await historyCount(rejected)).toBe(before);
  });
});

describe("Customer cancel (FR-12)", () => {
  it("TEST-R04 the owner cancels a Submitted order but not an Accepted one (AC-53, AC-54)", async () => {
    const id = await newOrder();
    const res = await alice.post(`/api/orders/${id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("CANCELLED");
    expect((await stored(id)).status).toBe("CANCELLED");
    const rows = await prisma.orderStatusChange.findMany({ where: { orderId: id, toStatus: "CANCELLED" } });
    expect(rows).toEqual([expect.objectContaining({ fromStatus: "SUBMITTED", actorId: aliceId })]);

    const accepted = await newAcceptedOrder();
    const late = await alice.post(`/api/orders/${accepted}/cancel`);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("INVALID_TRANSITION");
    expect((await stored(accepted)).status).toBe("ACCEPTED");
  });

  it("TEST-R05 other customers, operators and anonymous users cannot cancel or reject (AC-55)", async () => {
    const id = await newOrder();
    expect((await bob.post(`/api/orders/${id}/cancel`)).status).toBe(404);
    expect((await olivia.post(`/api/orders/${id}/cancel`)).status).toBe(403);
    expect((await alice.post(`/api/operator/orders/${id}/reject`).send({ reason: "x" })).status).toBe(403);
    expect((await alice.post(`/api/operator/orders/${id}/cancel`).send({ reason: "x" })).status).toBe(403);
    expect((await request(app).post(`/api/orders/${id}/cancel`)).status).toBe(401);
    expect((await request(app).post(`/api/operator/orders/${id}/reject`).send({ reason: "x" })).status).toBe(401);
    expect((await stored(id)).status).toBe("SUBMITTED");
    expect(await historyCount(id)).toBe(1);
  });
});

describe("Operator cancel of an accepted order (BR-06)", () => {
  it("TEST-R06 cancels an Accepted order with a reason, but not a Submitted one (AC-56)", async () => {
    const id = await newAcceptedOrder();
    const res = await olivia.post(`/api/operator/orders/${id}/cancel`).send({ reason: "Oven broken" });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("CANCELLED");
    const rows = await prisma.orderStatusChange.findMany({ where: { orderId: id, toStatus: "CANCELLED" } });
    expect(rows).toEqual([expect.objectContaining({ fromStatus: "ACCEPTED", actorId: oliviaId, reason: "Oven broken" })]);

    const submitted = await newOrder();
    expect((await olivia.post(`/api/operator/orders/${submitted}/cancel`).send({ reason: "Use reject" })).status).toBe(409);
    expect((await olivia.post(`/api/operator/orders/${id}/cancel`).send({})).status).toBe(422);
    expect((await stored(submitted)).status).toBe("SUBMITTED");
  });
});

describe("Concurrency and visibility", () => {
  it("TEST-R07 a reject and an accept at the same time: exactly one wins (AC-57)", async () => {
    const id = await newOrder();
    const second = await loginAs(USERS.olivia);
    const [a, b] = await Promise.all([
      olivia.post(`/api/operator/orders/${id}/reject`).send({ reason: "Race" }),
      second.post(`/api/operator/orders/${id}/accept`),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await historyCount(id)).toBe(2);
    expect((await stored(id)).version).toBe(2);
  });

  it("TEST-R08 the customer sees the rejection and its reason (AC-58)", async () => {
    const id = await newOrder();
    await olivia.post(`/api/operator/orders/${id}/reject`).send({ reason: "Sold out" });
    const res = await alice.get(`/api/orders/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("REJECTED");
    expect(res.body.order.history.at(-1)).toMatchObject({ toStatus: "REJECTED", reason: "Sold out", actorName: "Olivia Operator" });
  });
});
