// TEST-U10 — docs/sprints/sprint-1/sts.md (AC-32, BR-06 accept part)
// TEST-T01..TEST-T04 — docs/sprints/sprint-2/sts.md (F-07, BR-06, BR-10)
import { describe, it, expect } from "vitest";
import { ORDER_STATUSES, canPay, canTransition, validateReason } from "../../src/services/orderTransitions.js";

describe("TEST-U10 — an order can be accepted only from Submitted (AC-32)", () => {
  it.each(ORDER_STATUSES)("%s → ACCEPTED", (from) => {
    expect(canTransition(from, "ACCEPTED")).toBe(from === "SUBMITTED");
  });

  it("does not allow transitions outside the BR-06 matrix", () => {
    expect(canTransition("SUBMITTED", "PICKED_UP")).toBe(false);
    expect(canTransition("ACCEPTED", "SUBMITTED")).toBe(false);
  });
});

describe("TEST-T01 — reject only from Submitted (AC-50, AC-52)", () => {
  it("allows SUBMITTED → REJECTED and nothing else to REJECTED", () => {
    expect(canTransition("SUBMITTED", "REJECTED")).toBe(true);
    expect(canTransition("ACCEPTED", "REJECTED")).toBe(false);
    expect(canTransition("REJECTED", "REJECTED")).toBe(false);
  });
});

describe("TEST-T02 — cancel from Submitted or Accepted only (AC-53, AC-54, AC-56)", () => {
  it.each([
    ["SUBMITTED", true],
    ["ACCEPTED", true],
    ["PREPARING", false],
    ["READY", false],
  ] as const)("%s → CANCELLED is %s", (from, allowed) => {
    expect(canTransition(from, "CANCELLED")).toBe(allowed);
  });
});

describe("TEST-T03 — a reason has 1 to 300 characters (AC-51)", () => {
  it("accepts 300 characters and trims spaces", () => {
    expect(validateReason("a".repeat(300))).toEqual({ value: "a".repeat(300) });
    expect(validateReason("  Sold out  ")).toEqual({ value: "Sold out" });
  });
  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["blank", "   "],
    ["301 characters", "a".repeat(301)],
    ["a number", 42],
    ["null", null],
  ])("rejects %s", (_label, raw) => {
    expect(validateReason(raw)).toEqual({ error: "Reason must be 1 to 300 characters." });
  });
});

describe("TEST-T04 — final statuses cannot change (AC-52)", () => {
  it.each(["PICKED_UP", "REJECTED", "CANCELLED"] as const)("%s → anything is refused", (from) => {
    for (const to of ORDER_STATUSES) expect(canTransition(from, to)).toBe(false);
  });
});

// TEST-T05 — docs/sprints/sprint-2/sts.md (F-08, AC-60, AC-61)
describe("TEST-T05 — fulfilment moves forward one step at a time (AC-60, AC-61)", () => {
  it.each([
    ["ACCEPTED", "PREPARING", true],
    ["PREPARING", "READY", true],
    ["READY", "PICKED_UP", true],
    ["ACCEPTED", "READY", false],
    ["ACCEPTED", "PICKED_UP", false],
    ["READY", "PREPARING", false],
    ["SUBMITTED", "PREPARING", false],
    ["PREPARING", "CANCELLED", false],
  ] as const)("%s → %s is %s", (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });
});

// TEST-T06 — docs/sprints/sprint-2/sts.md (F-10, BR-13, AC-80..AC-82)
describe("TEST-T06 — payment is allowed only for unpaid, open orders (BR-13)", () => {
  const open = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY"];
  for (const status of ORDER_STATUSES) {
    for (const payment of ["UNPAID", "PAID", "REFUNDED"] as const) {
      const expected = payment === "UNPAID" && open.includes(status);
      it(`${status} + ${payment} → ${expected}`, () => {
        expect(canPay(status, payment)).toBe(expected);
      });
    }
  }
});
