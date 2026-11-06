import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { config } from "./config.js";
import { HttpError, sendError } from "./http/errors.js";
import { sessionMiddleware } from "./http/session.js";
import { authRouter } from "./routes/authRoutes.js";

export const app = express();

if (config.isProduction) app.set("trust proxy", 1); // secure cookies behind the Cloud Run proxy
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(sessionMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(authRouter);

// Test-only route used by TEST-S03 to check the 500 error body.
if (process.env.NODE_ENV === "test") {
  app.get("/api/__test__/boom", () => {
    throw new Error("Simulated failure: SELECT * FROM secret_table at line 42");
  });
}

// Unknown API route → standard error body (NFR-06)
app.use("/api", (_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Not found.");
});

// Last-resort error handler: never leak stack traces or SQL (NFR-06)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return sendError(res, err.status, err.code, err.message, err.details);
  if (err instanceof SyntaxError && "body" in (err as object)) {
    return sendError(res, 400, "BAD_REQUEST", "The request body is not valid JSON.");
  }
  if (process.env.NODE_ENV !== "test") console.error(err);
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
});
