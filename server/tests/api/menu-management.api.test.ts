// TEST-MM01..TEST-MM06 — docs/sprints/sprint-2/sts.md (F-09, AC-70..AC-75)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

type Agent = Awaited<ReturnType<typeof loginAs>>;
let olivia: Agent;
let alice: Agent;
let bakeryId: number;
let coffeeId: number;
const created: number[] = [];

async function createItem(body: Record<string, unknown>) {
  const res = await olivia.post("/api/operator/menu-items").send(body);
  if (res.status === 201) created.push(res.body.item.id);
  return res;
}
const orderOne = (menuItemId: number) => alice.post("/api/orders").send({ lines: [{ menuItemId, quantity: 1 }] });

beforeAll(async () => {
  olivia = await loginAs(USERS.olivia);
  alice = await loginAs(USERS.alice);
  bakeryId = (await prisma.category.findUniqueOrThrow({ where: { name: "Bakery" } })).id;
  coffeeId = (await prisma.category.findUniqueOrThrow({ where: { name: "Coffee" } })).id;
});

// The other test files expect the seeded menu (15 items): remove what this file created.
afterAll(async () => {
  const orders = await prisma.orderLine.findMany({ where: { menuItemId: { in: created } }, select: { orderId: true } });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((o) => o.orderId) } } });
  await prisma.menuItem.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
  sessionStore.close();
});

