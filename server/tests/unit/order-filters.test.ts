// TEST-F01, TEST-F02 — docs/sprints/sprint-3/sts.md (F-13, AC-121, AC-123)
import { describe, it, expect } from "vitest";
import { parseOrderFilters } from "../../src/services/orderFilters.js";

describe("TEST-F01 — Bangkok calendar days become UTC ranges (AC-121)", () => {
  it("from=to=2026-11-25 covers 2026-11-24T17:00Z (inclusive) to 2026-11-25T17:00Z (exclusive)", () => {
    expect(parseOrderFilters({ from: "2026-11-25", to: "2026-11-25" })).toEqual({
      ok: true,
      filters: { status: null, from: "2026-11-25", to: "2026-11-25" },
      where: { createdAt: { gte: new Date("2026-11-24T17:00:00.000Z"), lt: new Date("2026-11-25T17:00:00.000Z") } },
    });
  });
  it("combines a status with only one bound", () => {
    expect(parseOrderFilters({ status: "CANCELLED", to: "2026-11-30" })).toEqual({
      ok: true,
      filters: { status: "CANCELLED", from: null, to: "2026-11-30" },
      where: { status: "CANCELLED", createdAt: { lt: new Date("2026-11-30T17:00:00.000Z") } },
    });
  });
  it("treats missing and empty values as no filter", () => {
    expect(parseOrderFilters({ status: "", from: "", to: "" })).toEqual({ ok: true, filters: { status: null, from: null, to: null }, where: {} });
    expect(parseOrderFilters({})).toEqual({ ok: true, filters: { status: null, from: null, to: null }, where: {} });
  });
});

describe("TEST-F02 — invalid filters (AC-123)", () => {
  it.each([
    ["unknown status", { status: "DELIVERED" }, "status", "Use one of SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP, REJECTED, CANCELLED."],
    ["impossible date", { from: "2026-02-30" }, "from", "Use a date in the format YYYY-MM-DD."],
    ["other format", { to: "25/11/2026" }, "to", "Use a date in the format YYYY-MM-DD."],
    ["from after to", { from: "2026-11-26", to: "2026-11-25" }, "to", "The end date must be on or after the start date."],
    ["array value", { status: ["SUBMITTED", "ACCEPTED"] }, "status", "Use one of SUBMITTED, ACCEPTED, PREPARING, READY, PICKED_UP, REJECTED, CANCELLED."],
  ])("rejects %s", (_label, query, field, message) => {
    const r = parseOrderFilters(query);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields[field]).toBe(message);
  });
});
