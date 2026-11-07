// TEST-U10 — docs/sprints/sprint-1/sts.md (AC-32, BR-06 accept part)
import { describe, it, expect } from "vitest";
import { ORDER_STATUSES, canTransition } from "../../src/services/orderTransitions.js";

describe("TEST-U10 — an order can be accepted only from Submitted (AC-32)", () => {
  it.each(ORDER_STATUSES)("%s → ACCEPTED", (from) => {
    expect(canTransition(from, "ACCEPTED")).toBe(from === "SUBMITTED");
  });

  it("does not allow transitions that Sprint 1 does not implement", () => {
    expect(canTransition("SUBMITTED", "PICKED_UP")).toBe(false);
    expect(canTransition("ACCEPTED", "SUBMITTED")).toBe(false);
  });
});
