// F-05 UI (AC-20, AC-21, AC-22); UI-F01 — docs/sprints/sprint-3/sts.md (F-13). The API module is mocked.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyOrders from "../src/MyOrders.js";
import OrderDetailPage from "../src/OrderDetail.js";
import * as api from "../src/api.js";

vi.mock("../src/api.js", async (orig) => {
  const actual = await orig<typeof import("../src/api.js")>();
  return { ...actual, myOrdersApi: { list: vi.fn(), get: vi.fn() } };
});

const page = (orders: any[]) => ({ orders, pagination: { page: 1, pageSize: 10, totalItems: orders.length, totalPages: orders.length ? 1 : 0 } });

describe("My orders", () => {
  it("lists orders with number, total and a text status, and opens one", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    vi.mocked(api.myOrdersApi.list).mockResolvedValueOnce(page([
      { id: 12, orderNumber: "ORD-20261106-0004", status: "ACCEPTED", totalSatang: 17500, itemCount: 3, createdAt: "2026-11-06T03:00:00Z" },
    ]));
    render(<MyOrders onOpen={onOpen} onBrowseMenu={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "ORD-20261106-0004" }));
    expect(onOpen).toHaveBeenCalledWith(12);
    expect(screen.getByText("175.00 THB")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Accepted")).toBeInTheDocument(); // the F-13 status filter also lists "Accepted"
  });

  it("shows an empty state with a link to the menu", async () => {
    vi.mocked(api.myOrdersApi.list).mockResolvedValueOnce(page([]));
    render(<MyOrders onOpen={vi.fn()} onBrowseMenu={vi.fn()} />);
    expect(await screen.findByText(/No orders yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse the menu" })).toBeInTheDocument();
  });
});

describe("My orders filters (F-13)", () => {
  it("UI-F01 applies a status filter, shows the filtered empty state, and clears it (AC-120, AC-123)", async () => {
    const user = userEvent.setup();
    const one = { id: 12, orderNumber: "ORD-20261106-0004", status: "ACCEPTED", totalSatang: 17500, itemCount: 3, createdAt: "2026-11-06T03:00:00Z" };
    vi.mocked(api.myOrdersApi.list).mockReset().mockResolvedValueOnce(page([one])).mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([one]));
    render(<MyOrders onOpen={vi.fn()} onBrowseMenu={vi.fn()} />);
    await screen.findByRole("button", { name: "ORD-20261106-0004" });
    await user.selectOptions(screen.getByLabelText("Status"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(api.myOrdersApi.list).toHaveBeenLastCalledWith(1, { status: "CANCELLED" }));
    expect(await screen.findByText("No orders match these filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(api.myOrdersApi.list).toHaveBeenLastCalledWith(1, {}));
    expect(await screen.findByRole("button", { name: "ORD-20261106-0004" })).toBeInTheDocument();
  });

  it("UI-F01 shows the server's field error for an invalid date range (AC-123)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.myOrdersApi.list).mockReset()
      .mockResolvedValueOnce(page([]))
      .mockRejectedValueOnce({ status: 422, code: "VALIDATION_ERROR", message: "Please correct the filters.", details: { fields: { to: "The end date must be on or after the start date." } } });
    render(<MyOrders onOpen={vi.fn()} onBrowseMenu={vi.fn()} />);
    await screen.findByText(/No orders yet/);
    await user.type(screen.getByLabelText("From"), "2026-11-26");
    await user.type(screen.getByLabelText("To"), "2026-11-25");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("The end date must be on or after the start date.")).toBeInTheDocument();
  });
});

describe("Order detail", () => {
  it("shows lines, total and history (AC-21)", async () => {
    const load = vi.fn().mockResolvedValue({
      id: 12, orderNumber: "ORD-20261106-0004", status: "SUBMITTED", totalSatang: 17500, note: "Less ice", createdAt: "2026-11-06T03:00:00Z", acceptedAt: null,
      lines: [{ menuItemId: 3, itemName: "Iced Latte", unitPriceSatang: 6500, quantity: 2, lineTotalSatang: 13000 }],
      history: [{ fromStatus: null, toStatus: "SUBMITTED", actorName: "Alice Customer", reason: null, createdAt: "2026-11-06T03:00:00Z" }],
    });
    render(<OrderDetailPage load={load} onBack={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Order ORD-20261106-0004" })).toBeInTheDocument();
    expect(screen.getByText("130.00 THB")).toBeInTheDocument();
    expect(screen.getByText("175.00 THB")).toBeInTheDocument();
    expect(screen.getByText(/by Alice Customer/)).toBeInTheDocument();
  });

  it("shows a not-found message for another customer's order (AC-22)", async () => {
    const load = vi.fn().mockRejectedValue({ status: 404, code: "NOT_FOUND", message: "Order not found." });
    render(<OrderDetailPage load={load} onBack={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This order was not found.");
  });
});
