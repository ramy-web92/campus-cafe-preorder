// Standard error body (NFR-06): { error: { code, message, details? } }
import { Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ error: { code, message, ...(details !== undefined && { details }) } });
}

export const unauthenticated = () => new HttpError(401, "UNAUTHENTICATED", "Please sign in.");
export const forbidden = () => new HttpError(403, "FORBIDDEN", "You don't have access to this resource.");
export const notFound = (what = "Resource") => new HttpError(404, "NOT_FOUND", `${what} not found.`);
