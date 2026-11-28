// F-05 — the customer's own orders, newest first; F-13 status and date filters (FR-17).
import { FormEvent, useEffect, useState } from "react";
import { ApiError, OrderFilters, OrderSummary, Page, formatTHB, myOrdersApi, formatPickup } from "./api.js";
import StatusBadge, { PaymentBadge, statusLabel } from "./StatusBadge.js";

const STATUSES = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"];
const clean = (f: OrderFilters): OrderFilters => Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as OrderFilters;

export default function MyOrders({ onOpen, onBrowseMenu }: { onOpen: (id: number) => void; onBrowseMenu: () => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<OrderSummary> | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OrderFilters>({ status: "", from: "", to: "" });
  const [applied, setApplied] = useState<OrderFilters>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const filtering = Object.keys(applied).length > 0;

  async function load(p = page, f = applied) {
    setError("");
    try {
      setData(await myOrdersApi.list(p, f));
      setFieldErrors({});
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422 && err.details?.fields) setFieldErrors(err.details.fields);
      else setError(err.message);
    }
  }
  useEffect(() => {
    load(page, applied);
  }, [page, applied]);

  function apply(e?: FormEvent) {
    e?.preventDefault();
    setPage(1);
    setApplied(clean(draft));
  }
  function clear() {
    setDraft({ status: "", from: "", to: "" });
    setPage(1);
    setApplied({});
  }

  if (error)
    return (
      <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
        <span>We couldn't load your orders. {error}</span>
        <button className="btn btn-sm btn-outline-danger" onClick={() => load()}>Retry</button>
      </div>
    );
  if (!data) return <p className="text-muted" aria-busy="true">Loading your orders…</p>;

  const err = (k: string) => fieldErrors[k] && <div id={`filter-${k}-error`} className="invalid-feedback d-block">{fieldErrors[k]}</div>;
  return (
    <section aria-labelledby="my-orders-title">
      <h2 id="my-orders-title" className="h5">My orders</h2>
      <form className="row g-2 align-items-end mb-3" onSubmit={apply} aria-label="Filter my orders">
        <div className="col-12 col-sm-4">
          <label htmlFor="filter-status" className="form-label small mb-0">Status</label>
          <select id="filter-status" className={`form-select form-select-sm ${fieldErrors.status ? "is-invalid" : ""}`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} aria-describedby="filter-status-error">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          {err("status")}
        </div>
        <div className="col-6 col-sm-3">
          <label htmlFor="filter-from" className="form-label small mb-0">From</label>
          <input id="filter-from" type="date" className={`form-control form-control-sm ${fieldErrors.from ? "is-invalid" : ""}`} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-describedby="filter-from-error" />
          {err("from")}
        </div>
        <div className="col-6 col-sm-3">
          <label htmlFor="filter-to" className="form-label small mb-0">To</label>
          <input id="filter-to" type="date" className={`form-control form-control-sm ${fieldErrors.to ? "is-invalid" : ""}`} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-describedby="filter-to-error" />
          {err("to")}
        </div>
        <div className="col-12 col-sm-2 d-flex gap-1">
          <button type="submit" className="btn btn-primary btn-sm">Apply</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clear}>Clear</button>
        </div>
      </form>
      <div role="status" aria-live="polite" className="small text-muted mb-2">
        {filtering && `${data.pagination.totalItems} order${data.pagination.totalItems === 1 ? "" : "s"} match`}
      </div>
      {data.orders.length === 0 && filtering ? (
        <p className="text-muted">
          No orders match these filters.{" "}
          <button className="btn btn-link p-0 align-baseline" onClick={clear}>Clear filters</button>
        </p>
      ) : data.orders.length === 0 ? (
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
                  <th scope="col">Pickup</th>
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
                    <td className="text-nowrap">{o.pickupAsap === false ? formatPickup(o) : "ASAP"}</td>
                    <td>{o.itemCount}</td>
                    <td className="text-nowrap">{formatTHB(o.totalSatang)}</td>
                    <td><div className="d-flex flex-wrap gap-1"><StatusBadge status={o.status} /> <PaymentBadge status={o.paymentStatus} /></div></td>
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
