// TEST-U01..TEST-U04 — docs/sprints/sprint-1/sts.md (AC-12, AC-15, AC-16, AC-18)
import { describe, it, expect } from "vitest";
import { bangkokDayKey, formatOrderNumber, priceOrder, validateOrderInput } from "../../src/services/orderRules.js";

const line = (menuItemId: number, quantity: unknown) => ({ menuItemId, quantity });

describe("TEST-U01 — server-side pricing (AC-12, BR-01)", () => {
  it("multiplies unit prices by quantities and sums the lines", () => {
    const items = new Map([
      [3, { id: 3, name: "Iced Latte", priceSatang: 6500 }],
      [9, { id: 9, name: "Croissant", priceSatang: 4500 }],
    ]);
    const priced = priceOrder([{ menuItemId: 3, quantity: 2 }, { menuItemId: 9, quantity: 1 }], items);
    expect(priced.lines.map((l) => l.lineTotalSatang)).toEqual([13000, 4500]);
    expect(priced.totalSatang).toBe(17500);
    expect(priced.lines[0]).toMatchObject({ itemName: "Iced Latte", unitPriceSatang: 6500, quantity: 2 });
  });
});

describe("TEST-U02 — quantity 1 to 10 (AC-15, BR-03)", () => {
  it.each([1, 10])("accepts quantity %s", (q) => {
    const { value, errors } = validateOrderInput({ lines: [line(1, q)] });
    expect(errors).toEqual({});
    expect(value?.lines[0].quantity).toBe(q);
  });

  it.each([0, 11, -1, 1.5, "2", null])("rejects quantity %s", (q) => {
    const { value, errors } = validateOrderInput({ lines: [line(1, q)] });
    expect(value).toBeUndefined();
    expect(errors["lines[0].quantity"]).toBe("Quantity must be an integer from 1 to 10.");
  });
});

describe("TEST-U03 — 1 to 20 lines, no duplicate item (AC-16, BR-04)", () => {
  it("accepts 20 different lines", () => {
    const lines = Array.from({ length: 20 }, (_, i) => line(i + 1, 1));
    expect(validateOrderInput({ lines }).errors).toEqual({});
  });

  it("rejects 0 lines and 21 lines", () => {
    expect(validateOrderInput({ lines: [] }).errors.lines).toBe("An order must have 1 to 20 lines.");
    const lines = Array.from({ length: 21 }, (_, i) => line(i + 1, 1));
    expect(validateOrderInput({ lines }).errors.lines).toBe("An order must have 1 to 20 lines.");
  });

  it("rejects the same item twice", () => {
    const { errors } = validateOrderInput({ lines: [line(3, 1), line(3, 2)] });
    expect(errors["lines[1].menuItemId"]).toBe("This item is already in the order.");
  });

  it("rejects a missing lines array and an invalid item id", () => {
    expect(validateOrderInput({}).errors.lines).toBeDefined();
    expect(validateOrderInput({ lines: [line(0, 1)] }).errors["lines[0].menuItemId"]).toBeDefined();
  });

  it("ignores client-sent prices, totals, status and customer (BR-01)", () => {
    const { value } = validateOrderInput({
      lines: [{ menuItemId: 3, quantity: 1, unitPriceSatang: 1, lineTotalSatang: 1 }],
      totalSatang: 1, status: "ACCEPTED", customerId: 99,
    });
    expect(value).toEqual({ lines: [{ menuItemId: 3, quantity: 1 }], note: null });
  });

  it("trims the note and limits it to 200 characters", () => {
    expect(validateOrderInput({ lines: [line(1, 1)], note: "  Less ice  " }).value?.note).toBe("Less ice");
    expect(validateOrderInput({ lines: [line(1, 1)], note: "x".repeat(201) }).errors.note).toBeDefined();
  });
});

describe("TEST-U04 — order number format (AC-18, BR-15)", () => {
  it("uses the Bangkok calendar day", () => {
    // 18:30 UTC on 5 Nov is 01:30 on 6 Nov in Bangkok
    expect(bangkokDayKey(new Date("2026-11-05T18:30:00Z"))).toBe("20261106");
    expect(bangkokDayKey(new Date("2026-11-05T16:59:59Z"))).toBe("20261105");
  });

  it("formats ORD-YYYYMMDD-NNNN", () => {
    expect(formatOrderNumber(new Date("2026-11-05T18:30:00Z"), 4)).toBe("ORD-20261106-0004");
    expect(formatOrderNumber(new Date("2026-11-05T03:00:00Z"), 123)).toBe("ORD-20261105-0123");
  });
});
