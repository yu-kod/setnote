import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockSend }) },
  GetCommand: class {
    constructor(public input: unknown) {}
  },
  PutCommand: class {
    constructor(public input: unknown) {}
  },
  UpdateCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteCommand: class {
    constructor(public input: unknown) {}
  },
  QueryCommand: class {
    constructor(public input: unknown) {}
  },
}));

const mockVerify = vi.fn();
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: mockVerify }),
  },
}));

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: class {
    send = vi.fn();
  },
  SignUpCommand: class {},
  ConfirmSignUpCommand: class {},
  InitiateAuthCommand: class {},
}));

function authHeaders(token = "valid-token") {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

describe("GET /api/analytics/track-usage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("returns 401 without a valid token", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/analytics/track-usage");

    expect(res.status).toBe(401);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("aggregates the user's own track usage across setlists", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "u@example.com" });
    mockSend.mockResolvedValue({
      Items: [
        { id: "s1", userId: "user1", tracks: [{ title: "Song A", artist: "DJ X" }] },
        { id: "s2", userId: "user1", tracks: [{ title: "Song A" }, { title: "Song B" }] },
      ],
    });

    const { app } = await import("../app");
    const res = await app.request("/api/analytics/track-usage", { headers: authHeaders() });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { title: "Song A", artist: "DJ X", count: 2 },
      { title: "Song B", artist: "", count: 1 },
    ]);
  });

  it("queries only the authenticated user's setlists via the userId index", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "u@example.com" });
    mockSend.mockResolvedValue({ Items: [] });

    const { app } = await import("../app");
    await app.request("/api/analytics/track-usage", { headers: authHeaders() });

    const command = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      IndexName: "gsi-userId",
      ExpressionAttributeValues: { ":uid": "user1" },
    });
  });

  it("returns an empty array when the user has no setlists", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "u@example.com" });
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/analytics/track-usage", { headers: authHeaders() });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
