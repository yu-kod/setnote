import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mockVerify = vi.fn();
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: mockVerify }),
  },
}));

async function buildApp() {
  const { authMiddleware } = await import("./auth");
  const { adminMiddleware } = await import("./admin");
  const app = new Hono();
  app.use("/*", authMiddleware, adminMiddleware);
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

describe("admin middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerify.mockReset();
  });

  it("lets a user in the admin group through", async () => {
    mockVerify.mockResolvedValue({ sub: "user-1", "cognito:groups": ["admin"] });
    const app = await buildApp();

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 403 when the user belongs to no group", async () => {
    mockVerify.mockResolvedValue({ sub: "user-2" });
    const app = await buildApp();

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 403 when the user belongs to other groups only", async () => {
    mockVerify.mockResolvedValue({ sub: "user-3", "cognito:groups": ["beta-testers"] });
    const app = await buildApp();

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(403);
  });

  it("returns 401 before the group check when the token is missing", async () => {
    const app = await buildApp();

    const res = await app.request("/test");

    expect(res.status).toBe(401);
  });
});
