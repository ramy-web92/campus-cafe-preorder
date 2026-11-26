// Order status transitions (BR-06) and the reason rule (BR-10).
export type OrderStatus = "SUBMITTED" | "ACCEPTED" | "PREPARING" | "READY" | "PICKED_UP" | "REJECTED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"];

// BR-06 matrix. Sprint 1: accept. Sprint 2: reject and cancel (F-07), fulfilment lifecycle (F-08).
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  SUBMITTED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["PICKED_UP"],
  PICKED_UP: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export const REASON_ERROR = "Reason must be 1 to 300 characters.";

/** BR-10: a reject (or café cancel) reason is a string of 1–300 characters after trimming. */
export function validateReason(raw: unknown): { value: string } | { error: string } {
  if (typeof raw !== "string") return { error: REASON_ERROR };
  const value = raw.trim();
  if (value.length < 1 || value.length > 300) return { error: REASON_ERROR };
  return { value };
}

/** F-08: targets of the lifecycle endpoint (accept, reject and cancel have their own endpoints). */
export const LIFECYCLE_TARGETS: OrderStatus[] = ["PREPARING", "READY", "PICKED_UP"];
