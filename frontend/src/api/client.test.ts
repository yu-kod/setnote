import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function okResponse(data: unknown, status = 200) {
  return { ok: true, status, statusText: "OK", json: () => Promise.resolve(data) };
}

describe("api.get", () => {
  it("sends GET request with credentials and Content-Type header", async () => {
    mockFetch.mockResolvedValue(okResponse({ items: [] }));

    const result = await api.get("/setlists");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists", {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    expect(result).toEqual({ items: [] });
  });
});

describe("api.post", () => {
  it("sends POST request with JSON body", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "123" }, 201));

    const result = await api.post("/setlists", { name: "My Set" });

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists", {
      method: "POST",
      body: JSON.stringify({ name: "My Set" }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    expect(result).toEqual({ id: "123" });
  });
});

describe("api.put", () => {
  it("sends PUT request with JSON body", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "123", name: "Updated" }));

    const result = await api.put("/setlists/123", { name: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/123", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    expect(result).toEqual({ id: "123", name: "Updated" });
  });
});

describe("api.delete", () => {
  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValue(okResponse(null));

    await api.delete("/setlists/123");

    expect(mockFetch).toHaveBeenCalledWith("/api/setlists/123", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  });
});

describe("error handling", () => {
  it("throws Error with status code and text on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve(null),
    });

    await expect(api.get("/missing")).rejects.toThrow("404 Not Found");
  });
});
