// F-03 endpoint (docs/sprints/sprint-1/F-03-F-04-place-order.md)
import { Router } from "express";
import { requireAuth } from "../http/auth.js";
import { getMenu } from "../services/menuService.js";

export const menuRouter = Router();

menuRouter.get("/api/menu", requireAuth, async (_req, res, next) => {
  try {
    res.status(200).json({ categories: await getMenu() });
  } catch (err) {
    next(err);
  }
});
