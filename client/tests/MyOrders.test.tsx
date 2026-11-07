// F-05 UI (AC-20, AC-21, AC-22). The API module is mocked.
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("shows an empty state with a link to the menu", async () => {
    vi.mocked(api.myOrdersApi.list).mockResolvedValueOnce(page([]));
    render(<MyOrders onOpen={vi.fn()} onBrowseMenu={vi.fn()} />);
    expect(await screen.findByText(/No orders yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse the menu" })).toBeInTheDocument();
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
