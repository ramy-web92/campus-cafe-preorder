// TEST-P01..TEST-P06 — docs/sprints/sprint-2/sts.md (F-10, AC-80..AC-85)
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
let latteId: number;

type Target = "SUBMITTED" | "ACCEPTED" | "PREPARING" | "READY" | "PICKED_UP" | "REJECTED" | "CANCELLED";
/** Creates one of alice's orders through the API and brings it to the wanted status. */
async function orderIn(target: Target): Promise<number> {
  const res = await alice.post("/api/orders").send({ lines: [{ menuItemId: latteId, quantity: 1 }] });
  expect(res.status).toBe(201);
  const id: number = res.body.order.id;
  const ok = (r: { status: number }) => expect(r.status).toBe(200);
  if (target === "SUBMITTED") return id;
  if (target === "REJECTED") return ok(await olivia.post(`/api/operator/orders/${id}/reject`).send({ reason: "Test" })), id;
  if (target === "CANCELLED") return ok(await alice.post(`/api/orders/${id}/cancel`)), id;
  ok(await olivia.post(`/api/operator/orders/${id}/accept`));
  for (const step of ["PREPARING", "READY", "PICKED_UP"] as const) {
    if (target === "ACCEPTED") break;
    ok(await olivia.post(`/api/operator/orders/${id}/status`).send({ status: step }));
    if (step === target) break;
  }
  return id;
}
const pay = (id: number, agent: Agent = alice) => agent.post(`/api/orders/${id}/pay`);
const stored = (id: number) => prisma.order.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  olivia = await loginAs(USERS.olivia);
  alice = await loginAs(USERS.alice);
  bob = await loginAs(USERS.bob);
  latteId = (await prisma.menuItem.findFirstOrThrow({ where: { name: "Iced Latte" } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  sessionStore.close();
});

describe("POST /api/orders/:id/pay (FR-14, BR-13)", () => {
  it("TEST-P01 the owner pays a Submitted order; the order status does not change (AC-80)", async () => {
    const id = await orderIn("SUBMITTED");
    const res = await pay(id);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ status: "SUBMITTED", paymentStatus: "PAID", paidAt: expect.any(String) });
    const order = await stored(id);
    expect(order).toMatchObject({ status: "SUBMITTED", paymentStatus: "PAID" });
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(order.version).toBe(1); // payment is not a status change
  });

  it("TEST-P02 Accepted, Preparing and Ready orders can be paid (AC-81)", async () => {
    for (const status of ["ACCEPTED", "PREPARING", "READY"] as const) {
      const id = await orderIn(status);
      const res = await pay(id);
      expect(res.status).toBe(200);
      expect((await stored(id)).paymentStatus).toBe("PAID");
    }
  });

  it("TEST-P03 a paid, cancelled, rejected or picked-up order cannot be paid (AC-82)", async () => {
    const paid = await orderIn("SUBMITTED");
    await pay(paid);
    const paidAt = (await stored(paid)).paidAt;
    const again = await pay(paid);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("PAYMENT_NOT_ALLOWED");
    expect((await stored(paid)).paidAt).toEqual(paidAt);

    for (const status of ["CANCELLED", "REJECTED", "PICKED_UP"] as const) {
      const id = await orderIn(status);
      const res = await pay(id);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("PAYMENT_NOT_ALLOWED");
      expect((await stored(id)).paymentStatus).toBe("UNPAID");
    }
  });

  it("TEST-P04 cancelling or rejecting a paid order refunds it; an unpaid one stays unpaid (AC-83)", async () => {
    const byCustomer = await orderIn("SUBMITTED");
    await pay(byCustomer);
    expect((await alice.post(`/api/orders/${byCustomer}/cancel`)).status).toBe(200);
    expect(await stored(byCustomer)).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });

    const rejected = await orderIn("SUBMITTED");
    await pay(rejected);
    expect((await olivia.post(`/api/operator/orders/${rejected}/reject`).send({ reason: "Sold out" })).status).toBe(200);
    expect(await stored(rejected)).toMatchObject({ status: "REJECTED", paymentStatus: "REFUNDED" });

    const byCafe = await orderIn("ACCEPTED");
    await pay(byCafe);
    const res = await olivia.post(`/api/operator/orders/${byCafe}/cancel`).send({ reason: "Oven broken" });
    expect(res.status).toBe(200);
    expect(res.body.order.paymentStatus).toBe("REFUNDED");
    expect(await stored(byCafe)).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });

    const unpaid = await orderIn("CANCELLED");
    expect((await stored(unpaid)).paymentStatus).toBe("UNPAID");
  });

  it("TEST-P05 only the owner can pay (AC-84)", async () => {
    const id = await orderIn("SUBMITTED");
    expect((await pay(id, bob)).status).toBe(404);
    expect((await pay(id, olivia)).status).toBe(403);
    expect((await request(app).post(`/api/orders/${id}/pay`)).status).toBe(401);
    expect((await pay(99999999)).status).toBe(404);
    expect((await stored(id)).paymentStatus).toBe("UNPAID");
  });

  it("TEST-P06 every order object shows its payment status; seeded orders are unpaid (AC-85)", async () => {
    const list = await alice.get("/api/orders");
    expect(list.body.orders.length).toBeGreaterThan(0);
    expect(list.body.orders.every((o: any) => ["UNPAID", "PAID", "REFUNDED"].includes(o.paymentStatus))).toBe(true);
    const queue = await olivia.get("/api/operator/orders");
    expect(queue.body.orders.every((o: any) => typeof o.paymentStatus === "string")).toBe(true);
    const detail = await olivia.get(`/api/operator/orders/${queue.body.orders[0].id}`);
    expect(detail.body.order).toHaveProperty("paymentStatus");
    expect(detail.body.order).toHaveProperty("paidAt");

    const seeded = await prisma.order.findMany({ where: { orderNumber: { startsWith: "ORD-" } }, orderBy: { id: "asc" }, take: 4 });
    expect(seeded.map((o) => o.paymentStatus)).toEqual(["UNPAID", "UNPAID", "UNPAID", "UNPAID"]);
  });
});
