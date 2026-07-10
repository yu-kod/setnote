import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockSend }) },
  GetCommand: class {
    constructor(public input: unknown) {}
  },
}));

describe("GET /api/setlists/:id", () => {
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
    const body = await res.json();
    expect(body.error).toBeDefined();
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
