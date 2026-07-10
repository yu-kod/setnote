import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { requestLogger } from "./logger";

describe("requestLogger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("logs method, path, status and duration for a matched request", async () => {
    const app = new Hono();
    app.use("*", requestLogger);
    app.get("/ping", (c) => c.text("pong"));

    await app.request("/ping");

    expect(infoSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      level: "info",
      method: "GET",
      path: "/ping",
      status: 200,
    });
    expect(typeof logged.durationMs).toBe("number");
    expect(logged.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("logs 404 for unmatched routes", async () => {
    const app = new Hono();
    app.use("*", requestLogger);

    await app.request("/does-not-exist");

    expect(infoSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(infoSpy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      method: "GET",
      path: "/does-not-exist",
      status: 404,
    });
  });
});
