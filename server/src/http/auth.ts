// Access-control middleware (F-02). Hiding a button in the UI is never authorization.
import { NextFunction, Request, Response } from "express";
import { forbidden, unauthenticated } from "./errors.js";

export type Role = "CUSTOMER" | "OPERATOR";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId) return next(unauthenticated());
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) return next(unauthenticated());
    if (!req.session.role || !roles.includes(req.session.role)) return next(forbidden());
    next();
  };
}
