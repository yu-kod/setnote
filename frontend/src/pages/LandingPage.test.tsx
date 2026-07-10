import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";

const mockUseAuth = vi.fn();

vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("shows a service introduction", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    renderLanding();
    expect(screen.getByRole("heading", { name: /セットリスト/ })).toBeInTheDocument();
  });

  it("shows login and signup CTAs when not authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    renderLanding();
    expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByRole("link", { name: "ダッシュボードへ" })).not.toBeInTheDocument();
  });

  it("shows a dashboard CTA when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    renderLanding();
    expect(screen.getByRole("link", { name: "ダッシュボードへ" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.queryByRole("link", { name: "ログイン" })).not.toBeInTheDocument();
  });
});
