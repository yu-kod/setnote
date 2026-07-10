import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import LoginPage from "./LoginPage";

vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  it("renders heading and link to signup", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "アカウント作成" })).toHaveAttribute("href", "/signup");
  });
});
