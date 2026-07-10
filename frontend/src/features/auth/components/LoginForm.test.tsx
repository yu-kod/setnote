import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test-utils";
import { LoginForm } from "./LoginForm";
import { AuthError } from "../api";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

vi.mock("../AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

beforeEach(() => {
  mockLogin.mockReset();
  mockNavigate.mockReset();
});

describe("LoginForm", () => {
  it("renders email, password fields and submit button", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("calls login and navigates to /dashboard on success", async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(mockLogin).toHaveBeenCalledWith("dj@example.com", "password123");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("displays error message on wrong credentials", async () => {
    mockLogin.mockRejectedValue(new Error("Wrong password"));
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrong");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Wrong password");
  });

  it("redirects unconfirmed user to confirm page with email", async () => {
    mockLogin.mockRejectedValue(
      new AuthError("Please verify your email first", "USER_NOT_CONFIRMED", 403)
    );
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(mockNavigate).toHaveBeenCalledWith("/confirm", {
      state: { email: "dj@example.com" },
    });
  });

  it("does not show error when redirecting unconfirmed user", async () => {
    mockLogin.mockRejectedValue(
      new AuthError("Please verify your email first", "USER_NOT_CONFIRMED", 403)
    );
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "dj@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
