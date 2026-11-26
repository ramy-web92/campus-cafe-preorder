// F-12 sales summary (FR-16, BR-16) and operator dashboard (FR-19). Read-only queries; days are Bangkok days (D-07).
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { bangkokMidnight } from "./orderFilters.js";
import { ORDER_STATUSES, OrderStatus } from "./orderTransitions.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const TOP_ITEMS = 5;

/** Today's date in Bangkok as YYYY-MM-DD. */
export function bangkokToday(now = new Date()): string {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function dayRange(raw: unknown): { date: string; start: Date; end: Date } {
  const date = raw === undefined || raw === "" ? bangkokToday() : raw;
  const start = typeof date === "string" ? bangkokMidnight(date) : null;
  if (!start) throw new HttpError(422, "VALIDATION_ERROR", "Please choose a valid day.", { fields: { date: "Use a date in the format YYYY-MM-DD." } });
  return { date: date as string, start, end: new Date(start.getTime() + DAY_MS) };
}

/**
 * BR-16: only orders that are Picked up count, on the Bangkok day of their pickup (the READY → PICKED_UP history entry).
 * Revenue and item totals come from the stored order and line snapshots (BR-02), never from current menu prices.
 */
export async function salesSummary(rawDate: unknown) {
  const { date, start, end } = dayRange(rawDate);
  const pickups = await prisma.orderStatusChange.findMany({
    where: { toStatus: "PICKED_UP", createdAt: { gte: start, lt: end }, order: { status: "PICKED_UP" } },
    select: { orderId: true },
  });
  const orderIds = [...new Set(pickups.map((p) => p.orderId))];
  const orders = await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { totalSatang: true, lines: true } });

  const byItem = new Map<number, { menuItemId: number; itemName: string; quantity: number; revenueSatang: number }>();
  for (const line of orders.flatMap((o) => o.lines)) {
    const t = byItem.get(line.menuItemId) ?? { menuItemId: line.menuItemId, itemName: line.itemName, quantity: 0, revenueSatang: 0 };
    t.quantity += line.quantity;
    t.revenueSatang += line.lineTotalSatang;
    byItem.set(line.menuItemId, t);
  }
  const topItems = [...byItem.values()]
    .sort((a, b) => b.quantity - a.quantity || a.itemName.localeCompare(b.itemName))
    .slice(0, TOP_ITEMS);

  return {
    date,
    completedOrders: orders.length,
    revenueSatang: orders.reduce((s, o) => s + o.totalSatang, 0),
    topItems,
  };
}

/** FR-19: today's orders (by submission day) counted per status; every status is present. */
export async function dashboard() {
  const { date, start, end } = dayRange(undefined);
  const groups = await prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true } });
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const g of groups) counts[g.status as OrderStatus] = g._count._all;
  return { date, counts };
}
