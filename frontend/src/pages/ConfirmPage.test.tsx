import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import ConfirmPage from "./ConfirmPage";

vi.mock("../features/auth/components/ConfirmForm", () => ({
  ConfirmForm: () => <div data-testid="confirm-form">ConfirmForm</div>,
}));

describe("ConfirmPage", () => {
  it("renders heading and ConfirmForm", () => {
    renderWithProviders(<ConfirmPage />);

    expect(screen.getByRole("heading", { name: "メールアドレスの確認" })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-form")).toBeInTheDocument();
  });
});
