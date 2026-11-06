// Authentication rules: FR-01, BR-17, NFR-03.
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { HttpError } from "../http/errors.js";

export type SafeUser = { id: number; name: string; email: string; role: "CUSTOMER" | "OPERATOR" };

const INVALID = () => new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
// Real hash of a random value, compared when the account does not exist (constant-ish timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export function toSafeUser(u: { id: number; name: string; email: string; role: "CUSTOMER" | "OPERATOR" }): SafeUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

/** Unknown e-mail, wrong password and inactive account all give the same error (AC-02). */
export async function verifyCredentials(email: string, password: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.isActive) {
    // Compare anyway so the response time does not reveal whether the account exists.
    await bcrypt.compare(password, DUMMY_HASH);
    throw INVALID();
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw INVALID();
  return toSafeUser(user);
}

/** Reloads the session user; returns null if the account no longer exists or was deactivated. */
export async function loadActiveUser(id: number): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.isActive ? toSafeUser(user) : null;
}
