// F-11 pickup time rule (BR-14, D-07, D-09). Pure function: `now` is passed in so tests can fix the clock.
export const PICKUP_ERRORS = {
  format: "Pickup time must be a valid date and time.",
  hours: "Pickup time must be between 08:00 and 18:00 (Bangkok time).",
  lead: "Pickup time must be at least 15 minutes from now.",
} as const;

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Bangkok has no daylight saving time
const OPEN_SECONDS = 8 * 3600; // 08:00
const CLOSE_SECONDS = 18 * 3600; // 18:00 (inclusive)
const MIN_LEAD_MS = 15 * 60 * 1000;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export type PickupResult = { ok: true; asap: boolean; at: Date } | { ok: false; error: string };

/** undefined/null → as soon as possible (stored as `now`); otherwise an ISO date-time inside opening hours, ≥ 15 min ahead. */
export function validatePickupTime(raw: unknown, now: Date): PickupResult {
  if (raw === undefined || raw === null) return { ok: true, asap: true, at: now };
  if (typeof raw !== "string" || !ISO_DATE_TIME.test(raw)) return { ok: false, error: PICKUP_ERRORS.format };
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return { ok: false, error: PICKUP_ERRORS.format };

  const local = new Date(at.getTime() + BANGKOK_OFFSET_MS);
  const secondOfDay = local.getUTCHours() * 3600 + local.getUTCMinutes() * 60 + local.getUTCSeconds();
  if (secondOfDay < OPEN_SECONDS || secondOfDay > CLOSE_SECONDS) return { ok: false, error: PICKUP_ERRORS.hours };
  if (at.getTime() - now.getTime() < MIN_LEAD_MS) return { ok: false, error: PICKUP_ERRORS.lead };
  return { ok: true, asap: false, at };
}
