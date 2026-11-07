// F-06 Operator queue and accept (FR-08, FR-09, BR-06, BR-09, BR-11).
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { ORDER_STATUSES, OrderStatus, canTransition } from "./orderTransitions.js";
import { PAGE_SIZE, detailInclude, serializeOrder } from "./orderService.js";

export function parseStatusFilter(raw: unknown): OrderStatus {
  if (raw === undefined || raw === "") return "SUBMITTED";
  if (typeof raw === "string" && (ORDER_STATUSES as string[]).includes(raw)) return raw as OrderStatus;
  throw new HttpError(422, "VALIDATION_ERROR", "Unknown status filter.", { fields: { status: `Use one of ${ORDER_STATUSES.join(", ")}.` } });
}

/** Café-wide queue, oldest first (first come, first served). */
export async function listQueue(status: OrderStatus, page: number) {
  const where = { status };
  const [totalItems, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { name: true } }, lines: { select: { quantity: true } } },
    }),
  ]);
  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      status: o.status,
      totalSatang: o.totalSatang,
      itemCount: o.lines.reduce((s, l) => s + l.quantity, 0),
      createdAt: o.createdAt,
    })),
    pagination: { page, pageSize: PAGE_SIZE, totalItems, totalPages: Math.ceil(totalItems / PAGE_SIZE) },
  };
}

export async function getOrderForOperator(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { ...detailInclude, customer: { select: { id: true, name: true } } },
  });
  if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  return { ...serializeOrder(order), customer: order.customer };
}

/**
 * Accept once (BR-09): the UPDATE only matches while the status is still SUBMITTED, so when two
 * operators accept at the same time the database applies one update and the other matches 0 rows → 409.
 */
export async function acceptOrder(orderId: number, operatorId: number) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    if (!canTransition(current.status, "ACCEPTED")) {
      throw new HttpError(409, "INVALID_TRANSITION", `Only submitted orders can be accepted. This order is ${current.status}.`);
    }

    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "SUBMITTED" },
      data: { status: "ACCEPTED", acceptedAt: new Date(), version: { increment: 1 } },
    });
    if (count !== 1) {
      throw new HttpError(409, "INVALID_TRANSITION", "This order was just handled by someone else.");
    }

    await tx.orderStatusChange.create({
      data: { orderId, fromStatus: "SUBMITTED", toStatus: "ACCEPTED", actorId: operatorId }, // BR-11
    });
  });
  return getOrderForOperator(orderId);
}
