import { render, screen } from "@testing-library/react";
import App from "../src/App.js";

describe("App shell", () => {
  it("renders the product name", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /KMUTT Café Pre-Order/i })).toBeInTheDocument();
  });
});
