// Order status transitions (BR-06). Sprint 1 implements Submitted → Accepted; Sprint 2 adds the rest.
export type OrderStatus = "SUBMITTED" | "ACCEPTED" | "PREPARING" | "READY" | "PICKED_UP" | "REJECTED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"];

// Sprint 1 part of the BR-06 matrix. Sprint 2 adds Rejected/Cancelled/Preparing/Ready/Picked up.
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  SUBMITTED: ["ACCEPTED"],
  ACCEPTED: [],
  PREPARING: [],
  READY: [],
  PICKED_UP: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}
