// F-06/F-07 — incoming orders, oldest first, with Accept / Reject / Cancel. The server decides whether the change is still allowed.
import { useEffect, useState } from "react";
import { ApiError, Page, QueueOrder, formatPickup, formatTHB, operatorApi } from "./api.js";
import StatusBadge, { PaymentBadge, statusLabel } from "./StatusBadge.js";
import { OperatorActions } from "./OrderActions.js";

// F-08: every status can be listed (FR-11, AC-66).
const FILTERS = ["SUBMITTED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "REJECTED", "CANCELLED"];

function minutesAgo(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min ago` : new Date(iso).toLocaleString();
}

export default function OperatorQueue({ onOpen }: { onOpen: (id: number) => void }) {
  const [status, setStatus] = useState("SUBMITTED");
  const [data, setData] = useState<Page<QueueOrder> | null>(null);
  const [error, setError] = useState("");
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

  function done(text: string) {
    setMessage({ kind: "success", text });
    load();
  }
  function failed(o: QueueOrder, err: ApiError) {
    setMessage({
      kind: "warning",
      text: err.status === 409 ? `Order ${o.orderNumber} was already handled. The list has been refreshed.` : err.message,
    });
    load();
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
            <caption className="visually-hidden">{statusLabel(status)} orders, earliest pickup first</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Pickup</th>
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
                  <td className="text-nowrap">{o.pickupAsap === false ? formatPickup(o) : "ASAP"}</td>
                  <td className="text-nowrap">{minutesAgo(o.createdAt)}</td>
                  <td><div className="d-flex flex-wrap gap-1"><StatusBadge status={o.status} /> <PaymentBadge status={o.paymentStatus} /></div></td>
                  <td>
                    <OperatorActions order={o} onDone={done} onError={(err) => failed(o, err)} />
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
