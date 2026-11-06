// Idempotent seed (docs/sprints/sprint-1/F-16-setup.md). Safe to run any number of times.
// Synthetic demo data only — the demo password is for local development.
import bcrypt from "bcryptjs";
import { PrismaClient, Role, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();
export const DEMO_PASSWORD = "Cafe1234!";

const users = [
  { email: "alice@cafe.test", name: "Alice Customer", role: Role.CUSTOMER, isActive: true },
  { email: "bob@cafe.test", name: "Bob Customer", role: Role.CUSTOMER, isActive: true },
  { email: "carol@cafe.test", name: "Carol Customer", role: Role.CUSTOMER, isActive: true },
  { email: "olivia@cafe.test", name: "Olivia Operator", role: Role.OPERATOR, isActive: true },
  { email: "oscar@cafe.test", name: "Oscar Operator", role: Role.OPERATOR, isActive: false },
];

const menu: Record<string, { sortOrder: number; items: [string, string, number, boolean][] }> = {
  Coffee: {
    sortOrder: 1,
    items: [
      ["Espresso", "Single shot", 4500, true],
      ["Americano", "Hot or iced", 5000, true],
      ["Iced Latte", "Double shot, fresh milk", 6500, true],
      ["Cappuccino", "Milk foam, cocoa", 6000, true],
      ["Mocha", "Chocolate and espresso", 7000, false],
    ],
  },
  "Tea & Others": {
    sortOrder: 2,
    items: [
      ["Thai Tea", "Classic, less sweet on request", 5500, true],
      ["Matcha Latte", "Japanese matcha, fresh milk", 7500, false],
      ["Lemon Soda", "Fresh lemon, soda", 4500, true],
    ],
  },
  Bakery: {
    sortOrder: 3,
    items: [
      ["Croissant", "Butter croissant", 4500, true],
      ["Banana Cake", "Homemade slice", 5000, true],
      ["Chocolate Muffin", "Double chocolate", 5500, true],
    ],
  },
  Meals: {
    sortOrder: 4,
    items: [
      ["Chicken Basil Rice", "Pad kra pao with fried egg", 6500, true],
      ["Tuna Sandwich", "Whole-wheat bread", 7500, true],
      ["Caesar Salad", "Chicken, parmesan", 8900, true],
      ["Tom Yum Noodles", "Spicy shrimp noodle soup", 7900, true],
    ],
  },
};

// Sample orders on a fixed past date, so their numbers never clash with real orders.
const sampleOrders: { number: string; customer: string; status: OrderStatus; lines: [string, number][]; note?: string }[] = [
  { number: "ORD-20261101-0001", customer: "alice@cafe.test", status: OrderStatus.SUBMITTED, lines: [["Iced Latte", 2], ["Croissant", 1]], note: "Less ice" },
  { number: "ORD-20261101-0002", customer: "alice@cafe.test", status: OrderStatus.SUBMITTED, lines: [["Thai Tea", 1]] },
  { number: "ORD-20261101-0003", customer: "alice@cafe.test", status: OrderStatus.ACCEPTED, lines: [["Chicken Basil Rice", 1], ["Americano", 1]] },
  { number: "ORD-20261101-0004", customer: "bob@cafe.test", status: OrderStatus.SUBMITTED, lines: [["Cappuccino", 1], ["Banana Cake", 2]] },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const userIds: Record<string, number> = {};
  for (const u of users) {
    const saved = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: u.isActive },
      create: { ...u, passwordHash },
    });
    userIds[u.email] = saved.id;
  }

  const items: Record<string, { id: number; name: string; priceSatang: number }> = {};
  for (const [categoryName, c] of Object.entries(menu)) {
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: { sortOrder: c.sortOrder },
      create: { name: categoryName, sortOrder: c.sortOrder },
    });
    for (const [name, description, priceSatang, isAvailable] of c.items) {
      const item = await prisma.menuItem.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: { description, priceSatang, isAvailable },
        create: { categoryId: category.id, name, description, priceSatang, isAvailable },
      });
      items[name] = item;
    }
  }

  const operatorId = userIds["olivia@cafe.test"];
  for (const o of sampleOrders) {
    const exists = await prisma.order.findUnique({ where: { orderNumber: o.number } });
    if (exists) continue;
    const lines = o.lines.map(([name, quantity]) => ({
      menuItemId: items[name].id,
      itemName: items[name].name,
      unitPriceSatang: items[name].priceSatang,
      quantity,
      lineTotalSatang: items[name].priceSatang * quantity,
    }));
    const customerId = userIds[o.customer];
    const createdAt = new Date("2026-11-01T02:00:00.000Z");
    const history: { fromStatus: OrderStatus | null; toStatus: OrderStatus; actorId: number; createdAt: Date }[] = [
      { fromStatus: null, toStatus: OrderStatus.SUBMITTED, actorId: customerId, createdAt },
    ];
    if (o.status === OrderStatus.ACCEPTED) {
      history.push({ fromStatus: OrderStatus.SUBMITTED, toStatus: OrderStatus.ACCEPTED, actorId: operatorId, createdAt: new Date(createdAt.getTime() + 5 * 60_000) });
    }
    await prisma.order.create({
      data: {
        orderNumber: o.number,
        customerId,
        status: o.status,
        totalSatang: lines.reduce((sum, l) => sum + l.lineTotalSatang, 0),
        note: o.note ?? null,
        version: history.length,
        acceptedAt: o.status === OrderStatus.ACCEPTED ? history[1].createdAt : null,
        createdAt,
        lines: { create: lines },
        statusChanges: { create: history },
      },
    });
  }

  console.log("Seed complete: 5 users, 4 categories, 15 menu items (2 sold out), 4 sample orders.");
  console.log(`Demo password for every seeded account (local only): ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
