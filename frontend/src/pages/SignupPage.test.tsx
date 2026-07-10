import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import SignupPage from "./SignupPage";

vi.mock("../features/auth/components/SignupForm", () => ({
  SignupForm: () => <div data-testid="signup-form">SignupForm</div>,
}));

describe("SignupPage", () => {
  it("renders heading, SignupForm, and login link", () => {
    renderWithProviders(<SignupPage />);

    expect(screen.getByRole("heading", { name: "アカウント作成" })).toBeInTheDocument();
    expect(screen.getByTestId("signup-form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute("href", "/login");
  });
});
