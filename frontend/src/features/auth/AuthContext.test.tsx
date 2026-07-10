import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import type { ReactNode } from "react";

vi.mock("./api", () => ({
  signup: vi.fn(),
  confirmEmail: vi.fn(),
  signin: vi.fn(),
  resendCode: vi.fn(),
}));

import {
  signup as mockSignup,
  confirmEmail as mockConfirm,
  signin as mockSignin,
  resendCode as mockResendCode,
} from "./api";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  vi.mocked(mockSignup).mockReset();
  vi.mocked(mockConfirm).mockReset();
  vi.mocked(mockSignin).mockReset();
  vi.mocked(mockResendCode).mockReset();
  localStorage.clear();
});

describe("useAuth", () => {
  it("starts as unauthenticated when no token in localStorage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("restores auth state from localStorage on mount", () => {
    localStorage.setItem("setnote_access_token", "stored-token");
    localStorage.setItem("setnote_user", JSON.stringify({ email: "dj@example.com" }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ email: "dj@example.com" });
  });

  it("login stores tokens and sets authenticated state", async () => {
    vi.mocked(mockSignin).mockResolvedValue({
      accessToken: "access-123",
      idToken: "id-123",
      refreshToken: "refresh-123",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("dj@example.com", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem("setnote_access_token")).toBe("access-123");
    expect(localStorage.getItem("setnote_refresh_token")).toBe("refresh-123");
  });

  it("logout clears tokens and sets unauthenticated state", async () => {
    localStorage.setItem("setnote_access_token", "stored-token");
    localStorage.setItem("setnote_refresh_token", "stored-refresh");
    localStorage.setItem("setnote_user", JSON.stringify({ email: "dj@example.com" }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("setnote_access_token")).toBeNull();
    expect(localStorage.getItem("setnote_refresh_token")).toBeNull();
    expect(localStorage.getItem("setnote_user")).toBeNull();
  });

  it("signup delegates to api.signup", async () => {
    vi.mocked(mockSignup).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signup("dj@example.com", "password123", "DJName");
    });

    expect(mockSignup).toHaveBeenCalledWith("dj@example.com", "password123", "DJName");
  });

  it("confirmEmail delegates to api.confirmEmail", async () => {
    vi.mocked(mockConfirm).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.confirmEmail("dj@example.com", "123456");
    });

    expect(mockConfirm).toHaveBeenCalledWith("dj@example.com", "123456");
  });

  it("getAccessToken returns the stored token", () => {
    localStorage.setItem("setnote_access_token", "my-token");

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.getAccessToken()).toBe("my-token");
  });

  it("returns null user when localStorage has invalid JSON for user", () => {
    localStorage.setItem("setnote_access_token", "stored-token");
    localStorage.setItem("setnote_user", "invalid-json{{{");

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("resendCode delegates to api.resendCode", async () => {
    vi.mocked(mockResendCode).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.resendCode("dj@example.com");
    });

    expect(mockResendCode).toHaveBeenCalledWith("dj@example.com");
  });

  it("throws error when used outside AuthProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    let caughtError: Error | undefined;
    try {
      renderHook(() => useAuth());
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError?.message).toBe("useAuth must be used within AuthProvider");
  });
});
