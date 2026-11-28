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
  paymentStatus: PaymentStatus; // F-10
  paidAt: string | null;
  pickupAt?: string; // F-11
  pickupAsap?: boolean;
  lines: OrderLine[];
  history: { fromStatus: string | null; toStatus: string; actorName: string; reason: string | null; createdAt: string }[];
}

export const menuApi = {
  get: () => api<{ categories: MenuCategory[] }>("/api/menu").then((r) => r.categories),
};

// F-09 menu management (Operator)
export interface MenuItemInput {
  categoryId: number;
  name: string;
  description: string;
  priceSatang: number;
  isAvailable: boolean;
}
export type AdminMenuItem = MenuItem & { categoryId: number };
export const menuAdminApi = {
  create: (item: MenuItemInput) =>
    api<{ item: AdminMenuItem }>("/api/operator/menu-items", { method: "POST", body: JSON.stringify(item) }).then((r) => r.item),
  update: (id: number, changes: Partial<MenuItemInput>) =>
    api<{ item: AdminMenuItem }>(`/api/operator/menu-items/${id}`, { method: "PATCH", body: JSON.stringify(changes) }).then((r) => r.item),
};

export const ordersApi = {
  // pickupAt: ISO instant of a chosen pickup time (F-11); omitted = as soon as possible
  create: (lines: { menuItemId: number; quantity: number }[], note: string, pickupAt?: string) =>
    api<{ order: OrderDetail }>("/api/orders", { method: "POST", body: JSON.stringify({ lines, note: note || undefined, pickupAt }) }).then((r) => r.order),
};

/** 6500 → "65.00 THB" (prices are integer satang, D-03). */
export function formatTHB(satang: number): string {
  return `${(satang / 100).toFixed(2)} THB`;
}

// ---------------------------------------------------------------------------
// My orders (F-05)

export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: PaymentStatus;
  pickupAt?: string; // F-11
  pickupAsap?: boolean;
  totalSatang: number;
  itemCount: number;
  createdAt: string;
}
export interface Page<T> {
  orders: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

// F-13 filters; empty values are not sent
export interface OrderFilters {
  status?: string;
  from?: string;
  to?: string;
}
export const myOrdersApi = {
  list: (page = 1, filters: OrderFilters = {}) => {
    const params = new URLSearchParams({ page: String(page) });
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    return api<Page<OrderSummary>>(`/api/orders?${params}`);
  },
  get: (id: number) => api<{ order: OrderDetail }>(`/api/orders/${id}`).then((r) => r.order),
  // F-07
  cancel: (id: number) => api<{ order: OrderDetail }>(`/api/orders/${id}/cancel`, { method: "POST" }).then((r) => r.order),
  // F-10
  pay: (id: number) => api<{ order: OrderDetail }>(`/api/orders/${id}/pay`, { method: "POST" }).then((r) => r.order),
};

// ---------------------------------------------------------------------------
// Operator queue and actions (F-06, F-07, F-08)

export interface SalesSummary {
  date: string;
  completedOrders: number;
  revenueSatang: number;
  topItems: { menuItemId: number; itemName: string; quantity: number; revenueSatang: number }[];
}

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
  // F-12
  sales: (date?: string) => api<SalesSummary>(`/api/operator/sales${date ? `?date=${date}` : ""}`),
  dashboard: () => api<{ date: string; counts: Record<string, number> }>("/api/operator/dashboard"),
  // F-08
  setStatus: (id: number, status: "PREPARING" | "READY" | "PICKED_UP") =>
    api<{ order: OrderDetail }>(`/api/operator/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }).then((r) => r.order),
};

/** F-11: "ASAP" or the pickup date/time in Bangkok time (D-07). */
export function formatPickup(o: { pickupAt?: string; pickupAsap?: boolean }): string {
  if (o.pickupAsap !== false || !o.pickupAt) return "As soon as possible";
  return new Date(o.pickupAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
