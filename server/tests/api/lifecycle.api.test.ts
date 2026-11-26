// TEST-L01..TEST-L06 — docs/sprints/sprint-2/sts.md (F-08, AC-60..AC-66)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

type Agent = Awaited<ReturnType<typeof loginAs>>;
let olivia: Agent;
let alice: Agent;
let oliviaId: number;
let latteId: number;

async function newAcceptedOrder(): Promise<number> {
  const res = await alice.post("/api/orders").send({ lines: [{ menuItemId: latteId, quantity: 1 }] });
  expect(res.status).toBe(201);
  expect((await olivia.post(`/api/operator/orders/${res.body.order.id}/accept`)).status).toBe(200);
  return res.body.order.id;
}
const move = (id: number, status: unknown, agent: Agent = olivia) => agent.post(`/api/operator/orders/${id}/status`).send({ status });
async function orderIn(status: "PREPARING" | "READY" | "PICKED_UP"): Promise<number> {
  const id = await newAcceptedOrder();
  for (const step of ["PREPARING", "READY", "PICKED_UP"]) {
    expect((await move(id, step)).status).toBe(200);
    if (step === status) break;
  }
  return id;
}
const stored = (id: number) => prisma.order.findUniqueOrThrow({ where: { id } });
const historyCount = (id: number) => prisma.orderStatusChange.count({ where: { orderId: id } });

beforeAll(async () => {
  olivia = await loginAs(USERS.olivia);
  alice = await loginAs(USERS.alice);
  oliviaId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.olivia } })).id;
  latteId = (await prisma.menuItem.findFirstOrThrow({ where: { name: "Iced Latte" } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  sessionStore.close();
});

describe("POST /api/operator/orders/:id/status (FR-11)", () => {
  it("TEST-L01 moves an order Accepted → Preparing → Ready → Picked up with one history entry each (AC-60)", async () => {
    const id = await newAcceptedOrder();
    for (const status of ["PREPARING", "READY", "PICKED_UP"]) {
      const res = await move(id, status);
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe(status);
    }
    const order = await stored(id);
    expect(order.status).toBe("PICKED_UP");
    expect(order.version).toBe(5);
    const rows = await prisma.orderStatusChange.findMany({ where: { orderId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    expect(rows.slice(2).map((r) => [r.fromStatus, r.toStatus, r.actorId])).toEqual([
      ["ACCEPTED", "PREPARING", oliviaId],
      ["PREPARING", "READY", oliviaId],
      ["READY", "PICKED_UP", oliviaId],
    ]);
  });

  it("TEST-L02 refuses to skip a step, go back, or change a final order (AC-61)", async () => {
    const accepted = await newAcceptedOrder();
    const ready = await orderIn("READY");
    const done = await orderIn("PICKED_UP");
    const cases: [number, string][] = [
      [accepted, "READY"],
      [accepted, "PICKED_UP"],
      [ready, "PREPARING"],
      [done, "READY"],
      [done, "PREPARING"],
    ];
    for (const [id, target] of cases) {
      const before = await stored(id);
      const count = await historyCount(id);
      const res = await move(id, target);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
      expect((await stored(id)).version).toBe(before.version);
      expect(await historyCount(id)).toBe(count);
    }
  });

  it("TEST-L03 accepts only PREPARING, READY or PICKED_UP as targets (AC-62)", async () => {
    const id = await newAcceptedOrder();
    for (const status of ["ACCEPTED", "CANCELLED", "DELIVERED", undefined, 3]) {
      const res = await move(id, status);
      expect(res.status).toBe(422);
      expect(res.body.error.details.fields.status).toBe("Use one of PREPARING, READY, PICKED_UP.");
    }
    expect((await stored(id)).status).toBe("ACCEPTED");
  });

  it("TEST-L04 customers get 403 and anonymous users 401 (AC-63)", async () => {
    const id = await newAcceptedOrder();
    expect((await move(id, "PREPARING", alice)).status).toBe(403);
    expect((await request(app).post(`/api/operator/orders/${id}/status`).send({ status: "PREPARING" })).status).toBe(401);
    expect((await olivia.post("/api/operator/orders/99999999/status").send({ status: "PREPARING" })).status).toBe(404);
    expect((await stored(id)).status).toBe("ACCEPTED");
  });
});

describe("History and concurrency", () => {
  it("TEST-L05 the customer sees the whole history; two simultaneous Ready requests give one success (AC-64, AC-65)", async () => {
    const id = await orderIn("PICKED_UP");
    const res = await alice.get(`/api/orders/${id}`);
    expect(res.body.order.history.map((h: any) => h.toStatus)).toEqual(["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP"]);
    expect(res.body.order.history.slice(1).every((h: any) => h.actorName === "Olivia Operator")).toBe(true);

    const preparing = await orderIn("PREPARING");
    const second = await loginAs(USERS.olivia);
    const [a, b] = await Promise.all([move(preparing, "READY"), move(preparing, "READY", second)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await prisma.orderStatusChange.count({ where: { orderId: preparing, toStatus: "READY" } })).toBe(1);
  });

  it("TEST-L06 the queue filters by Preparing and Ready (AC-66)", async () => {
    await orderIn("PREPARING");
    await orderIn("READY");
    for (const status of ["PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"]) {
      const res = await olivia.get(`/api/operator/orders?status=${status}`);
      expect(res.status).toBe(200);
      expect(res.body.orders.every((o: any) => o.status === status)).toBe(true);
      expect(res.body.pagination.totalItems).toBe(await prisma.order.count({ where: { status: status as any } }));
    }
  });
});
