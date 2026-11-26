// F-03 endpoint (docs/sprints/sprint-1/F-03-F-04-place-order.md) and F-09 (docs/sprints/sprint-2/F-09-menu-management.md)
import { Router } from "express";
import { requireAuth, requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { createMenuItem, getMenu, updateMenuItem } from "../services/menuService.js";

export const menuRouter = Router();

menuRouter.get("/api/menu", requireAuth, async (_req, res, next) => {
  try {
    res.status(200).json({ categories: await getMenu() });
  } catch (err) {
    next(err);
  }
});

menuRouter.post("/api/operator/menu-items", requireRole("OPERATOR"), async (req, res, next) => {
  try {
    res.status(201).json({ item: await createMenuItem(req.body) });
  } catch (err) {
    next(err);
  }
});

menuRouter.patch("/api/operator/menu-items/:id", requireRole("OPERATOR"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "NOT_FOUND", "Menu item not found.");
    res.status(200).json({ item: await updateMenuItem(id, req.body) });
  } catch (err) {
    next(err);
  }
});
