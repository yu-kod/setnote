import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test-utils";
import { ConfirmForm } from "./ConfirmForm";

const mockConfirmEmail = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { email: "dj@example.com" } }),
  };
});

vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    confirmEmail: mockConfirmEmail,
  }),
}));

beforeEach(() => {
  mockConfirmEmail.mockReset();
  mockNavigate.mockReset();
});

describe("ConfirmForm", () => {
  it("renders code input and submit button", () => {
    renderWithProviders(<ConfirmForm />);
    expect(screen.getByLabelText("確認コード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確認する" })).toBeInTheDocument();
  });

  it("calls confirmEmail and navigates to /login on success", async () => {
    mockConfirmEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.type(screen.getByLabelText("確認コード"), "123456");
    await user.click(screen.getByRole("button", { name: "確認する" }));

    expect(mockConfirmEmail).toHaveBeenCalledWith("dj@example.com", "123456");
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("displays error message on invalid code", async () => {
    mockConfirmEmail.mockRejectedValue(new Error("Invalid confirmation code"));
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.type(screen.getByLabelText("確認コード"), "000000");
    await user.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid confirmation code");
  });
});
