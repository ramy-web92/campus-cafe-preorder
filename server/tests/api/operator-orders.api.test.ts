// TEST-Q01..TEST-Q05 — docs/sprints/sprint-1/sts.md (AC-30..AC-35)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

let olivia: Awaited<ReturnType<typeof loginAs>>;
let alice: Awaited<ReturnType<typeof loginAs>>;
let oliviaId: number;
let latteId: number;

async function newSubmittedOrder() {
  const res = await alice.post("/api/orders").send({ lines: [{ menuItemId: latteId, quantity: 1 }] });
  expect(res.status).toBe(201);
  return res.body.order as { id: number; orderNumber: string };
}

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

describe("GET /api/operator/orders", () => {
  it("TEST-Q01 lists Submitted orders oldest first by default, and filters by status (AC-30)", async () => {
    const res = await olivia.get("/api/operator/orders");
    expect(res.status).toBe(200);
    const orders = res.body.orders;
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every((o: any) => o.status === "SUBMITTED")).toBe(true);
    const times = orders.map((o: any) => new Date(o.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(orders[0]).toMatchObject({ customerName: expect.any(String), itemCount: expect.any(Number), totalSatang: expect.any(Number) });
    expect(res.body.pagination.totalItems).toBe(await prisma.order.count({ where: { status: "SUBMITTED" } }));

    const accepted = await olivia.get("/api/operator/orders?status=ACCEPTED");
    expect(accepted.status).toBe(200);
    expect(accepted.body.orders.length).toBeGreaterThan(0);
    expect(accepted.body.orders.every((o: any) => o.status === "ACCEPTED")).toBe(true);
  });

  it("rejects an unknown status filter with 422", async () => {
    const res = await olivia.get("/api/operator/orders?status=DELIVERED");
    expect(res.status).toBe(422);
  });

  it("returns any order's detail with the customer name", async () => {
    const order = await newSubmittedOrder();
    const res = await olivia.get(`/api/operator/orders/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ id: order.id, status: "SUBMITTED", customer: { name: "Alice Customer" } });
    expect((await olivia.get("/api/operator/orders/99999999")).status).toBe(404);
  });
});

describe("POST /api/operator/orders/:id/accept", () => {
  it("TEST-Q02 accepts a Submitted order, records history, and the customer sees it (AC-31, AC-35)", async () => {
    const order = await newSubmittedOrder();
    const res = await olivia.post(`/api/operator/orders/${order.id}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ id: order.id, status: "ACCEPTED", acceptedAt: expect.any(String) });

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe("ACCEPTED");
    expect(stored.acceptedAt).not.toBeNull();
    expect(stored.version).toBe(2);
    const history = await prisma.orderStatusChange.findMany({ where: { orderId: order.id, toStatus: "ACCEPTED" } });
    expect(history).toEqual([expect.objectContaining({ fromStatus: "SUBMITTED", toStatus: "ACCEPTED", actorId: oliviaId })]);

    const seenByCustomer = await alice.get(`/api/orders/${order.id}`);
    expect(seenByCustomer.body.order.status).toBe("ACCEPTED");
    expect(seenByCustomer.body.order.history.map((h: any) => h.toStatus)).toEqual(["SUBMITTED", "ACCEPTED"]);
  });

  it("TEST-Q03 refuses to accept an order that is already Accepted (AC-32)", async () => {
    const order = await newSubmittedOrder();
    await olivia.post(`/api/operator/orders/${order.id}/accept`);
    const before = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const historyBefore = await prisma.orderStatusChange.count({ where: { orderId: order.id } });

    const again = await olivia.post(`/api/operator/orders/${order.id}/accept`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVALID_TRANSITION");

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.version).toBe(before.version);
    expect(await prisma.orderStatusChange.count({ where: { orderId: order.id } })).toBe(historyBefore);
  });

  it("TEST-Q04 a Customer gets 403 and an anonymous request 401; the order stays Submitted (AC-33)", async () => {
    const order = await newSubmittedOrder();
    expect((await alice.post(`/api/operator/orders/${order.id}/accept`)).status).toBe(403);
    expect((await alice.get("/api/operator/orders")).status).toBe(403);
    expect((await request(app).post(`/api/operator/orders/${order.id}/accept`)).status).toBe(401);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("SUBMITTED");
  });

  it("TEST-Q05 two simultaneous accepts: exactly one succeeds and one history entry is written (AC-34)", async () => {
    const order = await newSubmittedOrder();
    const second = await loginAs(USERS.olivia); // a second operator session
    const [a, b] = await Promise.all([
      olivia.post(`/api/operator/orders/${order.id}/accept`),
      second.post(`/api/operator/orders/${order.id}/accept`),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await prisma.orderStatusChange.count({ where: { orderId: order.id, toStatus: "ACCEPTED" } })).toBe(1);
  });

  it("returns 404 for a missing order", async () => {
    expect((await olivia.post("/api/operator/orders/99999999/accept")).status).toBe(404);
  });
});
