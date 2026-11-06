// F-03 Menu browsing (FR-04).
import { prisma } from "../prisma.js";

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
