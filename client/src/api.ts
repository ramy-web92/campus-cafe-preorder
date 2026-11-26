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

// ---------------------------------------------------------------------------
// My orders (F-05)

export interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  totalSatang: number;
  itemCount: number;
  createdAt: string;
}
export interface Page<T> {
  orders: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export const myOrdersApi = {
  list: (page = 1) => api<Page<OrderSummary>>(`/api/orders?page=${page}`),
  get: (id: number) => api<{ order: OrderDetail }>(`/api/orders/${id}`).then((r) => r.order),
  // F-07
  cancel: (id: number) => api<{ order: OrderDetail }>(`/api/orders/${id}/cancel`, { method: "POST" }).then((r) => r.order),
};

// ---------------------------------------------------------------------------
// Operator queue and actions (F-06, F-07, F-08)

export interface QueueOrder extends OrderSummary {
  customerName: string;
}

export const operatorApi = {
  list: (status = "SUBMITTED", page = 1) => api<Page<QueueOrder>>(`/api/operator/orders?status=${status}&page=${page}`),
  get: (id: number) => api<{ order: OrderDetail & { customer: { id: number; name: string } } }>(`/api/operator/orders/${id}`).then((r) => r.order),
  accept: (id: number) => api<{ order: OrderDetail }>(`/api/operator/orders/${id}/accept`, { method: "POST" }).then((r) => r.order),
  // F-07
  reject: (id: number, reason: string) =>
    api<{ order: OrderDetail }>(`/api/operator/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }).then((r) => r.order),
  cancel: (id: number, reason: string) =>
    api<{ order: OrderDetail }>(`/api/operator/orders/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }).then((r) => r.order),
  // F-08
  setStatus: (id: number, status: "PREPARING" | "READY" | "PICKED_UP") =>
    api<{ order: OrderDetail }>(`/api/operator/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }).then((r) => r.order),
};