describe("Create and edit menu items (FR-13)", () => {
  it("TEST-MM01 an Operator creates an item and Customers see it on the menu (AC-70)", async () => {
    const res = await createItem({ categoryId: bakeryId, name: "Banana Bread", description: "With walnuts", priceSatang: 5500, isAvailable: true });
    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ id: expect.any(Number), categoryId: bakeryId, name: "Banana Bread", priceSatang: 5500, isAvailable: true });
    const row = await prisma.menuItem.findUniqueOrThrow({ where: { id: res.body.item.id } });
    expect(row).toMatchObject({ name: "Banana Bread", description: "With walnuts", priceSatang: 5500 });

    const menu = await alice.get("/api/menu");
    const bakery = menu.body.categories.find((c: any) => c.id === bakeryId);
    expect(bakery.items).toContainEqual(expect.objectContaining({ name: "Banana Bread", priceSatang: 5500 }));
  });

  it("TEST-MM02 a price change applies only to orders submitted after it (AC-71, BR-12, BR-02)", async () => {
    const item = (await createItem({ categoryId: bakeryId, name: "Price Test Muffin", priceSatang: 6500 })).body.item;
    const before = await orderOne(item.id);
    expect(before.status).toBe(201);

    const patch = await olivia.patch(`/api/operator/menu-items/${item.id}`).send({ priceSatang: 7500 });
    expect(patch.status).toBe(200);
    expect(patch.body.item.priceSatang).toBe(7500);

    const after = await orderOne(item.id);
    expect(after.status).toBe(201);
    const oldOrder = await alice.get(`/api/orders/${before.body.order.id}`);
    expect(oldOrder.body.order.lines[0].unitPriceSatang).toBe(6500);
    expect(oldOrder.body.order.totalSatang).toBe(6500);
    expect(after.body.order.lines[0].unitPriceSatang).toBe(7500);
    expect(after.body.order.totalSatang).toBe(7500);
  });

  it("TEST-MM03 invalid fields are rejected with 422 and nothing changes; boundary prices are accepted (AC-72)", async () => {
    const count = await prisma.menuItem.count();
    const base = { categoryId: bakeryId, name: "Validation Scone", priceSatang: 5000 };
    const bad: [Record<string, unknown>, string][] = [
      [{ priceSatang: 0 }, "priceSatang"],
      [{ priceSatang: -100 }, "priceSatang"],
      [{ priceSatang: 100001 }, "priceSatang"],
      [{ priceSatang: 12.5 }, "priceSatang"],
      [{ priceSatang: "abc" }, "priceSatang"],
      [{ name: "" }, "name"],
      [{ name: "n".repeat(81) }, "name"],
      [{ categoryId: 999999 }, "categoryId"],
      [{ isAvailable: "yes" }, "isAvailable"],
    ];
    for (const [change, field] of bad) {
      const res = await createItem({ ...base, ...change });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.fields).toHaveProperty(field);
    }
    expect(await prisma.menuItem.count()).toBe(count);

    const item = (await createItem({ ...base, priceSatang: 1 })).body.item;
    expect(item.priceSatang).toBe(1);
    expect((await olivia.patch(`/api/operator/menu-items/${item.id}`).send({ priceSatang: 100000 })).status).toBe(200);
    for (const priceSatang of [0, 100001]) {
      expect((await olivia.patch(`/api/operator/menu-items/${item.id}`).send({ priceSatang })).status).toBe(422);
    }
    expect((await olivia.patch(`/api/operator/menu-items/${item.id}`).send({})).status).toBe(422);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).priceSatang).toBe(100000);
  });

  it("TEST-MM04 a sold-out item cannot be ordered until it is available again (AC-73, BR-05)", async () => {
    const item = (await createItem({ categoryId: bakeryId, name: "Availability Tart", priceSatang: 4000 })).body.item;
    expect((await olivia.patch(`/api/operator/menu-items/${item.id}`).send({ isAvailable: false })).status).toBe(200);
    const menu = await alice.get("/api/menu");
    const shown = menu.body.categories.flatMap((c: any) => c.items).find((i: any) => i.id === item.id);
    expect(shown.isAvailable).toBe(false);
    const refused = await orderOne(item.id);
    expect(refused.status).toBe(422);
    expect(refused.body.error.code).toBe("ITEM_UNAVAILABLE");

    expect((await olivia.patch(`/api/operator/menu-items/${item.id}`).send({ isAvailable: true })).status).toBe(200);
    expect((await orderOne(item.id)).status).toBe(201);
  });

  it("TEST-MM05 a name is unique within its category only (AC-74)", async () => {
    expect((await createItem({ categoryId: bakeryId, name: "Twin Cookie", priceSatang: 3000 })).status).toBe(201);
    const count = await prisma.menuItem.count();
    const dup = await createItem({ categoryId: bakeryId, name: "Twin Cookie", priceSatang: 3500 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("DUPLICATE_ITEM");
    expect(await prisma.menuItem.count()).toBe(count);
    expect((await createItem({ categoryId: coffeeId, name: "Twin Cookie", priceSatang: 3000 })).status).toBe(201);

    const other = (await createItem({ categoryId: bakeryId, name: "Renamed Cookie", priceSatang: 3000 })).body.item;
    const rename = await olivia.patch(`/api/operator/menu-items/${other.id}`).send({ name: "Twin Cookie" });
    expect(rename.status).toBe(409);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: other.id } })).name).toBe("Renamed Cookie");
  });

  it("TEST-MM06 only Operators can create or edit; unknown ids are 404 (AC-75)", async () => {
    const latte = await prisma.menuItem.findFirstOrThrow({ where: { name: "Iced Latte" } });
    expect((await alice.post("/api/operator/menu-items").send({ categoryId: bakeryId, name: "Hack", priceSatang: 1 })).status).toBe(403);
    expect((await alice.patch(`/api/operator/menu-items/${latte.id}`).send({ priceSatang: 1 })).status).toBe(403);
    expect((await request(app).patch(`/api/operator/menu-items/${latte.id}`).send({ priceSatang: 1 })).status).toBe(401);
    expect((await olivia.patch("/api/operator/menu-items/99999999").send({ priceSatang: 100 })).status).toBe(404);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: latte.id } })).priceSatang).toBe(latte.priceSatang);
    expect(await prisma.menuItem.count({ where: { name: "Hack" } })).toBe(0);
  });
});
