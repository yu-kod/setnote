import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import App from "./App";

const mockUseAuth = vi.fn();

vi.mock("./features/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

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

  it("renders login page at /login", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn() });
    renderApp("/login");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("redirects /dashboard to /login when not authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    renderApp("/dashboard");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders dashboard placeholder when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    renderApp("/dashboard");
    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
  });
});
