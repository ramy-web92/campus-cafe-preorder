// F-06 — incoming orders, oldest first, with Accept. The server decides whether the order can still be accepted.
import { useEffect, useState } from "react";
import { ApiError, Page, QueueOrder, formatTHB, operatorApi } from "./api.js";
import StatusBadge, { statusLabel } from "./StatusBadge.js";

const FILTERS = ["SUBMITTED", "ACCEPTED"];

function minutesAgo(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min ago` : new Date(iso).toLocaleString();
}

export default function OperatorQueue({ onOpen }: { onOpen: (id: number) => void }) {
  const [status, setStatus] = useState("SUBMITTED");
  const [data, setData] = useState<Page<QueueOrder> | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "warning"; text: string } | null>(null);

  async function load(s = status) {
    setError("");
    try {
      setData(await operatorApi.list(s));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    setData(null);
    load(status);
  }, [status]);

  async function accept(o: QueueOrder) {
    if (busyId) return;
    setBusyId(o.id);
    setMessage(null);
    try {
      await operatorApi.accept(o.id);
      setMessage({ kind: "success", text: `Order ${o.orderNumber} accepted.` });
    } catch (e) {
      const err = e as ApiError;
      setMessage({
        kind: "warning",
        text: err.status === 409 ? `Order ${o.orderNumber} was already handled. The list has been refreshed.` : err.message,
      });
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <section aria-labelledby="queue-title">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 id="queue-title" className="h5 mb-0">Order queue</h2>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="queue-status" className="small text-muted">Status</label>
          <select id="queue-status" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f} value={f}>{statusLabel(f)}</option>
            ))}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => load()}>Refresh</button>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {message?.kind === "success" && <div className="alert alert-success py-2">{message.text}</div>}
      </div>
      {message?.kind === "warning" && <div className="alert alert-warning py-2" role="alert">{message.text}</div>}

      {error ? (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>We couldn't load the queue. {error}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={() => load()}>Retry</button>
        </div>
      ) : !data ? (
        <p className="text-muted" aria-busy="true">Loading the queue…</p>
      ) : data.orders.length === 0 ? (
        <p className="text-muted">{status === "SUBMITTED" ? "No submitted orders right now." : `No ${statusLabel(status).toLowerCase()} orders.`}</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <caption className="visually-hidden">{statusLabel(status)} orders, oldest first</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Placed</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id}>
                  <td><button className="btn btn-link p-0" onClick={() => onOpen(o.id)}>{o.orderNumber}</button></td>
                  <td>{o.customerName}</td>
                  <td>{o.itemCount}</td>
                  <td className="text-nowrap">{formatTHB(o.totalSatang)}</td>
                  <td className="text-nowrap">{minutesAgo(o.createdAt)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    {o.status === "SUBMITTED" && (
                      <button className="btn btn-primary btn-sm" onClick={() => accept(o)} disabled={busyId !== null} aria-label={`Accept ${o.orderNumber}`}>
                        {busyId === o.id ? "Accepting…" : "Accept"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
