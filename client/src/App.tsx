// Application shell: current user, role-based home, header with logout (F-01).
import { useCallback, useEffect, useState } from "react";
import { CurrentUser, authApi, myOrdersApi, operatorApi } from "./api.js";
import Login from "./Login.js";
import Menu from "./Menu.js";
import MyOrders from "./MyOrders.js";
import OrderDetailPage from "./OrderDetail.js";
import OperatorQueue from "./OperatorQueue.js";

const ROLE_LABELS = { CUSTOMER: "Customer", OPERATOR: "Operator" } as const;

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);
  // Customer screens (F-03..F-05)
  const [view, setView] = useState<"menu" | "orders" | "detail">("menu");
  const [orderId, setOrderId] = useState<number | null>(null);
  const loadCustomerOrder = useCallback(() => myOrdersApi.get(orderId!), [orderId]);
  const loadOperatorOrder = useCallback(() => operatorApi.get(orderId!), [orderId]);

  function openOrder(id: number) {
    setOrderId(id);
    setView("detail");
  }

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setView("menu");
    }
  }

  return (
    <div className="container py-4">
      <header className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h3 mb-0">
          KMUTT Café <span className="text-brand">Pre-Order</span>
        </h1>
        {user && (
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">
              {user.name} · <span className="badge bg-secondary">{ROLE_LABELS[user.role]}</span>
            </span>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>
      <main>
        {checking ? (
          <p className="text-muted" aria-busy="true">Loading…</p>
        ) : !user ? (
          <Login onLoggedIn={setUser} />
        ) : user.role === "CUSTOMER" ? (
          <>
            <nav aria-label="Customer" className="mb-3">
              <ul className="nav nav-pills gap-1">
                <li className="nav-item">
                  <button className={`nav-link ${view === "menu" ? "active" : ""}`} aria-current={view === "menu" ? "page" : undefined} onClick={() => setView("menu")}>Menu</button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${view !== "menu" ? "active" : ""}`} aria-current={view !== "menu" ? "page" : undefined} onClick={() => setView("orders")}>My orders</button>
                </li>
              </ul>
            </nav>
            {view === "menu" && <Menu onOrderPlaced={(o) => openOrder(o.id)} />}
            {view === "orders" && <MyOrders onOpen={openOrder} onBrowseMenu={() => setView("menu")} />}
            {view === "detail" && orderId && <OrderDetailPage load={loadCustomerOrder} onBack={() => setView("orders")} backLabel="← My orders" />}
          </>
        ) : (
          view === "detail" && orderId ? (
            <OrderDetailPage load={loadOperatorOrder} onBack={() => setView("menu")} backLabel="← Order queue" />
          ) : (
            <OperatorQueue onOpen={openOrder} />
          )
        )}
      </main>
      <footer className="mt-5 pt-3 border-top small text-muted text-center">
        KMUTT Café Pre-Order · Order ahead, pick up at the counter · Open 08:00–18:00
      </footer>
    </div>
  );
}
