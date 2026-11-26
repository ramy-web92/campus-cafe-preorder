// One way to change an order's status (BR-06, BR-09, BR-11), shared by accept (F-06), reject/cancel (F-07)
// and the fulfilment lifecycle (F-08).
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { OrderStatus, canTransition } from "./orderTransitions.js";

export interface StatusChange {
  orderId: number;
  to: OrderStatus;
  actorId: number;
  reason?: string | null;
  /** Restricts the order to one customer (ownership, BR-08): another customer's order is a 404. */
  customerId?: number;
  /** Statuses this actor may start from (a subset of the BR-06 matrix), e.g. customers cancel only Submitted orders. */
  allowedFrom?: OrderStatus[];
  /** 409 message when the current status does not allow the change. */
  notAllowed: (current: OrderStatus) => string;
  /** Extra columns written with the status (e.g. acceptedAt). */
  data?: Prisma.OrderUpdateManyMutationInput;
}

export async function changeStatus(change: StatusChange): Promise<void> {
  const { orderId, to, actorId, customerId } = change;
  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findFirst({
      where: { id: orderId, ...(customerId !== undefined && { customerId }) },
      select: { status: true },
    });
    if (!current) throw new HttpError(404, "NOT_FOUND", "Order not found.");

    const from = current.status as OrderStatus;
    const allowed = canTransition(from, to) && (!change.allowedFrom || change.allowedFrom.includes(from));
    if (!allowed) throw new HttpError(409, "INVALID_TRANSITION", change.notAllowed(from));

    // Conditional update: only matches while the status is still the one we checked. When two requests race,
    // the database applies one update; the other matches 0 rows and gets 409 (BR-09).
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: from },
      data: { ...change.data, status: to, version: { increment: 1 } },
    });
    if (count !== 1) throw new HttpError(409, "INVALID_TRANSITION", "This order was just handled by someone else.");

    await tx.orderStatusChange.create({
      data: { orderId, fromStatus: from, toStatus: to, actorId, reason: change.reason ?? null }, // BR-11
    });
  });
}

export function reasonOrThrow(validated: { value: string } | { error: string }): string {
  if ("error" in validated) {
    throw new HttpError(422, "VALIDATION_ERROR", "Please give a reason.", { fields: { reason: validated.error } });
  }
  return validated.value;
}
