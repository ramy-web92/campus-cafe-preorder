// Order status with text + icon (never color alone).
const META: Record<string, { label: string; icon: string; cls: string }> = {
  SUBMITTED: { label: "Submitted", icon: "●", cls: "bg-warning-subtle text-warning-emphasis" },
  ACCEPTED: { label: "Accepted", icon: "✓", cls: "bg-success-subtle text-success-emphasis" },
  PREPARING: { label: "Preparing", icon: "◐", cls: "bg-info-subtle text-info-emphasis" },
  READY: { label: "Ready", icon: "★", cls: "bg-primary-subtle text-primary-emphasis" },
  PICKED_UP: { label: "Picked up", icon: "■", cls: "bg-secondary-subtle text-secondary-emphasis" },
  REJECTED: { label: "Rejected", icon: "✕", cls: "bg-danger-subtle text-danger-emphasis" },
  CANCELLED: { label: "Cancelled", icon: "✕", cls: "bg-secondary-subtle text-secondary-emphasis" },
};

export function statusLabel(status: string) {
  return META[status]?.label ?? status;
}

export default function StatusBadge({ status }: { status: string }) {
  const m = META[status] ?? { label: status, icon: "", cls: "bg-secondary-subtle" };
  return (
    <span className={`badge rounded-pill ${m.cls}`}>
      <span aria-hidden="true">{m.icon} </span>
      {m.label}
    </span>
  );
}

// F-10 payment status, also text + icon.
const PAYMENT: Record<string, { label: string; icon: string; cls: string }> = {
  UNPAID: { label: "Unpaid", icon: "○", cls: "bg-light text-dark border" },
  PAID: { label: "Paid", icon: "฿", cls: "bg-success-subtle text-success-emphasis" },
  REFUNDED: { label: "Refunded", icon: "↺", cls: "bg-secondary-subtle text-secondary-emphasis" },
};

export function paymentLabel(status: string) {
  return PAYMENT[status]?.label ?? status;
}

export function PaymentBadge({ status }: { status?: string }) {
  if (!status) return null;
  const m = PAYMENT[status] ?? { label: status, icon: "", cls: "bg-light" };
  return (
    <span className={`badge rounded-pill ${m.cls}`}>
      <span aria-hidden="true">{m.icon} </span>
      {m.label}
    </span>
  );
}
