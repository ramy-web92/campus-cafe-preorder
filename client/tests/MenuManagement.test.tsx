// UI-S05, UI-S06 — docs/sprints/sprint-2/sts.md (F-09 menu management). The API module is mocked.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MenuManagement from "../src/MenuManagement.js";
import * as api from "../src/api.js";

vi.mock("../src/api.js", async (orig) => {
  const actual = await orig<typeof import("../src/api.js")>();
  return { ...actual, menuApi: { get: vi.fn() }, menuAdminApi: { create: vi.fn(), update: vi.fn() } };
});

const croissant = { id: 9, name: "Croissant", description: "Butter", priceSatang: 4500, isAvailable: true };
const menu = (items = [croissant]) => [{ id: 3, name: "Bakery", items }];

beforeEach(() => {
  vi.mocked(api.menuApi.get).mockReset();
  vi.mocked(api.menuAdminApi.create).mockReset();
  vi.mocked(api.menuAdminApi.update).mockReset();
});

describe("Menu management (Operator)", () => {
  it("UI-S05 validates the price before saving a new item, then sends satang (AC-70, AC-72)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.menuApi.get).mockResolvedValue(menu());
    vi.mocked(api.menuAdminApi.create).mockResolvedValueOnce({ id: 30, categoryId: 3, name: "Banana Bread", description: "", priceSatang: 5500, isAvailable: true });
    render(<MenuManagement />);
    await user.click(await screen.findByRole("button", { name: "Add item" }));
    await user.type(screen.getByLabelText("Name"), "Banana Bread");
    await user.type(screen.getByLabelText("Price (THB)"), "0");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Price must be greater than 0 and at most 1,000.00 THB.")).toBeInTheDocument();
    expect(api.menuAdminApi.create).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Price (THB)"));
    await user.type(screen.getByLabelText("Price (THB)"), "55");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(api.menuAdminApi.create).toHaveBeenCalledWith({ categoryId: 3, name: "Banana Bread", description: "", priceSatang: 5500, isAvailable: true });
    expect(await screen.findByText("Saved Banana Bread.")).toBeInTheDocument();
  });

  it("UI-S06 marks an item sold out in one click (AC-73)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.menuApi.get).mockResolvedValueOnce(menu()).mockResolvedValueOnce(menu([{ ...croissant, isAvailable: false }]));
    vi.mocked(api.menuAdminApi.update).mockResolvedValueOnce({ ...croissant, categoryId: 3, isAvailable: false });
    render(<MenuManagement />);
    await user.click(await screen.findByRole("button", { name: "Mark sold out Croissant" }));
    expect(api.menuAdminApi.update).toHaveBeenCalledWith(9, { isAvailable: false });
    expect(await screen.findByRole("button", { name: "Mark available Croissant" })).toBeInTheDocument();
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });
});
