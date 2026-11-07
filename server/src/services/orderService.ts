// F-04 Place order (FR-05) — rules BR-01..BR-05, BR-11, BR-15, NFR-05.
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { bangkokDayKey, formatOrderNumber, priceOrder, validateOrderInput } from "./orderRules.js";

const detailInclude = {
  lines: { orderBy: { id: "asc" } },
  statusChanges: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { actor: { select: { name: true } } } },
} satisfies Prisma.OrderInclude;

type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

/** Public shape of an order (used by F-04, F-05 and F-06). */
export function serializeOrder(o: OrderWithDetail) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    totalSatang: o.totalSatang,
    note: o.note,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    lines: o.lines.map((l) => ({
      menuItemId: l.menuItemId,
      itemName: l.itemName,
      unitPriceSatang: l.unitPriceSatang,
      quantity: l.quantity,
      lineTotalSatang: l.lineTotalSatang,
    })),
    history: o.statusChanges.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorName: h.actor.name,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
  };
}

export { detailInclude };

export async function createOrder(customerId: number, body: unknown) {
  const { value, errors } = validateOrderInput(body);
  if (!value) throw new HttpError(422, "VALIDATION_ERROR", "Please correct the order.", { fields: errors });

  // Two orders submitted at the same moment may pick the same number; the unique index rejects the second,
  // and we retry with the next number.
  for (let attempt = 1; ; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const ids = value.lines.map((l) => l.menuItemId);
        const items = await tx.menuItem.findMany({ where: { id: { in: ids } } });
        const byId = new Map<number, { id: number; name: string; priceSatang: number; isAvailable: boolean }>(
          items.map((i) => [i.id, i]),
        );

        // BR-05: every item must exist and be available, otherwise the whole order is rejected.
        const unavailable = ids
          .filter((id) => !byId.get(id)?.isAvailable)
          .map((id) => ({ menuItemId: id, name: byId.get(id)?.name ?? null }));
        if (unavailable.length > 0) {
          const names = unavailable.map((u) => u.name ?? `item #${u.menuItemId}`).join(", ");
          throw new HttpError(422, "ITEM_UNAVAILABLE", `Not available: ${names}.`, { items: unavailable });
        }

        const priced = priceOrder(value.lines, byId); // BR-01, BR-02

        const now = new Date();
        const prefix = `ORD-${bangkokDayKey(now)}-`;
        const last = await tx.order.findFirst({
          where: { orderNumber: { startsWith: prefix } },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        });
        const sequence = last ? Number(last.orderNumber.slice(prefix.length)) + 1 : 1;

        return tx.order.create({
          data: {
            orderNumber: formatOrderNumber(now, sequence), // BR-15
            customerId, // always the session user, never the request body
            status: "SUBMITTED",
            totalSatang: priced.totalSatang,
            note: value.note,
            lines: { create: priced.lines },
            statusChanges: { create: [{ fromStatus: null, toStatus: "SUBMITTED", actorId: customerId }] }, // BR-11
          },
          include: detailInclude,
        });
      });
      return serializeOrder(order);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      // P2002 = unique constraint violation (Prisma error code)
      const e = err as { code?: string; meta?: { target?: unknown } };
      const duplicateNumber = e?.code === "P2002" && String(e.meta?.target).includes("orderNumber");
      if (duplicateNumber && attempt < 5) continue;
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// F-05 My orders and order detail (FR-06, FR-07, BR-08)

export const PAGE_SIZE = 10;

export function parsePage(raw: unknown): number {
  const n = Number(raw ?? 1);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Orders of one customer only, newest first. */
export async function listCustomerOrders(customerId: number, page: number) {
  const where = { customerId };
  const [totalItems, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { lines: { select: { quantity: true } } },
    }),
  ]);
  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalSatang: o.totalSatang,
      itemCount: o.lines.reduce((s, l) => s + l.quantity, 0),
      createdAt: o.createdAt,
    })),
    pagination: { page, pageSize: PAGE_SIZE, totalItems, totalPages: Math.ceil(totalItems / PAGE_SIZE) },
  };
}

/**
 * One order of the customer. Filtering by id AND customerId means another customer's order
 * is indistinguishable from a missing one: both return 404 (BR-08).
 */
export async function getCustomerOrder(customerId: number, orderId: number) {
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId }, include: detailInclude });
  if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  return serializeOrder(order);
}
