import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTrackUsage, fetchViews } from "./api";
import { clearSession, redirectToLogin } from "../auth/session";

vi.mock("../auth/session", () => ({
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

describe("fetchTrackUsage", () => {
  it("calls GET /api/analytics/track-usage with auth header and returns the data", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ title: "Song A", artist: "DJ X", count: 3 }]),
    });

    const result = await fetchTrackUsage();

    expect(mockFetch).toHaveBeenCalledWith("/api/analytics/track-usage", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual([{ title: "Song A", artist: "DJ X", count: 3 }]);
  });

  it("clears the session and redirects on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });

    await expect(fetchTrackUsage()).rejects.toThrow();
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("throws without clearing the session on a non-401 error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });

    await expect(fetchTrackUsage()).rejects.toThrow();
    expect(clearSession).not.toHaveBeenCalled();
  });
});

describe("fetchViews", () => {
  it("calls GET /api/analytics/views with auth header and returns the data", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: "s1", name: "Set A", viewCount: 5 }]),
    });

    const result = await fetchViews();

    expect(mockFetch).toHaveBeenCalledWith("/api/analytics/views", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual([{ id: "s1", name: "Set A", viewCount: 5 }]);
  });

  it("clears the session and redirects on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });

    await expect(fetchViews()).rejects.toThrow();
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });
});
