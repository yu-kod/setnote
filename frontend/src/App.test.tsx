import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import App from "./App";

const mockUseAuth = vi.fn();
const mockLogout = vi.fn();

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
  beforeEach(() => {
    mockLogout.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn(), logout: mockLogout });
  });

  it("renders the site title", () => {
    renderWithProviders(<App />);
    expect(screen.getByRole("heading", { name: "setnote" })).toBeInTheDocument();
  });

  it("renders the footer with terms and privacy links", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("利用規約")).toBeInTheDocument();
    expect(screen.getByText("プライバシーポリシー")).toBeInTheDocument();
  });

  it("renders the landing page at /", () => {
    renderApp("/");
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "新規登録" })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders the not-found page for an unknown route", () => {
    renderApp("/no/such/path");
    expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
  });

  it("renders the terms page at /terms", () => {
    renderApp("/terms");
    expect(screen.getByRole("heading", { name: "利用規約" })).toBeInTheDocument();
  });

  it("renders the privacy policy page at /privacy", () => {
    renderApp("/privacy");
    expect(screen.getByRole("heading", { name: "プライバシーポリシー" })).toBeInTheDocument();
  });

  it("renders login page at /login", () => {
    renderApp("/login");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("redirects /dashboard to /login when not authenticated", () => {
    renderApp("/dashboard");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders dashboard when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/dashboard");
    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
  });

  it("shows the logout button and dashboard link in the header when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/dashboard");
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
    expect(within(banner).getByRole("link", { name: "ダッシュボード" })).toBeInTheDocument();
  });

  it("calls logout when the logout button is clicked", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    const user = userEvent.setup();
    renderApp("/dashboard");
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", { name: "ログアウト" })
    );
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("shows a login link in the header when not authenticated", () => {
    renderApp("/login");
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "ログイン" })
    ).toBeInTheDocument();
  });
});
