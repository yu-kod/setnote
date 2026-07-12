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

  it("returns the live published setlist", async () => {
    const item = { id: "abc", userId: "u1", name: "My Set", status: "published", tracks: [] };
    mockSend.mockResolvedValue({ Item: item });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(item);
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

describe("POST /api/setlists/:id/view (public beacon)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("increments the view count of a published setlist and returns 204", async () => {
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/view", { method: "POST" });

    expect(res.status).toBe(204);
    const command = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Key: { id: "abc" },
      UpdateExpression: "ADD viewCount :one",
      ExpressionAttributeValues: { ":one": 1, ":published": "published" },
    });
  });

  it("silently no-ops with 204 for a non-published or missing setlist", async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error("conditional"), { name: "ConditionalCheckFailedException" })
    );

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/draft-id/view", { method: "POST" });

    expect(res.status).toBe(204);
  });

  it("does not require authentication", async () => {
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/view", { method: "POST" });

    expect(res.status).toBe(204);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("surfaces an unexpected error as a 500", async () => {
    mockSend.mockRejectedValue(new Error("dynamo down"));

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/view", { method: "POST" });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/setlists/:id/tracks/:trackId/like (public)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("increments the track like count and returns the new total, without auth", async () => {
    mockSend.mockResolvedValue({ Attributes: { likeCounts: { t1: 4 } } });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "POST" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 4 });
    expect(mockVerify).not.toHaveBeenCalled();

    const command = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Key: { id: "abc" },
      UpdateExpression: "SET likeCounts.#tid = if_not_exists(likeCounts.#tid, :zero) + :one",
      ExpressionAttributeNames: { "#tid": "t1", "#status": "status" },
      ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":published": "published" },
    });
  });

  it("returns 404 for a non-published or missing setlist", async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" })
    );

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/draft/tracks/t1/like", { method: "POST" });

    expect(res.status).toBe(404);
  });

  it("initializes the like map and retries when it does not exist yet", async () => {
    mockSend
      .mockRejectedValueOnce(Object.assign(new Error("path"), { name: "ValidationException" }))
      .mockResolvedValueOnce({}) // ensure map
      .mockResolvedValueOnce({ Attributes: { likeCounts: { t1: 1 } } }); // retry

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "POST" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 1 });
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it("surfaces an unexpected error as a 500", async () => {
    mockSend.mockRejectedValue(new Error("dynamo down"));

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "POST" });

    expect(res.status).toBe(500);
  });

  it("falls back to a count of 1 when the update returns no attributes", async () => {
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "POST" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 1 });
  });
});

describe("DELETE /api/setlists/:id/tracks/:trackId/like (public, unlike)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
  });

  it("decrements the track like count and returns the new total, without auth", async () => {
    mockSend.mockResolvedValue({ Attributes: { likeCounts: { t1: 2 } } });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 2 });
    expect(mockVerify).not.toHaveBeenCalled();

    const command = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Key: { id: "abc" },
      UpdateExpression: "SET likeCounts.#tid = likeCounts.#tid - :one",
      ConditionExpression:
        "attribute_exists(id) AND #status = :published AND likeCounts.#tid > :zero",
      ExpressionAttributeValues: { ":one": 1, ":zero": 0, ":published": "published" },
    });
  });

  it("returns a count of 0 when there is nothing to remove (already 0 / unpublished)", async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" })
    );

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 0 });
  });

  it("returns a count of 0 when the like map does not exist", async () => {
    mockSend.mockRejectedValue(Object.assign(new Error("path"), { name: "ValidationException" }));

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 0 });
  });

  it("falls back to 0 when the update returns no attributes", async () => {
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ likeCount: 0 });
  });

  it("surfaces an unexpected error as a 500", async () => {
    mockSend.mockRejectedValue(new Error("dynamo down"));

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/tracks/t1/like", { method: "DELETE" });

    expect(res.status).toBe(500);
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
    expect(body.likeCounts).toEqual({});
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

  it("saves the artist name (名義) on update", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({ Attributes: { id: "abc", artistName: "DJ Cool" } });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Set", tracks: [], artistName: "DJ Cool" }),
    });

    expect(res.status).toBe(200);
    const command = mockSend.mock.calls.at(-1)?.[0] as {
      input: { ExpressionAttributeValues: Record<string, unknown> };
    };
    expect(command.input.ExpressionAttributeValues[":artistName"]).toBe("DJ Cool");
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

  it("publishes a setlist and returns 200", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockResolvedValue({ Attributes: { id: "abc", status: "published" } });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("published");
  });

  it("returns 404 when setlist not found or userId mismatch", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(404);
  });

  it("returns 500 on unexpected error", async () => {
    mockVerify.mockResolvedValue({ sub: "user1", email: "dj@example.com" });
    mockSend.mockRejectedValue(new Error("boom"));

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(500);
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
