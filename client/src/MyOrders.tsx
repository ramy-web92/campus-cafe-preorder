// F-05 — the customer's own orders, newest first.
import { useEffect, useState } from "react";
import { ApiError, OrderSummary, Page, formatTHB, myOrdersApi } from "./api.js";
import StatusBadge from "./StatusBadge.js";

export default function MyOrders({ onOpen, onBrowseMenu }: { onOpen: (id: number) => void; onBrowseMenu: () => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<OrderSummary> | null>(null);
  const [error, setError] = useState("");

  async function load(p = page) {
    setError("");
    setData(null);
    try {
      setData(await myOrdersApi.list(p));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    load(page);
  }, [page]);

  if (error)
    return (
      <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
        <span>We couldn't load your orders. {error}</span>
        <button className="btn btn-sm btn-outline-danger" onClick={() => load()}>Retry</button>
      </div>
    );
  if (!data) return <p className="text-muted" aria-busy="true">Loading your orders…</p>;

  return (
    <section aria-labelledby="my-orders-title">
      <h2 id="my-orders-title" className="h5">My orders</h2>
      {data.orders.length === 0 ? (
        <p className="text-muted">
          No orders yet.{" "}
          <button className="btn btn-link p-0 align-baseline" onClick={onBrowseMenu}>Browse the menu</button>
        </p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <caption className="visually-hidden">Your orders, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Date</th>
                  <th scope="col">Items</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <button className="btn btn-link p-0" onClick={() => onOpen(o.id)}>{o.orderNumber}</button>
                    </td>
                    <td className="text-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                    <td>{o.itemCount}</td>
                    <td className="text-nowrap">{formatTHB(o.totalSatang)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center">
              <span className="small text-muted">Page {data.pagination.page} of {data.pagination.totalPages}</span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn btn-outline-secondary btn-sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
