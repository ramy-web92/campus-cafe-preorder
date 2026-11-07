// F-05 (customer) and F-06 (operator) — one order with its lines and history.
import { useEffect, useState } from "react";
import { ApiError, OrderDetail as Detail, formatTHB } from "./api.js";
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
        <ol className="small mb-0">
          {order.history.map((h, i) => (
            <li key={i}>
              {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : ""}
              <strong>{statusLabel(h.toStatus)}</strong> by {h.actorName}, {new Date(h.createdAt).toLocaleString()}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Loads an order with the given loader and shows loading / not-found / error states. */
export default function OrderDetailPage({
  load,
  onBack,
  backLabel = "← Back",
}: {
  load: () => Promise<Detail & { customer?: { name: string } }>;
  onBack: () => void;
  backLabel?: string;
}) {
  const [order, setOrder] = useState<(Detail & { customer?: { name: string } }) | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    setOrder(null);
    setError(null);
    load().then(setOrder).catch(setError);
  }, [load]);

  return (
    <div>
      <button className="btn btn-link px-0 mb-2" onClick={onBack}>{backLabel}</button>
      {error ? (
        <div className="alert alert-warning" role="alert">
          {error.status === 404 ? "This order was not found." : `We couldn't load this order. ${error.message}`}
        </div>
      ) : !order ? (
        <p className="text-muted" aria-busy="true">Loading the order…</p>
      ) : (
        <OrderDetailView order={order} customerName={order.customer?.name} />
      )}
    </div>
  );
}
