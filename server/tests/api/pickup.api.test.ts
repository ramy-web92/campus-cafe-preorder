// TEST-PT01..TEST-PT04 — docs/sprints/sprint-3/sts.md (F-11, AC-100..AC-105). Pickup slots are computed from the real
// clock so these tests pass at any hour; the exact boundaries are unit-tested with a fixed clock (TEST-K01..K04).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

type Agent = Awaited<ReturnType<typeof loginAs>>;
let alice: Agent;
let olivia: Agent;
let latteId: number;
let aliceId: number;
const inserted: number[] = [];

const BKK = 7 * 3600_000;
/** UTC instant of hh:mm Bangkok on the Bangkok day of `ref` plus `dayOffset` days. */
function bangkokTime(ref: Date, dayOffset: number, hh: number, mm: number): Date {
  const local = new Date(ref.getTime() + BKK);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayOffset, hh, mm) - BKK);
}
/** A valid slot: 30 minutes from now if that is inside 08:00–18:00 Bangkok, otherwise 09:00 on the next opening day. */
function nextValidSlot(): Date {
  const now = new Date();
  const slot = new Date(Math.ceil((now.getTime() + 30 * 60_000) / 300_000) * 300_000);
  const local = new Date(slot.getTime() + BKK);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (minutes < 8 * 60) return bangkokTime(slot, 0, 9, 0);
  if (minutes > 18 * 60) return bangkokTime(slot, 1, 9, 0);
  return slot;
}
const order = (pickupAt?: unknown) =>
  alice.post("/api/orders").send({ lines: [{ menuItemId: latteId, quantity: 1 }], ...(pickupAt !== undefined && { pickupAt }) });
const counts = async () => ({ orders: await prisma.order.count(), lines: await prisma.orderLine.count(), history: await prisma.orderStatusChange.count() });

beforeAll(async () => {
  alice = await loginAs(USERS.alice);
  olivia = await loginAs(USERS.olivia);
  latteId = (await prisma.menuItem.findFirstOrThrow({ where: { name: "Iced Latte" } })).id;
  aliceId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.alice } })).id;
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: inserted } } });
  await prisma.$disconnect();
  sessionStore.close();
});

describe("Pickup time on POST /api/orders (FR-15, BR-14)", () => {
  it("TEST-PT01 stores a valid chosen time and returns it in the detail and the list (AC-100, AC-104)", async () => {
    const slot = nextValidSlot();
    const res = await order(slot.toISOString());
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({ pickupAsap: false, pickupAt: slot.toISOString() });
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } });
    expect(stored.pickupAsap).toBe(false);
    expect(stored.pickupAt.toISOString()).toBe(slot.toISOString());

    const detail = await alice.get(`/api/orders/${res.body.order.id}`);
    expect(detail.body.order.pickupAt).toBe(slot.toISOString());
    const list = await alice.get("/api/orders");
    expect(list.body.orders.find((o: any) => o.id === res.body.order.id)).toMatchObject({ pickupAsap: false, pickupAt: slot.toISOString() });
  });

  it("TEST-PT02 rejects times outside opening hours, too soon or malformed, and stores nothing (AC-101, AC-105)", async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600_000);
    const cases: [string, string[]][] = [
      [bangkokTime(tomorrow, 0, 7, 59).toISOString(), ["Pickup time must be between 08:00 and 18:00 (Bangkok time)."]],
      [bangkokTime(tomorrow, 0, 18, 1).toISOString(), ["Pickup time must be between 08:00 and 18:00 (Bangkok time)."]],
      // now + 5 min fails the lead time, or the opening hours when the café is closed
      [new Date(Date.now() + 5 * 60_000).toISOString(), ["Pickup time must be at least 15 minutes from now.", "Pickup time must be between 08:00 and 18:00 (Bangkok time)."]],
      ["tomorrow", ["Pickup time must be a valid date and time."]],
    ];
    const before = await counts();
    for (const [pickupAt, messages] of cases) {
      const res = await order(pickupAt);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(messages).toContain(res.body.error.details.fields.pickupAt);
    }
    expect(await counts()).toEqual(before);
  });

  it("TEST-PT03 an order without a pickup time is ASAP, at any hour (AC-102, AC-104)", async () => {
    const res = await order();
    expect(res.status).toBe(201);
    expect(res.body.order.pickupAsap).toBe(true);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } });
    expect(stored.pickupAsap).toBe(true);
    expect(stored.pickupAt.getTime()).toBe(stored.createdAt.getTime());
    const seeded = await prisma.order.findMany({ where: { orderNumber: { startsWith: "ORD-" } }, orderBy: { id: "asc" }, take: 4 });
    expect(seeded.every((o) => o.pickupAsap && o.pickupAt.getTime() === o.createdAt.getTime())).toBe(true);
  });
});

describe("Queue order (FR-15, AC-30 revised)", () => {
  it("TEST-PT04 lists Submitted orders by pickup time, ASAP orders by submission time (AC-103)", async () => {
    const day = (h: number, m = 0) => new Date(Date.UTC(2020, 0, 6, h - 7, m)); // 2020-01-06 hh:mm Bangkok
    const rows = [
      { orderNumber: "ORD-20200106-9901", pickupAt: day(11), pickupAsap: false, createdAt: day(8) },
      { orderNumber: "ORD-20200106-9902", pickupAt: day(9), pickupAsap: true, createdAt: day(9) },
      { orderNumber: "ORD-20200106-9903", pickupAt: day(10), pickupAsap: false, createdAt: day(8, 30) },
    ];
    for (const r of rows) {
      const o = await prisma.order.create({
        data: {
          ...r,
          customerId: aliceId,
          status: "SUBMITTED",
          totalSatang: 6500,
          lines: { create: [{ menuItemId: latteId, itemName: "Iced Latte", unitPriceSatang: 6500, quantity: 1, lineTotalSatang: 6500 }] },
          statusChanges: { create: [{ toStatus: "SUBMITTED", actorId: aliceId, createdAt: r.createdAt }] },
        },
      });
      inserted.push(o.id);
    }
    const res = await olivia.get("/api/operator/orders");
    expect(res.status).toBe(200);
    expect(res.body.orders.slice(0, 3).map((o: any) => o.orderNumber)).toEqual(["ORD-20200106-9902", "ORD-20200106-9903", "ORD-20200106-9901"]);
    expect(res.body.orders[0]).toMatchObject({ pickupAsap: true });
    const times = res.body.orders.map((o: any) => new Date(o.pickupAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
