// F-06 Operator queue and accept (FR-08, FR-09, BR-06, BR-09, BR-11); F-07 reject and café cancel (FR-10, BR-10).
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { ORDER_STATUSES, OrderStatus, validateReason } from "./orderTransitions.js";
import { changeStatus, reasonOrThrow } from "./orderStatusService.js";
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

/** Accept once (BR-09): see changeStatus for the conditional update. */
export async function acceptOrder(orderId: number, operatorId: number) {
  await changeStatus({
    orderId,
    to: "ACCEPTED",
    actorId: operatorId,
    data: { acceptedAt: new Date() },
    notAllowed: (current) => `Only submitted orders can be accepted. This order is ${current}.`,
  });
  return getOrderForOperator(orderId);
}

/** F-07: reject a Submitted order with a reason (FR-10, BR-10). */
export async function rejectOrder(orderId: number, operatorId: number, rawReason: unknown) {
  const reason = reasonOrThrow(validateReason(rawReason));
  await changeStatus({
    orderId,
    to: "REJECTED",
    actorId: operatorId,
    reason,
    notAllowed: (current) => `Only submitted orders can be rejected. This order is ${current}.`,
  });
  return getOrderForOperator(orderId);
}

/** F-07: the café cancels an Accepted order with a reason (BR-06). A Submitted order is rejected instead. */
export async function cancelOrderByOperator(orderId: number, operatorId: number, rawReason: unknown) {
  const reason = reasonOrThrow(validateReason(rawReason));
  await changeStatus({
    orderId,
    to: "CANCELLED",
    actorId: operatorId,
    reason,
    allowedFrom: ["ACCEPTED"],
    notAllowed: (current) => `Only accepted orders can be cancelled by the café. This order is ${current}.`,
  });
  return getOrderForOperator(orderId);
}
