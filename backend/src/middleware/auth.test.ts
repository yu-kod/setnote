import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mockVerify = vi.fn();
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: mockVerify,
    }),
  },
}));

describe("auth middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerify.mockReset();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { authMiddleware } = await import("./auth");
    const app = new Hono();
    app.use("/*", authMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("passes through and sets userId when token is valid", async () => {
    mockVerify.mockResolvedValue({
      sub: "user-123",
      email: "test@example.com",
      token_use: "access",
    });

    const { authMiddleware } = await import("./auth");
    const app = new Hono();
    app.use("/*", authMiddleware);
    app.get("/test", (c) => {
      const ctx = c as unknown as { get(k: string): string };
      return c.json({ userId: ctx.get("userId") });
    });

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user-123" });
    expect(mockVerify).toHaveBeenCalledWith("valid-token");
  });

  it("returns 401 when token is invalid", async () => {
    mockVerify.mockRejectedValue(new Error("Token expired"));

    const { authMiddleware } = await import("./auth");
    const app = new Hono();
    app.use("/*", authMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer bad-token" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("sets email to empty string when token payload has no email", async () => {
    mockVerify.mockResolvedValue({
      sub: "user-456",
      token_use: "access",
    });

    const { authMiddleware } = await import("./auth");
    const app = new Hono();
    app.use("/*", authMiddleware);
    app.get("/test", (c) => {
      const ctx = c as unknown as { get(k: string): string };
      return c.json({ userId: ctx.get("userId"), email: ctx.get("email") });
    });

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; email: string };
    expect(body.userId).toBe("user-456");
    expect(body.email).toBe("");
  });

  it("returns 401 when Authorization header has wrong scheme", async () => {
    const { authMiddleware } = await import("./auth");
    const app = new Hono();
    app.use("/*", authMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res.status).toBe(401);
  });
});
