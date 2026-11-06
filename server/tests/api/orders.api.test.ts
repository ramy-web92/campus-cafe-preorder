// TEST-O01..TEST-O08 — docs/sprints/sprint-1/sts.md (AC-11..AC-18)
// (TEST-O10..O12 for F-05 are added by issue #7.)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

let alice: Awaited<ReturnType<typeof loginAs>>;
let aliceId: number;
let bobId: number;
const id: Record<string, number> = {};

async function itemId(name: string) {
  return (await prisma.menuItem.findFirstOrThrow({ where: { name } })).id;
}
async function rowCounts() {
  return { orders: await prisma.order.count(), lines: await prisma.orderLine.count(), history: await prisma.orderStatusChange.count() };
}

beforeAll(async () => {
  alice = await loginAs(USERS.alice);
  aliceId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.alice } })).id;
  bobId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.bob } })).id;
  for (const n of ["Iced Latte", "Croissant", "Espresso", "Mocha", "Thai Tea"]) id[n] = await itemId(n);
});

afterAll(async () => {
  // restore the price changed by TEST-O04
  await prisma.menuItem.update({ where: { id: id["Thai Tea"] }, data: { priceSatang: 5500 } });
  await prisma.$disconnect();
  sessionStore.close();
});

const submit = (body: unknown) => alice.post("/api/orders").send(body);

describe("POST /api/orders — valid orders", () => {
  it("TEST-O01 stores a submitted order for the session customer (AC-11)", async () => {
    const res = await submit({ lines: [{ menuItemId: id["Iced Latte"], quantity: 2 }, { menuItemId: id["Croissant"], quantity: 1 }], note: "Less ice" });
    expect(res.status).toBe(201);
    const order = res.body.order;
    expect(order).toMatchObject({ status: "SUBMITTED", note: "Less ice" });
    expect(order.lines).toHaveLength(2);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { lines: true, statusChanges: true } });
    expect(stored.customerId).toBe(aliceId);
    expect(stored.lines).toHaveLength(2);
    expect(stored.statusChanges).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "SUBMITTED", actorId: aliceId })]);
  });

  it("TEST-O02 computes line totals and the total from database prices (AC-12)", async () => {
    const res = await submit({ lines: [{ menuItemId: id["Iced Latte"], quantity: 2 }, { menuItemId: id["Croissant"], quantity: 1 }] });
    expect(res.status).toBe(201);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id }, include: { lines: { orderBy: { id: "asc" } } } });
    expect(stored.totalSatang).toBe(17500);
    expect(stored.lines.map((l) => [l.unitPriceSatang, l.quantity, l.lineTotalSatang])).toEqual([[6500, 2, 13000], [4500, 1, 4500]]);
  });

  it("TEST-O03 ignores client-sent prices, totals, status and customer (AC-13)", async () => {
    const res = await submit({
      lines: [{ menuItemId: id["Iced Latte"], quantity: 2, unitPriceSatang: 1, lineTotalSatang: 2 }, { menuItemId: id["Croissant"], quantity: 1, unitPriceSatang: 1 }],
      totalSatang: 1, status: "ACCEPTED", customerId: bobId, orderNumber: "ORD-HACKED",
    });
    expect(res.status).toBe(201);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } });
    expect(stored).toMatchObject({ totalSatang: 17500, status: "SUBMITTED", customerId: aliceId });
    expect(stored.orderNumber).not.toBe("ORD-HACKED");
  });

  it("TEST-O04 keeps the price snapshot when the menu price changes later (AC-14, BR-02)", async () => {
    const res = await submit({ lines: [{ menuItemId: id["Thai Tea"], quantity: 2 }] });
    expect(res.status).toBe(201);
    await prisma.menuItem.update({ where: { id: id["Thai Tea"] }, data: { priceSatang: 9900 } });

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id }, include: { lines: true } });
    expect(stored.lines[0]).toMatchObject({ itemName: "Thai Tea", unitPriceSatang: 5500, lineTotalSatang: 11000 });
    expect(stored.totalSatang).toBe(11000);
  });

  it("TEST-O05 accepts the boundary quantities 1 and 10 (AC-15)", async () => {
    const res = await submit({ lines: [{ menuItemId: id["Espresso"], quantity: 1 }, { menuItemId: id["Croissant"], quantity: 10 }] });
    expect(res.status).toBe(201);
    expect(res.body.order.totalSatang).toBe(4500 + 45000);
  });
});

describe("POST /api/orders — rejected orders store nothing", () => {
  it.each([0, 11, 1.5, -1, "2"])("TEST-O05 rejects quantity %s with 422 (AC-15)", async (quantity) => {
    const before = await rowCounts();
    const res = await submit({ lines: [{ menuItemId: id["Espresso"], quantity }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.fields["lines[0].quantity"]).toBeDefined();
    expect(await rowCounts()).toEqual(before);
  });

  it("TEST-O06 rejects 0 lines, 21 lines and duplicate items (AC-16)", async () => {
    const before = await rowCounts();
    const allItems = await prisma.menuItem.findMany({ where: { isAvailable: true } });
    const twentyOne = Array.from({ length: 21 }, (_, i) => ({ menuItemId: allItems[i % allItems.length].id + 1000 * i, quantity: 1 }));
    for (const body of [
      { lines: [] },
      { lines: twentyOne },
      { lines: [{ menuItemId: id["Espresso"], quantity: 1 }, { menuItemId: id["Espresso"], quantity: 2 }] },
    ]) {
      const res = await submit(body);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await rowCounts()).toEqual(before);
  });

  it("TEST-O07 rejects a sold-out or unknown item and stores no order, line or history (AC-17, NFR-05)", async () => {
    const before = await rowCounts();
    const soldOut = await submit({ lines: [{ menuItemId: id["Espresso"], quantity: 1 }, { menuItemId: id["Mocha"], quantity: 1 }] });
    expect(soldOut.status).toBe(422);
    expect(soldOut.body.error.code).toBe("ITEM_UNAVAILABLE");
    expect(soldOut.body.error.details.items).toEqual([{ menuItemId: id["Mocha"], name: "Mocha" }]);

    const unknown = await submit({ lines: [{ menuItemId: 999999, quantity: 1 }] });
    expect(unknown.status).toBe(422);
    expect(unknown.body.error.details.items).toEqual([{ menuItemId: 999999, name: null }]);

    expect(await rowCounts()).toEqual(before);
  });
});

describe("Order numbers", () => {
  it("TEST-O08 follow ORD-YYYYMMDD-NNNN and increase by one within the day (AC-18)", async () => {
    const a = await submit({ lines: [{ menuItemId: id["Espresso"], quantity: 1 }] });
    const b = await submit({ lines: [{ menuItemId: id["Espresso"], quantity: 1 }] });
    const re = /^ORD-(\d{8})-(\d{4})$/;
    const [, dayA, seqA] = a.body.order.orderNumber.match(re);
    const [, dayB, seqB] = b.body.order.orderNumber.match(re);
    expect(dayB).toBe(dayA);
    expect(Number(seqB)).toBe(Number(seqA) + 1);
  });
});
