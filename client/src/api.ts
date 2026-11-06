// Small fetch wrapper: always sends the session cookie and turns error bodies into ApiError.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: any;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw { status: 0, code: "NETWORK_ERROR", message: "Cannot reach the server. Check your connection." } as ApiError;
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw {
      status: res.status,
      code: body?.error?.code ?? "UNKNOWN",
      message: body?.error?.message ?? "Something went wrong.",
      details: body?.error?.details,
    } as ApiError;
  }
  return body as T;
}

export type Role = "CUSTOMER" | "OPERATOR";
export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<CurrentUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => api<CurrentUser>("/api/auth/me"),
  logout: () => api<void>("/api/auth/logout", { method: "POST" }),
};
