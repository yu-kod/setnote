import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test-utils";
import { ConfirmForm } from "./ConfirmForm";

const mockConfirmEmail = vi.fn();
const mockResendCode = vi.fn();
const mockNavigate = vi.fn();
let mockLocationState: unknown = { email: "dj@example.com" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    confirmEmail: mockConfirmEmail,
    resendCode: mockResendCode,
  }),
}));

beforeEach(() => {
  mockConfirmEmail.mockReset();
  mockResendCode.mockReset();
  mockNavigate.mockReset();
  mockLocationState = { email: "dj@example.com" };
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

  it("shows success message when arriving from signup", () => {
    mockLocationState = { email: "dj@example.com", fromSignup: true };
    renderWithProviders(<ConfirmForm />);

    expect(screen.getByRole("status")).toHaveTextContent("アカウントを作成しました");
  });

  it("does not show success message when not from signup", () => {
    mockLocationState = { email: "dj@example.com" };
    renderWithProviders(<ConfirmForm />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows email input when no email in location state", () => {
    mockLocationState = null;
    renderWithProviders(<ConfirmForm />);

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
  });

  it("does not show email input when email is in location state", () => {
    renderWithProviders(<ConfirmForm />);

    expect(screen.queryByLabelText("メールアドレス")).not.toBeInTheDocument();
  });

  it("uses manually entered email for confirmation", async () => {
    mockLocationState = null;
    mockConfirmEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "manual@example.com");
    await user.type(screen.getByLabelText("確認コード"), "123456");
    await user.click(screen.getByRole("button", { name: "確認する" }));

    expect(mockConfirmEmail).toHaveBeenCalledWith("manual@example.com", "123456");
  });

  it("resends confirmation code when resend button is clicked", async () => {
    mockResendCode.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.click(screen.getByRole("button", { name: "確認コードを再送信" }));

    expect(mockResendCode).toHaveBeenCalledWith("dj@example.com");
  });

  it("shows resend success message", async () => {
    mockResendCode.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.click(screen.getByRole("button", { name: "確認コードを再送信" }));

    expect(screen.getByRole("status")).toHaveTextContent("確認コードを再送信しました");
  });

  it("shows error when resend fails", async () => {
    mockResendCode.mockRejectedValue(new Error("Too many attempts"));
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.click(screen.getByRole("button", { name: "確認コードを再送信" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Too many attempts");
  });

  it("shows fallback error when confirmEmail rejects with non-Error", async () => {
    mockConfirmEmail.mockRejectedValue("string rejection");
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.type(screen.getByLabelText("確認コード"), "123456");
    await user.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByRole("alert")).toHaveTextContent("エラーが発生しました");
  });

  it("shows fallback error when resendCode rejects with non-Error", async () => {
    mockResendCode.mockRejectedValue("string rejection");
    const user = userEvent.setup();

    renderWithProviders(<ConfirmForm />);

    await user.click(screen.getByRole("button", { name: "確認コードを再送信" }));

    expect(screen.getByRole("alert")).toHaveTextContent("再送信に失敗しました");
  });
});
