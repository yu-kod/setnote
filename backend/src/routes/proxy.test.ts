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
  CognitoIdentityProviderClient: class {},
  SignUpCommand: class {},
  ConfirmSignUpCommand: class {},
  InitiateAuthCommand: class {},
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("GET /api/proxy/thumbnail", () => {
  it("returns 400 when videoId is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/proxy/thumbnail");
    expect(res.status).toBe(400);
  });

  it("returns 400 when videoId has invalid format", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/proxy/thumbnail?videoId=<script>alert(1)</script>");
    expect(res.status).toBe(400);
  });

  it("fetches the YouTube thumbnail and returns it", async () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockFetch.mockResolvedValue(
      new Response(imageData, {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      })
    );

    const { app } = await import("../app");
    const res = await app.request("/api/proxy/thumbnail?videoId=dQw4w9WgXcQ");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toContain("max-age");
    expect(mockFetch).toHaveBeenCalledWith("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("defaults Content-Type to image/jpeg when upstream omits it", async () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockFetch.mockResolvedValue(new Response(imageData, { status: 200 }));

    const { app } = await import("../app");
    const res = await app.request("/api/proxy/thumbnail?videoId=dQw4w9WgXcQ");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 502 when the upstream fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const { app } = await import("../app");
    const res = await app.request("/api/proxy/thumbnail?videoId=dQw4w9WgXcQ");

    expect(res.status).toBe(502);
  });

  it("returns 502 when the upstream returns a non-ok status", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 404 }));

    const { app } = await import("../app");
    const res = await app.request("/api/proxy/thumbnail?videoId=dQw4w9WgXcQ");

    expect(res.status).toBe(502);
  });
});
