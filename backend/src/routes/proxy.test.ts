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

const VIDEO_ID = "dQw4w9WgXcQ";
const IMAGE_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function apiResponse(thumbnails: Record<string, { url: string }>) {
  return new Response(JSON.stringify({ items: [{ snippet: { thumbnails } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function imageResponse(contentType?: string) {
  return new Response(IMAGE_BYTES, {
    status: 200,
    ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  process.env.YOUTUBE_API_KEY = "test-key";
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

  it("returns 500 when YOUTUBE_API_KEY is not configured", async () => {
    delete process.env.YOUTUBE_API_KEY;

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(500);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("resolves the thumbnail URL through the YouTube Data API and returns the image", async () => {
    mockFetch
      .mockResolvedValueOnce(apiResponse({ high: { url: "https://i.ytimg.com/vi/x/hq.jpg" } }))
      .mockResolvedValueOnce(imageResponse("image/jpeg"));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toContain("max-age");
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${VIDEO_ID}&key=test-key`
    );
    expect(mockFetch).toHaveBeenNthCalledWith(2, "https://i.ytimg.com/vi/x/hq.jpg");
  });

  it("prefers the highest available thumbnail resolution", async () => {
    mockFetch
      .mockResolvedValueOnce(
        apiResponse({
          default: { url: "https://i.ytimg.com/vi/x/default.jpg" },
          medium: { url: "https://i.ytimg.com/vi/x/mq.jpg" },
          maxres: { url: "https://i.ytimg.com/vi/x/maxres.jpg" },
        })
      )
      .mockResolvedValueOnce(imageResponse("image/jpeg"));

    const { app } = await import("../app");
    await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(mockFetch).toHaveBeenNthCalledWith(2, "https://i.ytimg.com/vi/x/maxres.jpg");
  });

  it("falls back to lower resolutions when larger ones are absent", async () => {
    mockFetch
      .mockResolvedValueOnce(apiResponse({ default: { url: "https://i.ytimg.com/vi/x/d.jpg" } }))
      .mockResolvedValueOnce(imageResponse("image/jpeg"));

    const { app } = await import("../app");
    await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(mockFetch).toHaveBeenNthCalledWith(2, "https://i.ytimg.com/vi/x/d.jpg");
  });

  it("defaults Content-Type to image/jpeg when upstream omits it", async () => {
    mockFetch
      .mockResolvedValueOnce(apiResponse({ high: { url: "https://i.ytimg.com/vi/x/hq.jpg" } }))
      .mockResolvedValueOnce(imageResponse());

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 404 when the video has no entry in the API response", async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 when the API response carries no usable thumbnail", async () => {
    mockFetch.mockResolvedValueOnce(apiResponse({}));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(404);
  });

  it("returns 502 when the Data API request throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(502);
  });

  it("returns 502 when the Data API returns a non-ok status", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(502);
  });

  it("returns 502 when the image request throws", async () => {
    mockFetch
      .mockResolvedValueOnce(apiResponse({ high: { url: "https://i.ytimg.com/vi/x/hq.jpg" } }))
      .mockRejectedValueOnce(new Error("network error"));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(502);
  });

  it("returns 502 when the image request returns a non-ok status", async () => {
    mockFetch
      .mockResolvedValueOnce(apiResponse({ high: { url: "https://i.ytimg.com/vi/x/hq.jpg" } }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    const { app } = await import("../app");
    const res = await app.request(`/api/proxy/thumbnail?videoId=${VIDEO_ID}`);

    expect(res.status).toBe(502);
  });
});
