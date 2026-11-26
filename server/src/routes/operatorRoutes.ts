// F-06 and F-07 endpoints (docs/sprints/sprint-1/F-06-accept.md, docs/sprints/sprint-2/F-07-reject-cancel.md) — Operators only.
import { Router } from "express";
import { requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { parsePage } from "../services/orderService.js";
import { acceptOrder, cancelOrderByOperator, getOrderForOperator, listQueue, parseStatusFilter, rejectOrder } from "../services/operatorService.js";

export const operatorRouter = Router();
operatorRouter.use("/api/operator", requireRole("OPERATOR"));

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  return id;
}

operatorRouter.get("/api/operator/orders", async (req, res, next) => {
  try {
    res.status(200).json(await listQueue(parseStatusFilter(req.query.status), parsePage(req.query.page)));
  } catch (err) {
    next(err);
  }
});

operatorRouter.get("/api/operator/orders/:id", async (req, res, next) => {
  try {
    res.status(200).json({ order: await getOrderForOperator(parseId(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

operatorRouter.post("/api/operator/orders/:id/accept", async (req, res, next) => {
  try {
    res.status(200).json({ order: await acceptOrder(parseId(req.params.id), req.session.userId!) });
  } catch (err) {
    next(err);
  }
});

operatorRouter.post("/api/operator/orders/:id/reject", async (req, res, next) => {
  try {
    res.status(200).json({ order: await rejectOrder(parseId(req.params.id), req.session.userId!, req.body?.reason) });
  } catch (err) {
    next(err);
  }
});

operatorRouter.post("/api/operator/orders/:id/cancel", async (req, res, next) => {
  try {
    res.status(200).json({ order: await cancelOrderByOperator(parseId(req.params.id), req.session.userId!, req.body?.reason) });
  } catch (err) {
    next(err);
  }
});
