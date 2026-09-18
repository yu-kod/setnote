import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizedGet, ApiError } from "./authorized";
import { clearSession, redirectToLogin } from "../features/auth/session";

vi.mock("../features/auth/session", () => ({
  TOKEN_KEY: "setnote_access_token",
  clearSession: vi.fn(),
  redirectToLogin: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  vi.mocked(clearSession).mockClear();
  vi.mocked(redirectToLogin).mockClear();
});

describe("authorizedGet", () => {
  it("sends the stored access token and returns the parsed body", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ a: 1 }) });

    const result = await authorizedGet<{ a: number }>("/api/thing", "失敗");

    expect(mockFetch).toHaveBeenCalledWith("/api/thing", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual({ a: 1 });
  });

  it("sends an empty bearer token when nothing is stored", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(null) });

    await authorizedGet("/api/thing", "失敗");

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer ");
  });

  it("clears the session and redirects to login on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(authorizedGet("/api/thing", "失敗")).rejects.toThrow("失敗");
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("throws an ApiError carrying the status without clearing the session", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(authorizedGet("/api/thing", "失敗")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "失敗",
    });
    expect(clearSession).not.toHaveBeenCalled();
  });

  it("exposes ApiError for callers that branch on the status", () => {
    const err = new ApiError(500, "boom");

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(500);
  });
});
