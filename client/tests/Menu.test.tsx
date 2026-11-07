// UI-01, UI-02 — docs/sprints/sprint-1/sts.md (AC-10, AC-15, AC-17). The API module is mocked.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Menu from "../src/Menu.js";
import * as api from "../src/api.js";

vi.mock("../src/api.js", async (orig) => {
  const actual = await orig<typeof import("../src/api.js")>();
  return { ...actual, menuApi: { get: vi.fn() }, ordersApi: { create: vi.fn() } };
});

const menu = [
  { id: 1, name: "Coffee", items: [
    { id: 3, name: "Iced Latte", description: "Double shot", priceSatang: 6500, isAvailable: true },
    { id: 5, name: "Mocha", description: "Chocolate", priceSatang: 7000, isAvailable: false },
  ] },
  { id: 3, name: "Bakery", items: [{ id: 9, name: "Croissant", description: "Butter", priceSatang: 4500, isAvailable: true }] },
];

beforeEach(() => {
  vi.mocked(api.menuApi.get).mockReset().mockResolvedValue(menu);
  vi.mocked(api.ordersApi.create).mockReset();
});

describe("Menu and cart", () => {
  it("UI-01 shows sold-out items with text and a disabled Add button (AC-10)", async () => {
    render(<Menu />);
    expect(await screen.findByText("Iced Latte")).toBeInTheDocument();
    expect(screen.getByText("65.00 THB")).toBeInTheDocument();
    expect(screen.getByText("Sold out")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Mocha" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Iced Latte" })).toBeEnabled();
  });

  it("UI-02 keeps quantities between 1 and 10 (AC-15)", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(await screen.findByRole("button", { name: "Add Iced Latte" }));
    expect(screen.getByRole("button", { name: "Decrease Iced Latte" })).toBeDisabled();
    for (let i = 0; i < 9; i++) await user.click(screen.getByRole("button", { name: "Increase Iced Latte" }));
    const stepper = screen.getByRole("group", { name: "Quantity of Iced Latte" });
    expect(within(stepper).getByText("10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase Iced Latte" })).toBeDisabled();
  });

  it("UI-02 shows the sold-out message on the line and keeps the cart on 422 (AC-17)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.ordersApi.create).mockRejectedValueOnce({
      status: 422, code: "ITEM_UNAVAILABLE", message: "Not available: Croissant.", details: { items: [{ menuItemId: 9, name: "Croissant" }] },
    });
    render(<Menu />);
    await user.click(await screen.findByRole("button", { name: "Add Iced Latte" }));
    await user.click(screen.getByRole("button", { name: "Add Croissant" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByText("Croissant is sold out.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/no longer available/i);
    expect(screen.getByRole("group", { name: "Quantity of Iced Latte" })).toBeInTheDocument(); // cart kept
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
  });

  it("sends only item ids and quantities, then shows the server-confirmed order (AC-11, AC-13)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.ordersApi.create).mockResolvedValueOnce({
      id: 12, orderNumber: "ORD-20261106-0004", status: "SUBMITTED", totalSatang: 17500, note: null,
      createdAt: "2026-11-06T03:00:00Z", acceptedAt: null, lines: [], history: [],
    });
    render(<Menu />);
    await user.click(await screen.findByRole("button", { name: "Add Iced Latte" }));
    await user.click(screen.getByRole("button", { name: "Increase Iced Latte" }));
    await user.click(screen.getByRole("button", { name: "Add Croissant" }));
    expect(screen.getByText("175.00 THB")).toBeInTheDocument(); // estimate
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(api.ordersApi.create).toHaveBeenCalledWith([{ menuItemId: 3, quantity: 2 }, { menuItemId: 9, quantity: 1 }], "");
    expect(await screen.findByRole("status")).toHaveTextContent("ORD-20261106-0004");
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it("shows a safe error with Retry when the menu cannot load", async () => {
    const user = userEvent.setup();
    vi.mocked(api.menuApi.get).mockReset().mockRejectedValueOnce({ status: 500, message: "Something went wrong." }).mockResolvedValue(menu);
    render(<Menu />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load the menu/i);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Iced Latte")).toBeInTheDocument();
  });
});
