import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test-utils";
import { SignupForm } from "./SignupForm";

const mockSignup = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    signup: mockSignup,
  }),
}));

beforeEach(() => {
  mockSignup.mockReset();
  mockNavigate.mockReset();
});

describe("SignupForm", () => {
  it("renders email, password, username fields and submit button", () => {
    renderWithProviders(<SignupForm />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("ユーザー名")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アカウント作成" })).toBeInTheDocument();
  });

  it("calls signup and navigates to /confirm on success", async () => {
    mockSignup.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "P@ssw0rd123");
    await user.type(screen.getByLabelText("ユーザー名"), "DJName");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(mockSignup).toHaveBeenCalledWith("dj@example.com", "P@ssw0rd123", "DJName");
    expect(mockNavigate).toHaveBeenCalledWith("/confirm", {
      state: { email: "dj@example.com", fromSignup: true },
    });
  });

  it("displays error message when signup fails", async () => {
    mockSignup.mockRejectedValue(new Error("User already exists"));
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "P@ssw0rd123");
    await user.type(screen.getByLabelText("ユーザー名"), "DJName");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent("User already exists");
  });

  it("shows validation error when password lacks uppercase", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password1");
    await user.type(screen.getByLabelText("ユーザー名"), "DJName");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(mockSignup).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows validation error when password lacks number", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "Password");
    await user.type(screen.getByLabelText("ユーザー名"), "DJName");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(mockSignup).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows validation error when password is too short", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "short");
    await user.type(screen.getByLabelText("ユーザー名"), "DJName");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(mockSignup).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
