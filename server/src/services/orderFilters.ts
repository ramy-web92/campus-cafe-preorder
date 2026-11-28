// F-13 order history filters (FR-17, D-07). Pure function: turns the query string into a Prisma condition.
import { ORDER_STATUSES, OrderStatus } from "./orderTransitions.js";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_ERROR = "Use a date in the format YYYY-MM-DD.";
const STATUS_ERROR = `Use one of ${ORDER_STATUSES.join(", ")}.`;

export interface OrderFilters {
  status: OrderStatus | null;
  from: string | null;
  to: string | null;
}
export type FilterResult =
  | { ok: true; filters: OrderFilters; where: { status?: OrderStatus; createdAt?: { gte?: Date; lt?: Date } } }
  | { ok: false; fields: Record<string, string> };

/** UTC instant of 00:00 Bangkok on a YYYY-MM-DD day, or null when the text is not a real date. */
export function bangkokMidnight(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = new Date(Date.UTC(y, mo - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) return null; // e.g. 2026-02-30
  return new Date(utc.getTime() - BANGKOK_OFFSET_MS);
}

const text = (v: unknown): string | null | undefined => (v === undefined || v === "" ? null : typeof v === "string" ? v : undefined);

export function parseOrderFilters(query: Record<string, unknown>): FilterResult {
  const fields: Record<string, string> = {};
  const status = text(query.status);
  const from = text(query.from);
  const to = text(query.to);

  if (status === undefined || (status !== null && !(ORDER_STATUSES as string[]).includes(status))) fields.status = STATUS_ERROR;
  const fromDate = from ? bangkokMidnight(from) : null;
  const toDate = to ? bangkokMidnight(to) : null;
  if (from === undefined || (from && !fromDate)) fields.from = DATE_ERROR;
  if (to === undefined || (to && !toDate)) fields.to = DATE_ERROR;
  if (fromDate && toDate && fromDate > toDate) fields.to = "The end date must be on or after the start date.";
  if (Object.keys(fields).length > 0) return { ok: false, fields };

  const where: { status?: OrderStatus; createdAt?: { gte?: Date; lt?: Date } } = {};
  if (status) where.status = status as OrderStatus;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000); // "to" day is inclusive
  }
  return { ok: true, filters: { status: (status as OrderStatus) ?? null, from: from ?? null, to: to ?? null }, where };
}
