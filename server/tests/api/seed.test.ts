// TEST-D01 (AC-40) and TEST-A05 data part — docs/sprints/sprint-1/sts.md
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "../../src/prisma.js";

async function counts() {
  return {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    items: await prisma.menuItem.count(),
    orders: await prisma.order.count(),
    lines: await prisma.orderLine.count(),
    history: await prisma.orderStatusChange.count(),
  };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("TEST-D01 — seed is idempotent and covers the Sprint 1 scenarios (AC-40)", () => {
  it("running the seed again leaves identical counts", async () => {
    const before = await counts();
    execSync("npx tsx prisma/seed.ts", { stdio: "ignore", env: process.env });
    const after = await counts();
    expect(after).toEqual(before);
    expect(before).toMatchObject({ users: 5, categories: 4, items: 15 });
  }, 60000);

  it("has two sold-out items, an inactive operator and orders for two customers", async () => {
    expect(await prisma.menuItem.count({ where: { isAvailable: false } })).toBe(2);
    expect(await prisma.user.count({ where: { role: "OPERATOR", isActive: false } })).toBe(1);
    const customersWithOrders = await prisma.order.groupBy({ by: ["customerId"] });
    expect(customersWithOrders.length).toBe(2);
  });

  it("stores sample order totals consistent with their lines (BR-01)", async () => {
    const orders = await prisma.order.findMany({ include: { lines: true } });
    for (const o of orders) {
      expect(o.totalSatang).toBe(o.lines.reduce((s, l) => s + l.unitPriceSatang * l.quantity, 0));
    }
  });
});
