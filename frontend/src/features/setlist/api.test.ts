import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMySetlists,
  createSetlist,
  fetchSetlist,
  updateSetlist,
  publishSetlist,
  unpublishSetlist,
  fetchPublicSetlist,
} from "./api";
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

describe("fetchMySetlists", () => {
  it("calls GET /api/setlists/mine with auth header from localStorage", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: "1", name: "Set 1" }]),
    });

    const result = await fetchMySetlists();

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/mine", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual([{ id: "1", name: "Set 1" }]);
  });

  it("uses empty string for Authorization when no token in localStorage", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await fetchMySetlists();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/setlists/mine",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer " }),
      })
    );
  });
});

describe("fetchSetlist", () => {
  it("returns the setlist matching the id from the user's setlists", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          { id: "a1", name: "Set A" },
          { id: "b2", name: "Set B" },
        ]),
    });

    const result = await fetchSetlist("b2");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/mine", expect.anything());
    expect(result).toEqual({ id: "b2", name: "Set B" });
  });

  it("returns null when no setlist matches the id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: "a1", name: "Set A" }]),
    });

    const result = await fetchSetlist("missing");

    expect(result).toBeNull();
  });
});

describe("updateSetlist", () => {
  it("calls PUT /api/setlists/:id with the update payload", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "a1", name: "Updated" }),
    });

    const input = {
      name: "Updated",
      artistName: "DJ Cool",
      eventName: "Fes",
      eventLink: null,
      eventDate: "2026-08-01",
      tracks: [],
    };
    const result = await updateSetlist("a1", input);

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/a1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify(input),
    });
    expect(result).toEqual({ id: "a1", name: "Updated" });
  });
});

describe("fetchPublicSetlist", () => {
  it("fetches GET /api/setlists/:id without an auth header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "pub1", name: "Public Set" }),
    });

    const result = await fetchPublicSetlist("pub1");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/pub1");
    expect(result).toEqual({ id: "pub1", name: "Public Set" });
  });

  it("throws when the response is not ok (404)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });

    await expect(fetchPublicSetlist("missing")).rejects.toThrow();
  });
});

describe("publishSetlist", () => {
  it("calls POST /api/setlists/:id/publish", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "a1", status: "published" }),
    });

    const result = await publishSetlist("a1");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/a1/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual({ id: "a1", status: "published" });
  });
});

describe("unpublishSetlist", () => {
  it("calls DELETE /api/setlists/:id/publish", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "a1", status: "unpublished" }),
    });

    const result = await unpublishSetlist("a1");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/a1/publish", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(result).toEqual({ id: "a1", status: "unpublished" });
  });
});

describe("createSetlist", () => {
  it("calls POST /api/setlists (no trailing slash) with name in body", async () => {
    localStorage.setItem("setnote_access_token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "new1", name: "New Set" }),
    });

    const result = await createSetlist("New Set");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ name: "New Set" }),
    });
    expect(result).toEqual({ id: "new1", name: "New Set" });
  });
});

describe("204 response", () => {
  it("returns undefined for 204 status", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    const result = await fetchMySetlists();

    expect(result).toBeUndefined();
  });
});

describe("401 unauthorized (expired session)", () => {
  it("clears the session and redirects to login on 401", async () => {
    localStorage.setItem("setnote_access_token", "expired-token");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }),
    });

    await expect(fetchMySetlists()).rejects.toThrow();

    expect(clearSession).toHaveBeenCalledOnce();
    expect(redirectToLogin).toHaveBeenCalledOnce();
  });

  it("does not clear the session for non-401 errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: "Bad request" } }),
    });

    await expect(fetchMySetlists()).rejects.toThrow();

    expect(clearSession).not.toHaveBeenCalled();
    expect(redirectToLogin).not.toHaveBeenCalled();
  });
});

describe("error handling", () => {
  it("throws with error.message when error is an object with message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: "Bad request" } }),
    });

    await expect(fetchMySetlists()).rejects.toThrow("Bad request");
  });

  it("throws with fallback when error object has no message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { code: "SOME_ERROR" } }),
    });

    await expect(fetchMySetlists()).rejects.toThrow("エラーが発生しました");
  });

  it("throws with error string when error is a string", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Something went wrong" }),
    });

    await expect(fetchMySetlists()).rejects.toThrow("Something went wrong");
  });

  it("throws with fallback when response has no error field", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Internal error" }),
    });

    await expect(fetchMySetlists()).rejects.toThrow("エラーが発生しました");
  });

  it("throws with fallback when response body is not parseable JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(fetchMySetlists()).rejects.toThrow("エラーが発生しました");
  });
});
