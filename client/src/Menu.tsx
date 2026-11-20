// Menu & cart (F-03, F-04). The total shown here is an estimate; the server computes the real one (BR-01).
import { useEffect, useState } from "react";
import { ApiError, MenuCategory, MenuItem, OrderDetail, formatTHB, menuApi, ordersApi } from "./api.js";

const MIN_QTY = 1;
const MAX_QTY = 10;

export default function Menu({ onOrderPlaced }: { onOrderPlaced?: (order: OrderDetail) => void }) {
  const [categories, setCategories] = useState<MenuCategory[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [banner, setBanner] = useState("");
  const [placed, setPlaced] = useState<OrderDetail | null>(null);

  async function load() {
    setLoadError("");
    setCategories(null);
    try {
      setCategories(await menuApi.get());
    } catch (e) {
      setLoadError((e as ApiError).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const items = new Map<number, MenuItem>((categories ?? []).flatMap((c) => c.items.map((i) => [i.id, i] as [number, MenuItem])));
  const cartLines = [...cart.entries()].map(([id, qty]) => ({ item: items.get(id)!, qty })).filter((l) => l.item);
  const estimate = cartLines.reduce((s, l) => s + l.item.priceSatang * l.qty, 0);

  function setQty(id: number, qty: number) {
    setCart((c) => {
      const next = new Map(c);
      if (qty <= 0) next.delete(id);
      else next.set(id, Math.min(MAX_QTY, qty));
      return next;
    });
    setLineErrors((e) => ({ ...e, [id]: "" }));
  }

  async function placeOrder() {
    if (submitting || cartLines.length === 0) return;
    setSubmitting(true);
    setBanner("");
    setLineErrors({});
    try {
      const order = await ordersApi.create(cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })), note);
      setPlaced(order);
      setCart(new Map());
      setNote("");
      onOrderPlaced?.(order);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "ITEM_UNAVAILABLE") {
        const errors: Record<number, string> = {};
        for (const u of err.details?.items ?? []) errors[u.menuItemId] = `${u.name ?? "This item"} is sold out.`;
        setLineErrors(errors);
        setBanner("Some items are no longer available. Remove them and try again.");
        load(); // refresh availability, keep the cart
      } else if (err.code === "VALIDATION_ERROR") {
        setBanner("Please check your order: " + Object.values(err.details?.fields ?? {}).join(" "));
      } else {
        setBanner(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError && !categories) {
    return (
      <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
        <span>We couldn't load the menu. {loadError}</span>
        <button className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!categories) return <p className="text-muted" aria-busy="true">Loading the menu…</p>;

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-8">
        <h2 className="h5">Menu</h2>
        {categories.length === 0 && <p className="text-muted">The menu is empty.</p>}
        {categories.map((c) => (
          <section key={c.id} className="mb-4" aria-labelledby={`cat-${c.id}`}>
            <h3 id={`cat-${c.id}`} className="h6 text-brand">{c.name}</h3>
            <ul className="list-group">
              {c.items.map((i) => (
                <li key={i.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-semibold">{i.name}</div>
                    <div className="small text-muted">{i.description}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-nowrap">
                    <span>{formatTHB(i.priceSatang)}</span>
                    {i.isAvailable ? (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setQty(i.id, (cart.get(i.id) ?? 0) + 1)}
                        disabled={(cart.get(i.id) ?? 0) >= MAX_QTY}
                        aria-label={`Add ${i.name}`}
                      >
                        Add
                      </button>
                    ) : (
                      <>
                        <span className="badge bg-secondary">Sold out</span>
                        <button className="btn btn-sm btn-primary" disabled aria-label={`Add ${i.name}`}>Add</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="col-12 col-lg-4" aria-labelledby="cart-title">
        <div className="card">
          <div className="card-body">
            <h2 id="cart-title" className="h5">Your order</h2>
            {placed && (
              <div className="alert alert-success py-2" role="status">
                Order <strong>{placed.orderNumber}</strong> placed — total {formatTHB(placed.totalSatang)}.
              </div>
            )}
            {banner && <div className="alert alert-warning py-2" role="alert">{banner}</div>}
            {cartLines.length === 0 ? (
              <p className="text-muted small mb-0">Your cart is empty. Add items from the menu.</p>
            ) : (
              <>
                <ul className="list-unstyled">
                  {cartLines.map(({ item, qty }) => (
                    <li key={item.id} className="mb-2">
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <span>{item.name}</span>
                        <div className="btn-group btn-group-sm" role="group" aria-label={`Quantity of ${item.name}`}>
                          <button className="btn btn-outline-secondary" onClick={() => setQty(item.id, qty - 1)} aria-label={`Decrease ${item.name}`} disabled={qty <= MIN_QTY}>−</button>
                          <span className="btn btn-outline-secondary disabled" aria-live="polite">{qty}</span>
                          <button className="btn btn-outline-secondary" onClick={() => setQty(item.id, qty + 1)} aria-label={`Increase ${item.name}`} disabled={qty >= MAX_QTY}>+</button>
                        </div>
                        <button className="btn btn-link btn-sm text-danger p-0" onClick={() => setQty(item.id, 0)}>Remove</button>
                      </div>
                      {lineErrors[item.id] && <div className="small text-danger">{lineErrors[item.id]}</div>}
                    </li>
                  ))}
                </ul>
                <label htmlFor="order-note" className="form-label small">Note (optional)</label>
                <input id="order-note" className="form-control form-control-sm mb-2" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="d-flex justify-content-between fw-semibold mb-2">
                  <span>Total</span>
                  <span>{formatTHB(estimate)}</span>
                </div>
                <div className="small text-muted mb-2">The café confirms the final total when you place the order.</div>
                <button className="btn btn-primary w-100" onClick={placeOrder} disabled={submitting}>
                  {submitting ? "Placing order…" : "Place order"}
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
