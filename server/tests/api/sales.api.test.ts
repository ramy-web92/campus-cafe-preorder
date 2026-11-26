// TEST-SS01..TEST-SS05 — docs/sprints/sprint-3/sts.md (F-12, AC-110..AC-115)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

type Agent = Awaited<ReturnType<typeof loginAs>>;
let olivia: Agent;
let alice: Agent;
let aliceId: number;
let oliviaId: number;
const item: Record<string, number> = {};
const inserted: number[] = [];
const DAY = "2025-06-10"; // a past day used only by this file
const at = (hh: number, mm = 0) => new Date(Date.UTC(2025, 5, 10, hh - 7, mm)); // hh:mm Bangkok on DAY
let seq = 0;

/** Inserts an order with given lines; when `pickedUpAt` is set, its history ends with READY → PICKED_UP at that time. */
async function insertOrder(status: string, lines: [string, number, number][], pickedUpAt?: Date, paymentStatus = "UNPAID") {
  const createdAt = at(8);
  const o = await prisma.order.create({
    data: {
      orderNumber: `ORD-SALES-${++seq}`,
      customerId: aliceId,
      status: status as any,
      paymentStatus: paymentStatus as any,
      totalSatang: lines.reduce((s, [, q, p]) => s + q * p, 0),
      createdAt,
      pickupAt: createdAt,
      lines: { create: lines.map(([name, quantity, price]) => ({ menuItemId: item[name], itemName: name, unitPriceSatang: price, quantity, lineTotalSatang: quantity * price })) },
      statusChanges: {
        create: [
          { toStatus: "SUBMITTED", actorId: aliceId, createdAt },
          ...(pickedUpAt ? [{ fromStatus: "READY" as const, toStatus: "PICKED_UP" as const, actorId: oliviaId, createdAt: pickedUpAt }] : []),
        ],
      },
    },
  });
  inserted.push(o.id);
  return o.id;
}

beforeAll(async () => {
  olivia = await loginAs(USERS.olivia);
  alice = await loginAs(USERS.alice);
  aliceId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.alice } })).id;
  oliviaId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.olivia } })).id;
  for (const i of await prisma.menuItem.findMany()) item[i.name] = i.id;

  // AC-110: two picked-up orders (65.00 + 110.00 THB), one cancelled paid order, one Ready order
  await insertOrder("PICKED_UP", [["Iced Latte", 1, 6500]], at(9));
  await insertOrder("PICKED_UP", [["Croissant", 2, 5500]], at(23, 30)); // 23:30 Bangkok, still DAY
  await insertOrder("CANCELLED", [["Iced Latte", 3, 6500]], undefined, "REFUNDED");
  await insertOrder("READY", [["Iced Latte", 4, 6500]]);
  // picked up just after midnight Bangkok: belongs to the next day
  await insertOrder("PICKED_UP", [["Iced Latte", 9, 6500]], new Date(Date.UTC(2025, 5, 10, 17, 5)));
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: inserted } } });
  await prisma.$disconnect();
  sessionStore.close();
});

describe("GET /api/operator/sales (FR-16, BR-16)", () => {
  it("TEST-SS01 counts only orders picked up that day and sums their totals (AC-110)", async () => {
    const res = await olivia.get(`/api/operator/sales?date=${DAY}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ date: DAY, completedOrders: 2, revenueSatang: 17500 });
  });

  it("TEST-SS02 uses the stored line totals, not today's menu prices (AC-111, BR-02)", async () => {
    const menuLatte = await prisma.menuItem.findUniqueOrThrow({ where: { id: item["Iced Latte"] } });
    expect(menuLatte.priceSatang).not.toBe(5000);
    await insertOrder("PICKED_UP", [["Iced Latte", 2, 5000]], at(12)); // sold at an older price
    const res = await olivia.get(`/api/operator/sales?date=${DAY}`);
    expect(res.body.completedOrders).toBe(3);
    expect(res.body.revenueSatang).toBe(17500 + 10000);
    expect(res.body.topItems.find((t: any) => t.itemName === "Iced Latte")).toMatchObject({ quantity: 3, revenueSatang: 6500 + 10000 });
  });

  it("TEST-SS03 lists at most 5 top items by quantity, ties by name (AC-112)", async () => {
    await insertOrder("PICKED_UP", [["Espresso", 4, 4500], ["Thai Tea", 4, 5500], ["Matcha Latte", 1, 7500], ["Americano", 1, 5500]], at(15));
    const res = await olivia.get(`/api/operator/sales?date=${DAY}`);
    const names = res.body.topItems.map((t: any) => t.itemName);
    expect(names).toHaveLength(5);
    expect(names.slice(0, 3)).toEqual(["Espresso", "Thai Tea", "Iced Latte"]);
    expect(names.slice(3)).toEqual(["Croissant", "Americano"]); // Croissant 2; Americano and Matcha Latte 1 → Americano by name
    expect(res.body.topItems[0]).toMatchObject({ itemName: "Espresso", quantity: 4, revenueSatang: 18000 });
  });

  it("TEST-SS04 an empty day gives zeros; invalid dates 422; customers 403, anonymous 401 (AC-113, AC-115)", async () => {
    const empty = await olivia.get("/api/operator/sales?date=2025-06-09");
    expect(empty.body).toEqual({ date: "2025-06-09", completedOrders: 0, revenueSatang: 0, topItems: [] });
    const bad = await olivia.get("/api/operator/sales?date=2026-02-30");
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.fields.date).toBe("Use a date in the format YYYY-MM-DD.");
    expect((await alice.get(`/api/operator/sales?date=${DAY}`)).status).toBe(403);
    expect((await alice.get("/api/operator/dashboard")).status).toBe(403);
    expect((await request(app).get("/api/operator/sales")).status).toBe(401);
    expect((await request(app).get("/api/operator/dashboard")).status).toBe(401);
  });
});

describe("GET /api/operator/dashboard (FR-19)", () => {
  it("TEST-SS05 returns today's count for each of the 7 statuses, equal to the database (AC-114)", async () => {
    await alice.post("/api/orders").send({ lines: [{ menuItemId: item["Iced Latte"], quantity: 1 }] });
    const res = await olivia.get("/api/operator/dashboard");
    expect(res.status).toBe(200);
    const statuses = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"];
    expect(Object.keys(res.body.counts).sort()).toEqual([...statuses].sort());

    const local = new Date(Date.now() + 7 * 3600_000);
    const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 7 * 3600_000);
    const end = new Date(start.getTime() + 24 * 3600_000);
    for (const s of statuses) {
      expect(res.body.counts[s]).toBe(await prisma.order.count({ where: { status: s as any, createdAt: { gte: start, lt: end } } }));
    }
    expect(res.body.counts.SUBMITTED).toBeGreaterThan(0);
  });
});
