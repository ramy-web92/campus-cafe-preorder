// All configuration comes from environment variables (docs/system-sds.md §6).
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  sessionSecret: process.env.NODE_ENV === "production" ? required("SESSION_SECRET") : process.env.SESSION_SECRET ?? "dev-only-secret",
  isProduction: process.env.NODE_ENV === "production",
};
