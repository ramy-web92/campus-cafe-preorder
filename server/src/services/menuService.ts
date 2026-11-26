// F-03 Menu browsing (FR-04) and F-09 menu management (FR-13, BR-12).
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";
import { validateMenuItemInput } from "./menuRules.js";

export async function getMenu() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      items: {
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, description: true, priceSatang: true, isAvailable: true },
      },
    },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, items: c.items }));
}

const itemSelect = { id: true, categoryId: true, name: true, description: true, priceSatang: true, isAvailable: true } as const;

async function assertCategory(categoryId: number | undefined) {
  if (categoryId === undefined) return;
  const exists = await prisma.category.count({ where: { id: categoryId } });
  if (!exists) {
    throw new HttpError(422, "VALIDATION_ERROR", "Please correct the menu item.", { fields: { categoryId: "Choose an existing category." } });
  }
}

/** The unique index (categoryId, name) turns a duplicate name into P2002 → 409. */
function duplicateOr(err: unknown): never {
  const e = err as { code?: string };
  if (e?.code === "P2002") throw new HttpError(409, "DUPLICATE_ITEM", "An item with this name already exists in this category.");
  throw err;
}

export async function createMenuItem(body: unknown) {
  const v = validateMenuItemInput(body, "create");
  if (!v.ok) throw new HttpError(422, "VALIDATION_ERROR", v.message, { fields: v.fields });
  await assertCategory(v.value.categoryId);
  try {
    return await prisma.menuItem.create({ data: v.value, select: itemSelect });
  } catch (err) {
    duplicateOr(err);
  }
}

/** A price change only affects orders submitted later: order lines keep their price snapshot (BR-02, BR-12). */
export async function updateMenuItem(id: number, body: unknown) {
  const v = validateMenuItemInput(body, "update");
  if (!v.ok) throw new HttpError(422, "VALIDATION_ERROR", v.message, { fields: v.fields });
  const existing = await prisma.menuItem.count({ where: { id } });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Menu item not found.");
  await assertCategory(v.value.categoryId);
  try {
    return await prisma.menuItem.update({ where: { id }, data: v.value, select: itemSelect });
  } catch (err) {
    duplicateOr(err);
  }
}
