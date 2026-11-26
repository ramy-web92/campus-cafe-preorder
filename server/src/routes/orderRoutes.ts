// F-04, F-05, F-07 (customer cancel) and F-10 (pay) endpoints (docs/sprints/sprint-1/F-03-F-04-place-order.md, F-05-my-orders.md).
import { Router } from "express";
import { requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { cancelOrderByCustomer, createOrder, payOrder, getCustomerOrder, listCustomerOrders, parsePage } from "../services/orderService.js";

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

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  return id;
}

orderRouter.get("/api/orders/:id", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    res.status(200).json({ order: await getCustomerOrder(req.session.userId!, parseId(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

// F-07 (docs/sprints/sprint-2/F-07-reject-cancel.md)
orderRouter.post("/api/orders/:id/cancel", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    res.status(200).json({ order: await cancelOrderByCustomer(req.session.userId!, parseId(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

// F-10 (docs/sprints/sprint-2/F-10-payment.md)
orderRouter.post("/api/orders/:id/pay", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    res.status(200).json({ order: await payOrder(req.session.userId!, parseId(req.params.id)) });
  } catch (err) {
    next(err);
  }
});
