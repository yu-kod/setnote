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

describe("GET /api/setlists/:id (public)", () => {
  beforeEach(() => {
    mockSend.mockReset();
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

describe("POST /api/setlists", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("creates a new setlist and returns 201", async () => {
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "user1",
        name: "Friday Night Set",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("test12345");
    expect(body.name).toBe("Friday Night Set");
    expect(body.userId).toBe("user1");
    expect(body.status).toBe("draft");
    expect(body.tracks).toEqual([]);
  });

  it("returns 400 when name is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/setlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when userId is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/setlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Set" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/setlists/user/:userId", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("returns list of setlists for a user", async () => {
    mockSend.mockResolvedValue({
      Items: [
        { id: "a", name: "Set A", status: "draft", userId: "user1" },
        { id: "b", name: "Set B", status: "published", userId: "user1" },
      ],
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/user/user1");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Set A");
  });

  it("returns empty array when user has no setlists", async () => {
    mockSend.mockResolvedValue({ Items: [] });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/user/user1");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("PUT /api/setlists/:id", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("updates a setlist and returns 200", async () => {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "user1",
        name: "Updated Set",
        tracks: [{ trackName: "Song 1" }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Set");
  });

  it("returns 404 when setlist does not exist or userId mismatch", async () => {
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "wrong-user",
        name: "Updated",
      }),
    });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/setlists/:id", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("deletes a setlist and returns 204", async () => {
    mockSend.mockResolvedValue({});

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user1" }),
    });

    expect(res.status).toBe(204);
  });

  it("returns 404 when setlist does not exist or userId mismatch", async () => {
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "wrong-user" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/setlists/:id/publish", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("publishes a draft setlist and returns 200", async () => {
    const setlist = {
      id: "abc",
      userId: "user1",
      name: "My Set",
      status: "draft",
      tracks: [{ trackName: "Song 1" }],
    };
    mockSend
      .mockResolvedValueOnce({ Item: setlist })
      .mockResolvedValueOnce({ Attributes: { ...setlist, status: "published" } });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("published");
  });

  it("returns 404 when setlist not found", async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 when userId does not match", async () => {
    mockSend.mockResolvedValue({
      Item: { id: "abc", userId: "user1", status: "draft" },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "wrong-user" }),
    });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/setlists/:id/publish", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("unpublishes a setlist and returns 200", async () => {
    mockSend.mockResolvedValue({
      Attributes: { id: "abc", status: "unpublished" },
    });

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("unpublished");
  });

  it("returns 404 when setlist not found or userId mismatch", async () => {
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValue(err);

    const { app } = await import("../app");
    const res = await app.request("/api/setlists/abc/publish", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "wrong-user" }),
    });

    expect(res.status).toBe(404);
  });
});
