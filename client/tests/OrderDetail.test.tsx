// UI-S02, UI-S04 — docs/sprints/sprint-2/sts.md (F-07 customer cancel and reasons, F-08 history). The API module is mocked.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderDetailPage from "../src/OrderDetail.js";
import * as api from "../src/api.js";

vi.mock("../src/api.js", async (orig) => {
  const actual = await orig<typeof import("../src/api.js")>();
  return {
    ...actual,
    myOrdersApi: { list: vi.fn(), get: vi.fn(), cancel: vi.fn(), pay: vi.fn() },
    operatorApi: { list: vi.fn(), get: vi.fn(), accept: vi.fn(), reject: vi.fn(), cancel: vi.fn(), setStatus: vi.fn() },
  };
});

const at = "2026-11-25T07:00:00.000Z";
const base: any = {
  id: 7,
  orderNumber: "ORD-20261125-0007",
  status: "SUBMITTED",
  totalSatang: 6500,
  note: null,
  createdAt: at,
  acceptedAt: null,
  paymentStatus: "UNPAID",
  paidAt: null,
  lines: [{ menuItemId: 1, itemName: "Iced Latte", unitPriceSatang: 6500, quantity: 1, lineTotalSatang: 6500 }],
  history: [{ fromStatus: null, toStatus: "SUBMITTED", actorName: "Alice Customer", reason: null, createdAt: at }],
};

beforeEach(() => {
  vi.mocked(api.myOrdersApi.cancel).mockReset();
});

describe("Customer order detail", () => {
  it("UI-S02 cancels a submitted order after confirmation (AC-53)", async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockResolvedValueOnce(base).mockResolvedValueOnce({ ...base, status: "CANCELLED" });
    vi.mocked(api.myOrdersApi.cancel).mockResolvedValueOnce({ ...base, status: "CANCELLED" });
    render(<OrderDetailPage role="CUSTOMER" load={load} onBack={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Cancel order" }));
    expect(screen.getByText("Cancel this order? This cannot be undone.")).toBeInTheDocument();
    expect(api.myOrdersApi.cancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Yes, cancel order" }));
    expect(api.myOrdersApi.cancel).toHaveBeenCalledWith(7);
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
  });

  it("UI-S02 shows the operator's reason on a rejected order (AC-58)", async () => {
    const rejected = {
      ...base,
      status: "REJECTED",
      history: [...base.history, { fromStatus: "SUBMITTED", toStatus: "REJECTED", actorName: "Olivia Operator", reason: "Sold out of milk", createdAt: at }],
    };
    render(<OrderDetailPage role="CUSTOMER" load={vi.fn().mockResolvedValue(rejected)} onBack={vi.fn()} />);
    expect(await screen.findByText(/Reason: Sold out of milk/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
  });

  it("UI-S04 lists the whole history in order with actor names (AC-64)", async () => {
    const steps = ["ACCEPTED", "PREPARING", "READY", "PICKED_UP"];
    const history = [base.history[0], ...steps.map((to, i) => ({ fromStatus: i === 0 ? "SUBMITTED" : steps[i - 1], toStatus: to, actorName: "Olivia Operator", reason: null, createdAt: at }))];
    render(<OrderDetailPage role="CUSTOMER" load={vi.fn().mockResolvedValue({ ...base, status: "PICKED_UP", history })} onBack={vi.fn()} />);
    const list = await screen.findByRole("list", { name: "Status history" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("Submitted by Alice Customer");
    expect(items[2]).toHaveTextContent("Accepted → Preparing by Olivia Operator");
    expect(items[4]).toHaveTextContent("Ready → Picked up by Olivia Operator");
  });
});
