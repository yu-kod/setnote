import { describe, it, expect, vi, beforeEach } from "vitest";
import { signup, confirmEmail, signin, resendCode } from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("signup", () => {
  it("calls POST /api/auth/signup with email, password, username", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ message: "User created" }),
    });

    await signup("dj@example.com", "password123", "DJName");

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "password123",
        username: "DJName",
      }),
    });
  });

  it("throws AuthError with code CONFLICT when user already exists", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: { code: "USER_EXISTS", message: "User already exists" },
        }),
    });

    await expect(signup("dj@example.com", "password123", "DJName")).rejects.toThrow(
      "User already exists"
    );
  });
});

describe("confirmEmail", () => {
  it("calls POST /api/auth/confirm with email and code", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: "Email confirmed" }),
    });

    await confirmEmail("dj@example.com", "123456");

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dj@example.com", code: "123456" }),
    });
  });

  it("throws AuthError on invalid code", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: { code: "INVALID_CODE", message: "Invalid confirmation code" },
        }),
    });

    await expect(confirmEmail("dj@example.com", "000000")).rejects.toThrow(
      "Invalid confirmation code"
    );
  });
});

describe("signin", () => {
  it("calls POST /api/auth/signin and returns tokens", async () => {
    const tokens = {
      accessToken: "access-xxx",
      idToken: "id-xxx",
      refreshToken: "refresh-xxx",
    };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(tokens),
    });

    const result = await signin("dj@example.com", "password123");

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dj@example.com", password: "password123" }),
    });
    expect(result).toEqual(tokens);
  });

  it("throws AuthError on wrong credentials", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: { code: "INVALID_CREDENTIALS", message: "Wrong password" },
        }),
    });

    await expect(signin("dj@example.com", "wrong")).rejects.toThrow("Wrong password");
  });

  it("throws AuthError when user is not confirmed", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: { code: "USER_NOT_CONFIRMED", message: "User is not confirmed" },
        }),
    });

    await expect(signin("dj@example.com", "password123")).rejects.toThrow("User is not confirmed");
  });
});

describe("resendCode", () => {
  it("calls POST /api/auth/resend-code with email", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: "Code resent" }),
    });

    await resendCode("dj@example.com");

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dj@example.com" }),
    });
  });
});

describe("authRequest error defaults", () => {
  it("uses fallback message and code when error object has neither", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: {} }),
    });

    await expect(signup("dj@example.com", "password123", "DJName")).rejects.toMatchObject({
      message: "Unknown error",
      code: "UNKNOWN",
    });
  });
});

describe("authRequest error handling", () => {
  it("throws AuthError with status text when response is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(signup("dj@example.com", "password123", "DJName")).rejects.toThrow(
      "Internal Server Error"
    );
  });

  it("throws AuthError with fallback message when response is not JSON and no statusText", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "",
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(signup("dj@example.com", "password123", "DJName")).rejects.toThrow(
      "サーバーエラーが発生しました"
    );
  });
});
