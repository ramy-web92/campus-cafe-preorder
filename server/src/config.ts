// All configuration comes from environment variables (docs/system-sds.md §6, docs/labs/lab-05/deployment.md).
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 3000),
  // Comma-separated list of browser origins allowed to call the API from another origin.
  // In the cloud the SPA is served by this server (same origin), so it can stay empty.
  corsOrigins: (process.env.CORS_ORIGIN ?? (isProduction ? "" : "http://localhost:5173"))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Secure (HTTPS-only) session cookie. Default: on in production. docker-compose sets false because
  // the local stack is served over plain http://localhost.
  cookieSecure: (process.env.COOKIE_SECURE ?? String(isProduction)).toLowerCase() === "true",
  sessionSecret: isProduction ? required("SESSION_SECRET") : process.env.SESSION_SECRET ?? "dev-only-secret",
  // Built React app served by Express in the container (empty = do not serve static files).
  staticDir: process.env.STATIC_DIR ?? (isProduction ? path.resolve(process.cwd(), "../client/dist") : ""),
};
