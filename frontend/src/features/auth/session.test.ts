import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TOKEN_KEY, REFRESH_KEY, USER_KEY, clearSession, redirectToLogin } from "./session";

describe("clearSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes access token, refresh token and user from storage", () => {
    localStorage.setItem(TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_KEY, "refresh");
    localStorage.setItem(USER_KEY, JSON.stringify({ email: "dj@example.com" }));

    clearSession();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});

describe("redirectToLogin", () => {
  const original = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });

  it("navigates to /login", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign },
    });

    redirectToLogin();

    expect(assign).toHaveBeenCalledWith("/login");
  });
});
