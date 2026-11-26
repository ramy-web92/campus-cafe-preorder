// TEST-SF01..TEST-SF04 — docs/sprints/sprint-3/sts.md (F-13, AC-120..AC-124)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/prisma.js";
import { sessionStore } from "../../src/http/session.js";
import { USERS, loginAs } from "../helpers/agents.js";

type Agent = Awaited<ReturnType<typeof loginAs>>;
let alice: Agent;
let bob: Agent;
let olivia: Agent;
let aliceId: number;
let latteId: number;
const dated: Record<string, number> = {}; // label → order id
const inserted: number[] = [];

/** Inserts one of alice's orders with a given creation time (the API always uses "now"). */
async function insertAt(label: string, iso: string, status: "SUBMITTED" | "CANCELLED" = "SUBMITTED") {
  const createdAt = new Date(iso);
  const o = await prisma.order.create({
    data: {
      orderNumber: `ORD-SEARCH-${label}`,
      customerId: aliceId,
      status,
      totalSatang: 6500,
      createdAt,
      pickupAt: createdAt,
      lines: { create: [{ menuItemId: latteId, itemName: "Iced Latte", unitPriceSatang: 6500, quantity: 1, lineTotalSatang: 6500 }] },
      statusChanges: { create: [{ toStatus: "SUBMITTED", actorId: aliceId, createdAt }] },
    },
  });
  dated[label] = o.id;
  inserted.push(o.id);
}
const ids = (res: any) => res.body.orders.map((o: any) => o.id);

beforeAll(async () => {
  alice = await loginAs(USERS.alice);
  bob = await loginAs(USERS.bob);
  olivia = await loginAs(USERS.olivia);
  aliceId = (await prisma.user.findUniqueOrThrow({ where: { email: USERS.alice } })).id;
  latteId = (await prisma.menuItem.findFirstOrThrow({ where: { name: "Iced Latte" } })).id;
  await insertAt("D24", "2025-11-24T05:00:00.000Z"); // 24/11 12:00 Bangkok
  await insertAt("D25-LATE", "2025-11-25T16:30:00.000Z"); // 25/11 23:30 Bangkok
  await insertAt("D25-CANCELLED", "2025-11-25T03:00:00.000Z", "CANCELLED"); // 25/11 10:00 Bangkok
  await insertAt("D26-EARLY", "2025-11-25T17:10:00.000Z"); // 26/11 00:10 Bangkok
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: inserted } } });
  await prisma.$disconnect();
  sessionStore.close();
});

describe("GET /api/orders with filters (FR-17)", () => {
  it("TEST-SF01 filters by status, newest first, with a correct total (AC-120)", async () => {
    const created = await alice.post("/api/orders").send({ lines: [{ menuItemId: latteId, quantity: 1 }] });
    expect((await alice.post(`/api/orders/${created.body.order.id}/cancel`)).status).toBe(200);

    const res = await alice.get("/api/orders?status=CANCELLED");
    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders.every((o: any) => o.status === "CANCELLED")).toBe(true);
    expect(ids(res)).toContain(created.body.order.id);
    const times = res.body.orders.map((o: any) => new Date(o.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(res.body.pagination.totalItems).toBe(await prisma.order.count({ where: { customerId: aliceId, status: "CANCELLED" } }));
    expect(res.body.filters).toEqual({ status: "CANCELLED", from: null, to: null });
  });

  it("TEST-SF02 filters by Bangkok calendar days and combines filters (AC-121, AC-122)", async () => {
    const day = await alice.get("/api/orders?from=2025-11-25&to=2025-11-25");
    expect(day.status).toBe(200);
    expect(ids(day).sort()).toEqual([dated["D25-LATE"], dated["D25-CANCELLED"]].sort());

    const combined = await alice.get("/api/orders?status=SUBMITTED&from=2025-11-25&to=2025-11-25");
    expect(ids(combined)).toEqual([dated["D25-LATE"]]);

    // newest first and 10 per page: the 2025 orders are on the last page
    const fromFirst = await alice.get("/api/orders?from=2025-11-26");
    expect(fromFirst.body.pagination.totalItems).toBe(
      await prisma.order.count({ where: { customerId: aliceId, createdAt: { gte: new Date("2025-11-25T17:00:00.000Z") } } }),
    );
    const fromLast = await alice.get(`/api/orders?from=2025-11-26&page=${fromFirst.body.pagination.totalPages}`);
    expect(ids(fromLast).at(-1)).toBe(dated["D26-EARLY"]);
    expect(ids(fromLast)).not.toContain(dated["D25-LATE"]);

    const toOnly = await alice.get("/api/orders?to=2025-11-24");
    expect(ids(toOnly)).toEqual([dated["D24"]]);
  });

  it("TEST-SF03 rejects invalid filters with field messages (AC-123)", async () => {
    const cases: [string, string][] = [
      ["status=DELIVERED", "status"],
      ["from=2026-02-30", "from"],
      ["to=25/11/2026", "to"],
      ["from=2025-11-26&to=2025-11-25", "to"],
    ];
    for (const [query, field] of cases) {
      const res = await alice.get(`/api/orders?${query}`);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.fields).toHaveProperty(field);
    }
  });

  it("TEST-SF04 filters never reveal other customers' orders; operators get 403 (AC-124)", async () => {
    for (const query of ["from=2025-11-24&to=2025-11-26", "status=SUBMITTED&from=2025-11-25", "status=CANCELLED", ""]) {
      const res = await bob.get(`/api/orders?${query}`);
      expect(res.status).toBe(200);
      for (const id of Object.values(dated)) expect(ids(res)).not.toContain(id);
    }
    expect((await olivia.get("/api/orders?status=SUBMITTED")).status).toBe(403);
  });
});
