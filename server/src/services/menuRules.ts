// F-09 menu item validation (FR-13, BR-12). Pure function: tested without the database (TEST-V01..V03).
export interface MenuItemInput {
  categoryId: number;
  name: string;
  description: string;
  priceSatang: number;
  isAvailable: boolean;
}

export type MenuItemValidation<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; fields: Record<string, string> };

export const MIN_PRICE_SATANG = 1;
export const MAX_PRICE_SATANG = 100_000; // 1,000.00 THB (BR-12)
export const PRICE_ERROR = "Price must be greater than 0 and at most 1,000.00 THB.";

const FIELDS = ["categoryId", "name", "description", "priceSatang", "isAvailable"] as const;

/** create: every required field must be valid; update: only the fields present are checked (at least one). */
export function validateMenuItemInput(body: unknown, mode: "create"): MenuItemValidation<MenuItemInput>;
export function validateMenuItemInput(body: unknown, mode: "update"): MenuItemValidation<Partial<MenuItemInput>>;
export function validateMenuItemInput(body: unknown, mode: "create" | "update"): MenuItemValidation<Partial<MenuItemInput>> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const has = (f: string) => b[f] !== undefined;
  const fields: Record<string, string> = {};
  const value: Partial<MenuItemInput> = {};

  if (mode === "update" && !FIELDS.some(has)) return { ok: false, message: "Nothing to update.", fields };

  if (mode === "create" || has("categoryId")) {
    if (Number.isInteger(b.categoryId) && (b.categoryId as number) > 0) value.categoryId = b.categoryId as number;
    else fields.categoryId = "Choose an existing category.";
  }
  if (mode === "create" || has("name")) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (name.length >= 1 && name.length <= 80) value.name = name;
    else fields.name = "Name must be 1 to 80 characters.";
  }
  if (has("description") || mode === "create") {
    const d = b.description ?? "";
    if (typeof d === "string" && d.length <= 300) value.description = d.trim();
    else fields.description = "Description must be at most 300 characters.";
  }
  if (mode === "create" || has("priceSatang")) {
    const p = b.priceSatang;
    if (Number.isInteger(p) && (p as number) >= MIN_PRICE_SATANG && (p as number) <= MAX_PRICE_SATANG) value.priceSatang = p as number;
    else fields.priceSatang = PRICE_ERROR;
  }
  if (has("isAvailable") || mode === "create") {
    const a = b.isAvailable ?? true;
    if (typeof a === "boolean") value.isAvailable = a;
    else fields.isAvailable = "Availability must be true or false.";
  }

  if (Object.keys(fields).length > 0) return { ok: false, message: "Please correct the menu item.", fields };
  return { ok: true, value };
}
