// F-04 and F-05 endpoints (docs/sprints/sprint-1/F-03-F-04-place-order.md, F-05-my-orders.md).
import { Router } from "express";
import { requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { createOrder, getCustomerOrder, listCustomerOrders, parsePage } from "../services/orderService.js";

export const orderRouter = Router();

orderRouter.post("/api/orders", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const order = await createOrder(req.session.userId!, req.body);
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

orderRouter.get("/api/orders", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    res.status(200).json(await listCustomerOrders(req.session.userId!, parsePage(req.query.page)));
  } catch (err) {
    next(err);
  }
});

orderRouter.get("/api/orders/:id", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    res.status(200).json({ order: await getCustomerOrder(req.session.userId!, id) });
  } catch (err) {
    next(err);
  }
});
