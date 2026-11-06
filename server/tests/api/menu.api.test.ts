// TEST-M01 — docs/sprints/sprint-1/sts.md (AC-10)
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

afterAll(async () => {
  await prisma.$disconnect();
  sessionStore.close();
});

describe("GET /api/menu", () => {
  it("TEST-M01 returns every category in order with items, prices and availability (AC-10)", async () => {
    const alice = await loginAs(USERS.alice);
    const res = await alice.get("/api/menu");
    expect(res.status).toBe(200);

    const names = res.body.categories.map((c: any) => c.name);
    expect(names).toEqual(["Coffee", "Tea & Others", "Bakery", "Meals"]);

    const items = res.body.categories.flatMap((c: any) => c.items);
    expect(items).toHaveLength(await prisma.menuItem.count());
    const latte = items.find((i: any) => i.name === "Iced Latte");
    expect(latte).toEqual({ id: expect.any(Number), name: "Iced Latte", description: expect.any(String), priceSatang: 6500, isAvailable: true });

    const soldOut = items.filter((i: any) => !i.isAvailable).map((i: any) => i.name).sort();
    expect(soldOut).toEqual(["Matcha Latte", "Mocha"]);
  });

  it("is readable by Operators too", async () => {
    const olivia = await loginAs(USERS.olivia);
    expect((await olivia.get("/api/menu")).status).toBe(200);
  });
});
