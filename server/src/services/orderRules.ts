// Pure order rules (no database) — BR-01, BR-03, BR-04, BR-15. Unit-tested in tests/unit/order-rules.test.ts.

export const MIN_QTY = 1;
export const MAX_QTY = 10;
export const MAX_LINES = 20;
export const NOTE_MAX = 200;

export type LineInput = { menuItemId: number; quantity: number };
export type FieldErrors = Record<string, string>;

/** Validates the request shape. Unknown fields (prices, totals, status, customerId) are ignored (BR-01). */
export function validateOrderInput(body: unknown): { value?: { lines: LineInput[]; note: string | null }; errors: FieldErrors } {
  throw new Error("Not implemented");
}

/** Computes line totals and the order total from authoritative prices (BR-01). */
export function priceOrder(
  lines: LineInput[],
  items: Map<number, { id: number; name: string; priceSatang: number }>,
): { lines: { menuItemId: number; itemName: string; unitPriceSatang: number; quantity: number; lineTotalSatang: number }[]; totalSatang: number } {
  throw new Error("Not implemented");
}

/** Bangkok calendar day used for order numbers (D-07). */
export function bangkokDayKey(date: Date): string {
  throw new Error("Not implemented");
}

/** ORD-YYYYMMDD-NNNN (BR-15). */
export function formatOrderNumber(date: Date, sequence: number): string {
  throw new Error("Not implemented");
}
