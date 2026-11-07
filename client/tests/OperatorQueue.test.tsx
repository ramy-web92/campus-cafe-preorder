// UI-03 — docs/sprints/sprint-1/sts.md (AC-30, AC-31, AC-32). The API module is mocked.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OperatorQueue from "../src/OperatorQueue.js";
import * as api from "../src/api.js";

vi.mock("../src/api.js", async (orig) => {
  const actual = await orig<typeof import("../src/api.js")>();
  return { ...actual, operatorApi: { list: vi.fn(), get: vi.fn(), accept: vi.fn() } };
});

const order = { id: 12, orderNumber: "ORD-20261106-0004", customerName: "Alice Customer", status: "SUBMITTED", totalSatang: 17500, itemCount: 3, createdAt: new Date().toISOString() };
const page = (orders: any[]) => ({ orders, pagination: { page: 1, pageSize: 10, totalItems: orders.length, totalPages: 1 } });

beforeEach(() => {
  vi.mocked(api.operatorApi.list).mockReset();
  vi.mocked(api.operatorApi.accept).mockReset();
});

describe("Operator queue", () => {
  it("lists submitted orders with customer, total and an Accept button (AC-30)", async () => {
    vi.mocked(api.operatorApi.list).mockResolvedValue(page([order]));
    render(<OperatorQueue onOpen={vi.fn()} />);
    expect(await screen.findByText("Alice Customer")).toBeInTheDocument();
    expect(screen.getByText("175.00 THB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept ORD-20261106-0004" })).toBeEnabled();
    expect(api.operatorApi.list).toHaveBeenCalledWith("SUBMITTED");
  });

  it("accepts an order and refreshes the list (AC-31)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.operatorApi.list).mockResolvedValueOnce(page([order])).mockResolvedValueOnce(page([]));
    vi.mocked(api.operatorApi.accept).mockResolvedValueOnce({} as any);
    render(<OperatorQueue onOpen={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Accept ORD-20261106-0004" }));
    expect(api.operatorApi.accept).toHaveBeenCalledWith(12);
    expect(await screen.findByText("Order ORD-20261106-0004 accepted.")).toBeInTheDocument();
    expect(await screen.findByText("No submitted orders right now.")).toBeInTheDocument();
  });

  it("UI-03 explains a 409 conflict and reloads the list (AC-32)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.operatorApi.list).mockResolvedValueOnce(page([order])).mockResolvedValueOnce(page([]));
    vi.mocked(api.operatorApi.accept).mockRejectedValueOnce({ status: 409, code: "INVALID_TRANSITION", message: "Only submitted orders can be accepted." });
    render(<OperatorQueue onOpen={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Accept ORD-20261106-0004" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("was already handled");
    await waitFor(() => expect(api.operatorApi.list).toHaveBeenCalledTimes(2));
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    vi.mocked(api.operatorApi.list).mockResolvedValue(page([]));
    render(<OperatorQueue onOpen={vi.fn()} />);
    await screen.findByText("No submitted orders right now.");
    await user.selectOptions(screen.getByLabelText("Status"), "ACCEPTED");
    await waitFor(() => expect(api.operatorApi.list).toHaveBeenLastCalledWith("ACCEPTED"));
  });
});
