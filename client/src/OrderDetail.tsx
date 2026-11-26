// F-05 (customer) and F-06 (operator) — one order with its lines, history (FR-18) and the actions allowed for the role (F-07).
import { useEffect, useState } from "react";
import { ApiError, OrderDetail as Detail, formatTHB } from "./api.js";
import { CustomerActions, OperatorActions } from "./OrderActions.js";
import StatusBadge, { statusLabel } from "./StatusBadge.js";

export function OrderDetailView({ order, customerName }: { order: Detail; customerName?: string }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0">Order {order.orderNumber}</h2>
          <StatusBadge status={order.status} />
        </div>
        <p className="small text-muted mb-3">
          Placed {new Date(order.createdAt).toLocaleString()}
          {customerName && <> · Customer: {customerName}</>}
        </p>
        <div className="table-responsive">
          <table className="table table-sm">
            <caption className="visually-hidden">Order lines</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="text-end">Unit price</th>
                <th scope="col" className="text-end">Qty</th>
                <th scope="col" className="text-end">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.menuItemId}>
                  <td>{l.itemName}</td>
                  <td className="text-end text-nowrap">{formatTHB(l.unitPriceSatang)}</td>
                  <td className="text-end">{l.quantity}</td>
                  <td className="text-end text-nowrap">{formatTHB(l.lineTotalSatang)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="text-end">Total</th>
                <td className="text-end fw-semibold text-nowrap">{formatTHB(order.totalSatang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {order.note && <p className="small"><strong>Note:</strong> {order.note}</p>}
        <h3 className="h6 mt-3">History</h3>
        <ol className="small mb-0" aria-label="Status history">
          {order.history.map((h, i) => (
            <li key={i}>
              {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : ""}
              <strong>{statusLabel(h.toStatus)}</strong> by {h.actorName}, {new Date(h.createdAt).toLocaleString()}
              {h.reason && <> — Reason: {h.reason}</>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Loads an order with the given loader and shows loading / not-found / error states and the role's actions. */
export default function OrderDetailPage({
  load,
  onBack,
  backLabel = "← Back",
  role,
}: {
  load: () => Promise<Detail & { customer?: { name: string } }>;
  onBack: () => void;
  backLabel?: string;
  role?: "CUSTOMER" | "OPERATOR";
}) {
  const [order, setOrder] = useState<(Detail & { customer?: { name: string } }) | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloads, setReloads] = useState(0);
  const [message, setMessage] = useState<{ kind: "success" | "warning"; text: string } | null>(null);

  useEffect(() => setOrder(null), [load]);
  useEffect(() => {
    setError(null);
    load().then(setOrder).catch(setError);
  }, [load, reloads]);

  const reload = () => setReloads((n) => n + 1);
  const done = (text: string) => {
    setMessage({ kind: "success", text });
    reload();
  };
  const failed = (err: ApiError) => {
    setMessage({ kind: "warning", text: err.status === 409 ? `${err.message} The order has been refreshed.` : err.message });
    reload();
  };

  return (
    <div>
      <button className="btn btn-link px-0 mb-2" onClick={onBack}>{backLabel}</button>
      <div role="status" aria-live="polite">
        {message?.kind === "success" && <div className="alert alert-success py-2">{message.text}</div>}
      </div>
      {message?.kind === "warning" && <div className="alert alert-warning py-2" role="alert">{message.text}</div>}
      {error ? (
        <div className="alert alert-warning" role="alert">
          {error.status === 404 ? "This order was not found." : `We couldn't load this order. ${error.message}`}
        </div>
      ) : !order ? (
        <p className="text-muted" aria-busy="true">Loading the order…</p>
      ) : (
        <>
          <OrderDetailView order={order} customerName={order.customer?.name} />
          {role && (
            <div className="mt-3">
              {role === "CUSTOMER" ? (
                <CustomerActions order={order} onDone={done} onError={failed} />
              ) : (
                <OperatorActions order={order} onDone={done} onError={failed} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
