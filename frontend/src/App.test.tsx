import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "./test-utils";
import App from "./App";

describe("App", () => {
  it("renders the site title", () => {
    renderWithProviders(<App />);
    expect(screen.getByRole("heading", { name: "setnote" })).toBeInTheDocument();
  });

  it("renders the footer with terms and privacy links", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("利用規約")).toBeInTheDocument();
    expect(screen.getByText("プライバシーポリシー")).toBeInTheDocument();
  });
});
