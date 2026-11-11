// Server-side sessions stored in PostgreSQL (docs/system-sds.md §5.2, D-08).
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { config } from "../config.js";

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: "CUSTOMER" | "OPERATOR";
  }
}

const PgStore = connectPgSimple(session);

export const sessionStore = new PgStore({
  conString: process.env.DATABASE_URL,
  tableName: "session", // created by the init migration
  createTableIfMissing: false,
  pruneSessionInterval: process.env.NODE_ENV === "test" ? false : 60 * 15,
});

export const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

export const sessionMiddleware = session({
  name: "sid",
  secret: config.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true, // the 8 h expiry restarts on every request (inactivity timeout, NFR-04)
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    maxAge: EIGHT_HOURS_MS,
  },
});
