// Order status transitions (BR-06). Sprint 1 implements Submitted → Accepted; Sprint 2 adds the rest.
export type OrderStatus = "SUBMITTED" | "ACCEPTED" | "PREPARING" | "READY" | "PICKED_UP" | "REJECTED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  throw new Error("Not implemented");
}
