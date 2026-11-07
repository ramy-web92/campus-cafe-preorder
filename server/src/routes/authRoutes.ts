// F-01 endpoints (docs/sprints/sprint-1/F-01-F-02-auth.md)
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../http/auth.js";
import { HttpError, unauthenticated } from "../http/errors.js";
import { loadActiveUser, verifyCredentials } from "../services/authService.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

authRouter.post("/api/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "BAD_REQUEST", "Email and password are required.");

    const user = await verifyCredentials(parsed.data.email, parsed.data.password);

    // New session id on login prevents session fixation.
    await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
    req.session.userId = user.id;
    req.session.role = user.role;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const user = await loadActiveUser(req.session.userId!);
    if (!user) {
      req.session.destroy(() => undefined);
      throw unauthenticated();
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/api/auth/logout", requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("sid");
    res.status(204).end();
  });
});
