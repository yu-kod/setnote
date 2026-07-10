import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { errorHandler } from "./error";

describe("errorHandler", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns unified 500 error response when a handler throws", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/boom", () => {
      throw new Error("kaboom");
    });

    const res = await app.request("/boom");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });

  it("logs the error with method, path and message", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/boom", () => {
      throw new Error("kaboom");
    });

    await app.request("/boom");

    expect(errorSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      level: "error",
      method: "GET",
      path: "/boom",
      message: "kaboom",
    });
  });
});
