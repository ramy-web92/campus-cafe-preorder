// F-06, F-07 and F-08 endpoints (docs/sprints/sprint-1/F-06-accept.md, docs/sprints/sprint-2/F-07…, F-08…) — Operators only.
import { Router } from "express";
import { requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { parsePage } from "../services/orderService.js";
import { dashboard, salesSummary } from "../services/salesService.js";
import { acceptOrder, advanceOrder, cancelOrderByOperator, getOrderForOperator, listQueue, parseStatusFilter, rejectOrder } from "../services/operatorService.js";

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

// F-08 (docs/sprints/sprint-2/F-08-lifecycle-history.md)
operatorRouter.post("/api/operator/orders/:id/status", async (req, res, next) => {
  try {
    res.status(200).json({ order: await advanceOrder(parseId(req.params.id), req.session.userId!, req.body?.status) });
  } catch (err) {
    next(err);
  }
});

// F-12 (docs/sprints/sprint-3/F-12-sales-dashboard.md)
operatorRouter.get("/api/operator/sales", async (req, res, next) => {
  try {
    res.status(200).json(await salesSummary(req.query.date));
  } catch (err) {
    next(err);
  }
});

operatorRouter.get("/api/operator/dashboard", async (_req, res, next) => {
  try {
    res.status(200).json(await dashboard());
  } catch (err) {
    next(err);
  }
});
