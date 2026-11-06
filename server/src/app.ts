import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { config } from "./config.js";

export const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Unknown API route → standard error body (NFR-06)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
});

// Last-resort error handler: never leak stack traces or SQL (NFR-06)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in (err as object)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "The request body is not valid JSON." } });
  }
  if (!config.isProduction && process.env.NODE_ENV !== "test") console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
});
