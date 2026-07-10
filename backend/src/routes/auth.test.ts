import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: vi.fn(),
    }),
  },
}));

const mockCognitoSend = vi.fn();
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: class {
    send = mockCognitoSend;
  },
  SignUpCommand: class {
    constructor(public input: unknown) {}
  },
  ConfirmSignUpCommand: class {
    constructor(public input: unknown) {}
  },
  InitiateAuthCommand: class {
    constructor(public input: unknown) {}
  },
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCognitoSend.mockReset();
  });

  it("signs up a user and returns 201", async () => {
    mockCognitoSend.mockResolvedValue({
      UserSub: "cognito-uuid-123",
      UserConfirmed: false,
    });

    const { app } = await import("../app");
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "P@ssw0rd123",
        username: "DJ_Test",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.userSub).toBe("cognito-uuid-123");
    expect(body.userConfirmed).toBe(false);
  });

  it("returns 400 when email is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "P@ssw0rd123", username: "DJ_Test" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dj@example.com", username: "DJ_Test" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when username is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "P@ssw0rd123",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 409 when user already exists", async () => {
    const error = new Error("User already exists");
    error.name = "UsernameExistsException";
    mockCognitoSend.mockRejectedValue(error);

    const { app } = await import("../app");
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "P@ssw0rd123",
        username: "DJ_Test",
      }),
    });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/confirm", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCognitoSend.mockReset();
  });

  it("confirms signup and returns 200", async () => {
    mockCognitoSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        code: "123456",
      }),
    });

    expect(res.status).toBe(200);
  });

  it("returns 400 when code is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dj@example.com" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when code is wrong", async () => {
    const error = new Error("Invalid code");
    error.name = "CodeMismatchException";
    mockCognitoSend.mockRejectedValue(error);

    const { app } = await import("../app");
    const res = await app.request("/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        code: "000000",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCognitoSend.mockReset();
  });

  it("signs in and returns tokens", async () => {
    mockCognitoSend.mockResolvedValue({
      AuthenticationResult: {
        IdToken: "id-token-xxx",
        AccessToken: "access-token-xxx",
        RefreshToken: "refresh-token-xxx",
      },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "P@ssw0rd123",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.idToken).toBe("id-token-xxx");
    expect(body.accessToken).toBe("access-token-xxx");
    expect(body.refreshToken).toBe("refresh-token-xxx");
  });

  it("returns 400 when email is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "P@ssw0rd123" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 401 when credentials are wrong", async () => {
    const error = new Error("Incorrect username or password");
    error.name = "NotAuthorizedException";
    mockCognitoSend.mockRejectedValue(error);

    const { app } = await import("../app");
    const res = await app.request("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "wrong",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not confirmed", async () => {
    const error = new Error("User is not confirmed");
    error.name = "UserNotConfirmedException";
    mockCognitoSend.mockRejectedValue(error);

    const { app } = await import("../app");
    const res = await app.request("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dj@example.com",
        password: "P@ssw0rd123",
      }),
    });

    expect(res.status).toBe(403);
  });
});
