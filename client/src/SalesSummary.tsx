// F-12 — daily sales summary for Operators (FR-16). The server counts only picked-up orders (BR-16).
import { FormEvent, useEffect, useState } from "react";
import { ApiError, SalesSummary as Summary, formatTHB, operatorApi } from "./api.js";

export default function SalesSummary() {
  const [date, setDate] = useState("");
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  async function load(d?: string) {
    setError("");
    try {
      const result = await operatorApi.sales(d);
      setData(result);
      setDate(result.date);
    } catch (e) {
      const err = e as ApiError;
      setError(err.details?.fields?.date ?? err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    load(date);
  }

  const average = data && data.completedOrders > 0 ? Math.round(data.revenueSatang / data.completedOrders) : 0;
  return (
    <section aria-labelledby="sales-title">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <h2 id="sales-title" className="h5 mb-0">Sales summary</h2>
        <form className="d-flex align-items-end gap-2" onSubmit={submit}>
          <div>
            <label htmlFor="sales-date" className="form-label small mb-0">Day</label>
            <input id="sales-date" type="date" className="form-control form-control-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-outline-secondary btn-sm">Show</button>
        </form>
      </div>
      {error && <div className="alert alert-warning py-2" role="alert">{error}</div>}
      {!data ? (
        !error && <p className="text-muted" aria-busy="true">Loading the summary…</p>
      ) : (
        <>
          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-4">
              <div className="card card-body py-2">
                <div className="small text-muted">Completed orders</div>
                <div className="h4 mb-0" data-testid="completed-orders">{data.completedOrders}</div>
              </div>
            </div>
            <div className="col-6 col-sm-4">
              <div className="card card-body py-2">
                <div className="small text-muted">Revenue</div>
                <div className="h4 mb-0">{formatTHB(data.revenueSatang)}</div>
              </div>
            </div>
            <div className="col-6 col-sm-4">
              <div className="card card-body py-2">
                <div className="small text-muted">Average order</div>
                <div className="h4 mb-0">{formatTHB(average)}</div>
              </div>
            </div>
          </div>
          <p className="small text-muted">Only picked-up orders count, at the prices they were sold for. Cancelled and rejected orders are excluded.</p>
          {data.topItems.length === 0 ? (
            <p className="text-muted">No completed orders on this day.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm" aria-label="Top items">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col" className="text-end">Quantity</th>
                    <th scope="col" className="text-end">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((t) => (
                    <tr key={t.menuItemId}>
                      <td>{t.itemName}</td>
                      <td className="text-end">{t.quantity}</td>
                      <td className="text-end text-nowrap">{formatTHB(t.revenueSatang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
