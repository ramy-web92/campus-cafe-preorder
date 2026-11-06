// Login / logout shell (F-01). The API module is mocked.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.js";
import * as api from "../src/api.js";

vi.mock("../src/api.js", async (orig) => {
  const actual = await orig<typeof import("../src/api.js")>();
  return { ...actual, authApi: { login: vi.fn(), me: vi.fn(), logout: vi.fn() }, menuApi: { get: vi.fn().mockResolvedValue([]) } };
});

const alice = { id: 1, name: "Alice Customer", email: "alice@cafe.test", role: "CUSTOMER" as const };
const olivia = { id: 4, name: "Olivia Operator", email: "olivia@cafe.test", role: "OPERATOR" as const };

beforeEach(() => {
  vi.mocked(api.authApi.me).mockReset();
  vi.mocked(api.authApi.login).mockReset();
  vi.mocked(api.authApi.logout).mockReset().mockResolvedValue(undefined);
});

describe("App shell and login", () => {
  it("shows the login page when there is no session", async () => {
    vi.mocked(api.authApi.me).mockRejectedValueOnce({ status: 401 });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /KMUTT Café Pre-Order/i })).toBeInTheDocument();
  });

  it("shows a generic error on invalid credentials and keeps the e-mail", async () => {
    const user = userEvent.setup();
    vi.mocked(api.authApi.me).mockRejectedValueOnce({ status: 401 });
    vi.mocked(api.authApi.login).mockRejectedValueOnce({ status: 401, code: "INVALID_CREDENTIALS", message: "Invalid email or password." });
    render(<App />);
    await user.type(await screen.findByLabelText("Email"), "alice@cafe.test");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(screen.getByLabelText("Email")).toHaveValue("alice@cafe.test");
  });

  it("logs a Customer in to the menu and logs out back to the login page", async () => {
    const user = userEvent.setup();
    vi.mocked(api.authApi.me).mockRejectedValueOnce({ status: 401 });
    vi.mocked(api.authApi.login).mockResolvedValueOnce(alice);
    render(<App />);
    await user.type(await screen.findByLabelText("Email"), alice.email);
    await user.type(screen.getByLabelText("Password"), "Cafe1234!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Menu" })).toBeInTheDocument(); // Menu screen (F-03)
    expect(screen.getByText("Customer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(api.authApi.logout).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("restores an existing Operator session to the order queue", async () => {
    vi.mocked(api.authApi.me).mockResolvedValueOnce(olivia);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Order queue" })).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
  });
});
