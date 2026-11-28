// TEST-K01..TEST-K04 — docs/sprints/sprint-3/sts.md (F-11, BR-14, AC-100..AC-105). Fixed clock, Asia/Bangkok = UTC+7.
import { describe, it, expect } from "vitest";
import { validatePickupTime } from "../../src/services/pickupRules.js";

const NOW = new Date("2026-11-26T03:00:00.000Z"); // 10:00 in Bangkok
const LEAD = "Pickup time must be at least 15 minutes from now.";
const HOURS = "Pickup time must be between 08:00 and 18:00 (Bangkok time).";
const FORMAT = "Pickup time must be a valid date and time.";

describe("TEST-K01 — valid chosen times (AC-100)", () => {
  it.each([
    ["10:15 today (now + 15 min)", "2026-11-26T03:15:00.000Z"],
    ["18:00 today (closing time)", "2026-11-26T11:00:00.000Z"],
    ["08:00 tomorrow (opening time)", "2026-11-27T01:00:00.000Z"],
  ])("accepts %s", (_label, iso) => {
    expect(validatePickupTime(iso, NOW)).toEqual({ ok: true, asap: false, at: new Date(iso) });
  });
});

describe("TEST-K02 — times outside the rule (AC-101)", () => {
  it.each([
    ["10:14 today (now + 14 min)", "2026-11-26T03:14:00.000Z", LEAD],
    ["18:01 today", "2026-11-26T11:01:00.000Z", HOURS],
    ["07:59 tomorrow", "2026-11-27T00:59:00.000Z", HOURS],
    ["03:00 tomorrow night", "2026-11-26T20:00:00.000Z", HOURS],
  ])("rejects %s", (_label, iso, error) => {
    expect(validatePickupTime(iso, NOW)).toEqual({ ok: false, error });
  });
});

describe("TEST-K03 — ASAP and malformed values (AC-102, AC-105)", () => {
  it.each([undefined, null])("treats %s as As soon as possible", (raw) => {
    expect(validatePickupTime(raw, NOW)).toEqual({ ok: true, asap: true, at: NOW });
  });
  it.each(["tomorrow", "2026-13-01T10:00", "", 42, {}])("rejects %s with the format message", (raw) => {
    expect(validatePickupTime(raw, NOW)).toEqual({ ok: false, error: FORMAT });
  });
});

describe("TEST-K04 — lead time is checked even inside opening hours (AC-101)", () => {
  it("refuses 18:00 when it is 17:50", () => {
    const late = new Date("2026-11-26T10:50:00.000Z"); // 17:50 Bangkok
    expect(validatePickupTime("2026-11-26T11:00:00.000Z", late)).toEqual({ ok: false, error: LEAD });
  });
});
