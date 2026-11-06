// Pure order rules (no database) — BR-01, BR-03, BR-04, BR-15. Unit-tested in tests/unit/order-rules.test.ts.

export const MIN_QTY = 1;
export const MAX_QTY = 10;
export const MAX_LINES = 20;
export const NOTE_MAX = 200;

export type LineInput = { menuItemId: number; quantity: number };
export type FieldErrors = Record<string, string>;

const isPositiveInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

/** Validates the request shape. Unknown fields (prices, totals, status, customerId) are ignored (BR-01). */
export function validateOrderInput(body: unknown): { value?: { lines: LineInput[]; note: string | null }; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const raw = (body ?? {}) as { lines?: unknown; note?: unknown };

  if (!Array.isArray(raw.lines) || raw.lines.length < 1 || raw.lines.length > MAX_LINES) {
    errors.lines = `An order must have 1 to ${MAX_LINES} lines.`;
    return { errors };
  }

  const lines: LineInput[] = [];
  const seen = new Set<number>();
  raw.lines.forEach((l: any, i: number) => {
    const menuItemId = l?.menuItemId;
    const quantity = l?.quantity;
    if (!isPositiveInt(menuItemId)) {
      errors[`lines[${i}].menuItemId`] = "Choose a menu item.";
    } else if (seen.has(menuItemId)) {
      errors[`lines[${i}].menuItemId`] = "This item is already in the order.";
    } else {
      seen.add(menuItemId);
    }
    // BR-03: integer 1..10 — strings like "2" and decimals are rejected
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < MIN_QTY || quantity > MAX_QTY) {
      errors[`lines[${i}].quantity`] = `Quantity must be an integer from ${MIN_QTY} to ${MAX_QTY}.`;
    }
    // Only these two fields are kept; anything else the client sends is dropped.
    lines.push({ menuItemId, quantity });
  });

  let note: string | null = null;
  if (raw.note !== undefined && raw.note !== null) {
    if (typeof raw.note !== "string") errors.note = "The note must be text.";
    else {
      note = raw.note.trim() || null;
      if (note && note.length > NOTE_MAX) errors.note = `The note must be at most ${NOTE_MAX} characters.`;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { lines, note }, errors };
}

/** Computes line totals and the order total from authoritative prices (BR-01). */
export function priceOrder(
  lines: LineInput[],
  items: Map<number, { id: number; name: string; priceSatang: number }>,
): { lines: { menuItemId: number; itemName: string; unitPriceSatang: number; quantity: number; lineTotalSatang: number }[]; totalSatang: number } {
  const priced = lines.map((l) => {
    const item = items.get(l.menuItemId);
    if (!item) throw new Error(`Unknown menu item ${l.menuItemId}`);
    return {
      menuItemId: item.id,
      itemName: item.name, // snapshot (BR-02)
      unitPriceSatang: item.priceSatang, // snapshot (BR-02)
      quantity: l.quantity,
      lineTotalSatang: item.priceSatang * l.quantity,
    };
  });
  return { lines: priced, totalSatang: priced.reduce((sum, l) => sum + l.lineTotalSatang, 0) };
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving time

/** Bangkok calendar day used for order numbers (D-07). */
export function bangkokDayKey(date: Date): string {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, "");
}

/** ORD-YYYYMMDD-NNNN (BR-15). */
export function formatOrderNumber(date: Date, sequence: number): string {
  return `ORD-${bangkokDayKey(date)}-${String(sequence).padStart(4, "0")}`;
}
