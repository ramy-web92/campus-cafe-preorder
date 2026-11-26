// Order actions by role (F-06 accept, F-07 reject/cancel, F-08 lifecycle). The server checks every transition again (BR-06);
// these buttons only show what is allowed for the status the user is looking at.
import { FormEvent, useState } from "react";
import { ApiError, myOrdersApi, operatorApi } from "./api.js";
import { statusLabel } from "./StatusBadge.js";

// F-08: the one forward step allowed from each status (BR-06).
const NEXT_STEP: Record<string, { to: "PREPARING" | "READY" | "PICKED_UP"; label: string }> = {
  ACCEPTED: { to: "PREPARING", label: "Start preparing" },
  PREPARING: { to: "READY", label: "Mark ready" },
  READY: { to: "PICKED_UP", label: "Picked up" },
};

type Mode = null | "reject" | "cancel";
interface Target {
  id: number;
  orderNumber: string;
  status: string;
}

/** Operator: Accept / Reject on Submitted orders, next lifecycle step, Cancel order on Accepted orders (reason required). */
export function OperatorActions({
  order,
  onDone,
  onError,
}: {
  order: Target;
  onDone: (message: string) => void;
  onError: (err: ApiError) => void;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState("");

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      setMode(null);
      setReason("");
      onDone(success);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422 && err.details?.fields?.reason) setFieldError(err.details.fields.reason);
      else {
        setMode(null);
        onError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  function submitReason(e: FormEvent) {
    e.preventDefault();
    setFieldError("");
    if (mode === "reject") run(() => operatorApi.reject(order.id, reason.trim()), `Order ${order.orderNumber} rejected.`);
    if (mode === "cancel") run(() => operatorApi.cancel(order.id, reason.trim()), `Order ${order.orderNumber} cancelled.`);
  }

  if (mode) {
    const inputId = `reason-${order.id}`;
    return (
      <form onSubmit={submitReason} className="d-grid gap-1" style={{ minWidth: "14rem" }} aria-label={`${mode === "reject" ? "Reject" : "Cancel"} ${order.orderNumber}`}>
        <label htmlFor={inputId} className="small fw-semibold">Reason</label>
        <textarea
          id={inputId}
          className={`form-control form-control-sm ${fieldError ? "is-invalid" : ""}`}
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby={`${inputId}-help`}
          autoFocus
        />
        <div id={`${inputId}-help`} className={fieldError ? "invalid-feedback d-block" : "form-text"}>
          {fieldError || `${reason.length}/300 · visible to the customer`}
        </div>
        <div className="d-flex flex-wrap gap-1">
          <button type="submit" className="btn btn-danger btn-sm" disabled={busy || reason.trim().length === 0}>
            {busy ? "Saving…" : mode === "reject" ? "Confirm reject" : "Confirm cancel"}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setMode(null); setFieldError(""); }} disabled={busy}>
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-1">
      {order.status === "SUBMITTED" && (
        <>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => operatorApi.accept(order.id), `Order ${order.orderNumber} accepted.`)} aria-label={`Accept ${order.orderNumber}`}>
            {busy ? "Accepting…" : "Accept"}
          </button>
          <button className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setMode("reject")} aria-label={`Reject ${order.orderNumber}`}>
            Reject
          </button>
        </>
      )}
      {NEXT_STEP[order.status] && (
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => {
            const step = NEXT_STEP[order.status];
            run(() => operatorApi.setStatus(order.id, step.to), `Order ${order.orderNumber} is now ${statusLabel(step.to)}.`);
          }}
          aria-label={`${NEXT_STEP[order.status].label} ${order.orderNumber}`}
        >
          {NEXT_STEP[order.status].label}
        </button>
      )}
      {order.status === "ACCEPTED" && (
        <button className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setMode("cancel")} aria-label={`Cancel ${order.orderNumber}`}>
          Cancel order
        </button>
      )}
    </div>
  );
}

/** Customer: Cancel order while Submitted, with a confirmation step (FR-12). */
export function CustomerActions({
  order,
  onDone,
  onError,
}: {
  order: Target;
  onDone: (message: string) => void;
  onError: (err: ApiError) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      await myOrdersApi.cancel(order.id);
      onDone("Your order was cancelled.");
    } catch (e) {
      onError(e as ApiError);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (order.status !== "SUBMITTED") return null;
  return confirming ? (
    <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2 mb-0" role="alertdialog" aria-label="Confirm cancellation">
      <span>Cancel this order? This cannot be undone.</span>
      <button className="btn btn-danger btn-sm" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Yes, cancel order"}</button>
      <button className="btn btn-outline-secondary btn-sm" onClick={() => setConfirming(false)} disabled={busy}>Keep order</button>
    </div>
  ) : (
    <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirming(true)}>Cancel order</button>
  );
}
