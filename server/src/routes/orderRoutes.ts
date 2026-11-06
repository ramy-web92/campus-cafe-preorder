// F-04 endpoint (docs/sprints/sprint-1/F-03-F-04-place-order.md). F-05 adds the read endpoints.
import { Router } from "express";
import { requireRole } from "../http/auth.js";
import { createOrder } from "../services/orderService.js";

export const orderRouter = Router();

orderRouter.post("/api/orders", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const order = await createOrder(req.session.userId!, req.body);
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});
