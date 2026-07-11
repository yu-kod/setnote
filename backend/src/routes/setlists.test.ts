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

vi.mock("nanoid", () => ({
  nanoid: () => "test12345",
}));

const mockVerify = vi.fn();
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: mockVerify,
    }),
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

describe("GET /api/setlists/:id (public)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("returns published setlist snapshot", async () => {
    const snapshot = { id: "abc", name: "My Set", tracks: [] };
    mockSend.mockResolvedValue({
      Item: { id: "abc", status: "published", publishedSnapshot: snapshot },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(snapshot);
  });

  it("returns 404 when setlist not found", async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/not-exist");

    expect(res.status).toBe(404);
  });

  it("returns 404 when setlist is not published", async () => {
    mockSend.mockResolvedValue({
      Item: { id: "abc", status: "draft" },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc");

    expect(res.status).toBe(404);
  });
});

describe("POST /api/setlists (authenticated)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("creates a new setlist and returns 201", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Friday Night Set" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("test12345");
    expect(body.name).toBe("Friday Night Set");
    expect(body.userId).toBe("user1");
    expect(body.status).toBe("draft");
    expect(body.tracks).toEqual([]);
  });

  it("returns 400 when name is missing", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("returns 401 without Authorization header", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/setlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Set" }),
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/setlists/mine (authenticated)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("returns list of setlists for the authenticated user", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({
      Items: [
        { id: "a", name: "Set A", status: "draft", userId: "user1" },
        { id: "b", name: "Set B", status: "published", userId: "user1" },
      ],
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/mine", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Set A");
  });

  it("returns empty array when DynamoDB returns undefined Items", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/mine", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns empty array when user has no setlists", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({ Items: [] });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/mine", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 401 without Authorization header", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/setlists/mine");

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/setlists/:id (authenticated)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("updates a setlist and returns 200", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({
      Attributes: {
        id: "abc",
        name: "Updated Set",
        userId: "user1",
        status: "draft",
        tracks: [{ trackName: "Song 1" }],
      },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        name: "Updated Set",
        tracks: [{ trackName: "Song 1" }],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe("Updated Set");
  });

  it("returns 404 when setlist does not exist or userId mismatch", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Updated" }),
    });

    expect(res.status).toBe(404);
  });

  it("re-throws non-ConditionalCheckFailedException errors", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    const err = new Error("DynamoDB timeout");
    err.name = "ProvisionedThroughputExceededException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Updated" }),
    });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/setlists/:id (authenticated)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("deletes a setlist and returns 204", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(204);
  });

  it("returns 404 when setlist does not exist or userId mismatch", async () => {
    mockVerify.mockResolvedValue({
      sub: "wrong-user",
      email: "dj@example.com",
    });
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(404);
  });

  it("re-throws non-ConditionalCheckFailedException errors", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    const err = new Error("DynamoDB timeout");
    err.name = "ProvisionedThroughputExceededException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/setlists/:id/publish (authenticated)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("publishes a draft setlist and returns 200", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    const setlist = {
      id: "abc",
      userId: "user1",
      name: "My Set",
      status: "draft",
      tracks: [{ trackName: "Song 1" }],
    };
    mockSend.mockResolvedValueOnce({ Item: setlist }).mockResolvedValueOnce({
      Attributes: { ...setlist, status: "published" },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("published");
  });

  it("returns 404 when setlist not found", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({ Item: undefined });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 when userId does not match", async () => {
    mockVerify.mockResolvedValue({
      sub: "wrong-user",
      email: "dj@example.com",
    });
    mockSend.mockResolvedValue({
      Item: { id: "abc", userId: "user1", status: "draft" },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/setlists/:id/publish (authenticated)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("unpublishes a setlist by reverting to draft and returns 200", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({
      Attributes: { id: "abc", status: "draft" },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("draft");
    // status を draft に戻していることを検証する
    const command = mockSend.mock.calls.at(-1)?.[0] as {
      input: { ExpressionAttributeValues: Record<string, unknown> };
    };
    expect(Object.values(command.input.ExpressionAttributeValues)).toContain("draft");
  });

  it("returns 404 when setlist not found or userId mismatch", async () => {
    mockVerify.mockResolvedValue({
      sub: "wrong-user",
      email: "dj@example.com",
    });
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(404);
  });

  it("re-throws non-ConditionalCheckFailedException errors", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    const err = new Error("DynamoDB timeout");
    err.name = "ProvisionedThroughputExceededException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(500);
  });
});
