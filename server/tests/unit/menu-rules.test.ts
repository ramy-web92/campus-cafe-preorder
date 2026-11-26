// TEST-V01..TEST-V03 — docs/sprints/sprint-2/sts.md (F-09, AC-72, BR-12)
import { describe, it, expect } from "vitest";
import { validateMenuItemInput } from "../../src/services/menuRules.js";

const valid = { categoryId: 3, name: "Banana Bread", description: "Moist, with walnuts", priceSatang: 5500, isAvailable: true };

describe("TEST-V01 — price is an integer from 1 to 100000 satang (BR-12)", () => {
  it.each([0, -100, 100001, 12.5, "abc", null])("rejects %s", (priceSatang) => {
    const r = validateMenuItemInput({ ...valid, priceSatang }, "create");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.priceSatang).toBe("Price must be greater than 0 and at most 1,000.00 THB.");
  });
  it.each([1, 100000])("accepts %s", (priceSatang) => {
    expect(validateMenuItemInput({ ...valid, priceSatang }, "create")).toEqual({ ok: true, value: { ...valid, priceSatang } });
  });
});

describe("TEST-V02 — name, description, category and availability (AC-72)", () => {
  it.each([
    ["empty name", { name: "" }, "name", "Name must be 1 to 80 characters."],
    ["blank name", { name: "   " }, "name", "Name must be 1 to 80 characters."],
    ["81-character name", { name: "n".repeat(81) }, "name", "Name must be 1 to 80 characters."],
    ["301-character description", { description: "d".repeat(301) }, "description", "Description must be at most 300 characters."],
    ["text availability", { isAvailable: "yes" }, "isAvailable", "Availability must be true or false."],
    ["missing category", { categoryId: undefined }, "categoryId", "Choose an existing category."],
  ])("rejects %s", (_label, change, field, message) => {
    const r = validateMenuItemInput({ ...valid, ...change }, "create");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields[field]).toBe(message);
  });

  it("accepts an 80-character name, trims it, and defaults description and availability", () => {
    const r = validateMenuItemInput({ categoryId: 3, name: `  ${"n".repeat(80)}  `, priceSatang: 5500 }, "create");
    expect(r).toEqual({ ok: true, value: { categoryId: 3, name: "n".repeat(80), description: "", priceSatang: 5500, isAvailable: true } });
  });
});

describe("TEST-V03 — partial update (AC-72)", () => {
  it("refuses an empty update", () => {
    expect(validateMenuItemInput({}, "update")).toEqual({ ok: false, message: "Nothing to update.", fields: {} });
  });
  it("accepts only the fields that are sent", () => {
    expect(validateMenuItemInput({ priceSatang: 7500 }, "update")).toEqual({ ok: true, value: { priceSatang: 7500 } });
    expect(validateMenuItemInput({ isAvailable: false, unknown: 1 }, "update")).toEqual({ ok: true, value: { isAvailable: false } });
  });
});
