// F-04 Place order (FR-05) — rules BR-01..BR-05, BR-11, BR-15, NFR-05.
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { bangkokDayKey, formatOrderNumber, priceOrder, validateOrderInput } from "./orderRules.js";
import { changeStatus } from "./orderStatusService.js";
import { PAYABLE_STATUSES } from "./orderTransitions.js";
import { validatePickupTime } from "./pickupRules.js";
import { parseOrderFilters } from "./orderFilters.js";

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
    paymentStatus: o.paymentStatus,
    paidAt: o.paidAt,
    pickupAt: o.pickupAt,
    pickupAsap: o.pickupAsap,
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
  // F-11: the pickup time is checked against the server clock at submission (BR-14)
  const now = new Date();
  const pickup = validatePickupTime((body as { pickupAt?: unknown } | null)?.pickupAt, now);
  if (!value || !pickup.ok) {
    const fields = { ...(errors ?? {}), ...(!pickup.ok && { pickupAt: pickup.error }) };
    throw new HttpError(422, "VALIDATION_ERROR", "Please correct the order.", { fields });
  }

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
            createdAt: now,
            pickupAt: pickup.at, // = createdAt for ASAP orders (D-09)
            pickupAsap: pickup.asap,
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

/** Orders of one customer only, newest first; F-13 filters only narrow the customer's own orders (BR-08). */
export async function listCustomerOrders(customerId: number, page: number, query: Record<string, unknown> = {}) {
  const parsed = parseOrderFilters(query);
  if (!parsed.ok) throw new HttpError(422, "VALIDATION_ERROR", "Please correct the filters.", { fields: parsed.fields });
  const where = { ...parsed.where, customerId };
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
      paymentStatus: o.paymentStatus,
      pickupAt: o.pickupAt,
      pickupAsap: o.pickupAsap,
      totalSatang: o.totalSatang,
      itemCount: o.lines.reduce((s, l) => s + l.quantity, 0),
      createdAt: o.createdAt,
    })),
    pagination: { page, pageSize: PAGE_SIZE, totalItems, totalPages: Math.ceil(totalItems / PAGE_SIZE) },
    filters: parsed.filters,
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

/** F-07: a customer cancels their own order while it is still Submitted (FR-12). */
export async function cancelOrderByCustomer(customerId: number, orderId: number) {
  await changeStatus({
    orderId,
    to: "CANCELLED",
    actorId: customerId,
    customerId,
    allowedFrom: ["SUBMITTED"],
    notAllowed: (current) => `This order can no longer be cancelled. It is ${current}.`,
  });
  return getCustomerOrder(customerId, orderId);
}

/**
 * F-10: simulated payment by the owner (FR-14, BR-13). The conditional update only matches an unpaid order that is
 * still open, so a payment racing with a cancel either lands first (and is refunded by the cancel) or gets 409.
 */
export async function payOrder(customerId: number, orderId: number) {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, customerId, paymentStatus: "UNPAID", status: { in: PAYABLE_STATUSES } },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });
  if (count !== 1) {
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId }, select: { status: true, paymentStatus: true } });
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    const message =
      order.paymentStatus === "PAID" ? "This order is already paid."
      : order.paymentStatus === "REFUNDED" ? "This order was refunded."
      : `A ${order.status} order cannot be paid.`;
    throw new HttpError(409, "PAYMENT_NOT_ALLOWED", message);
  }
  return getCustomerOrder(customerId, orderId);
}
