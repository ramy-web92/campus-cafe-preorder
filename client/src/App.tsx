// Application shell: current user, role-based home, header with logout (F-01).
import { useEffect, useState } from "react";
import { CurrentUser, authApi } from "./api.js";
import Login from "./Login.js";

const ROLE_LABELS = { CUSTOMER: "Customer", OPERATOR: "Operator" } as const;

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

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
          <section aria-labelledby="home-title">
            <h2 id="home-title" className="h5">Menu</h2>
          </section>
        ) : (
          <section aria-labelledby="home-title">
            <h2 id="home-title" className="h5">Order queue</h2>
          </section>
        )}
      </main>
    </div>
  );
}
