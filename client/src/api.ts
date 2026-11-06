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

// ---------------------------------------------------------------------------
// Menu and orders (F-03, F-04)

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  priceSatang: number;
  isAvailable: boolean;
}
export interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}
export interface OrderLine {
  menuItemId: number;
  itemName: string;
  unitPriceSatang: number;
  quantity: number;
  lineTotalSatang: number;
}
export interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  totalSatang: number;
  note: string | null;
  createdAt: string;
  acceptedAt: string | null;
  lines: OrderLine[];
  history: { fromStatus: string | null; toStatus: string; actorName: string; reason: string | null; createdAt: string }[];
}

export const menuApi = {
  get: () => api<{ categories: MenuCategory[] }>("/api/menu").then((r) => r.categories),
};

export const ordersApi = {
  create: (lines: { menuItemId: number; quantity: number }[], note: string) =>
    api<{ order: OrderDetail }>("/api/orders", { method: "POST", body: JSON.stringify({ lines, note: note || undefined }) }).then((r) => r.order),
};

/** 6500 → "65.00 THB" (prices are integer satang, D-03). */
export function formatTHB(satang: number): string {
  return `${(satang / 100).toFixed(2)} THB`;
}
