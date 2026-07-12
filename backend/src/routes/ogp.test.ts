import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockSend }) },
  GetCommand: class {
    constructor(public input: unknown) {}
  },
  QueryCommand: class {
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
}));

vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: vi.fn() }),
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

vi.mock("nanoid", () => ({
  nanoid: () => "test12345",
}));

describe("GET /api/ogp/:id", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
  });

  async function getApp() {
    const { app } = await import("../app");
    return app;
  }

  it("returns HTML with OGP meta tags for a published setlist", async () => {
    const item = {
      id: "set1",
      name: "Friday Night Set",
      artistName: "DJ Star",
      eventName: "Club Night",
      eventDate: "2026-07-10",
      tracks: [
        { id: "t1", title: "Track A", artist: "A" },
        { id: "t2", title: "Track B", artist: "B" },
        { id: "t3", title: "Track C", artist: "C" },
      ],
      status: "published",
    };
    mockSend.mockResolvedValue({ Item: item });

    const app = await getApp();
    const res = await app.request("/api/ogp/set1");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="Friday Night Set" />');
    expect(html).toContain(
      '<meta property="og:description" content="DJ Star | Club Night | 3曲" />'
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://setnote.yu-web.site/s/set1" />'
    );
    expect(html).toContain('<meta property="og:image"');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it("returns 404 when the setlist does not exist", async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    const app = await getApp();
    const res = await app.request("/api/ogp/notfound");

    expect(res.status).toBe(404);
  });

  it("returns 404 when the setlist is not published", async () => {
    mockSend.mockResolvedValue({ Item: { id: "x", status: "draft" } });

    const app = await getApp();
    const res = await app.request("/api/ogp/x");

    expect(res.status).toBe(404);
  });

  it("handles missing optional fields gracefully", async () => {
    const item = {
      id: "set2",
      name: "Minimal Set",
      tracks: [{ id: "t1", title: "Only Track", artist: "" }],
      status: "published",
    };
    mockSend.mockResolvedValue({ Item: item });

    const app = await getApp();
    const res = await app.request("/api/ogp/set2");

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="Minimal Set" />');
    expect(html).toContain('<meta property="og:description" content="1曲" />');
  });

  it("handles undefined tracks and name fields", async () => {
    const item = { id: "set4", status: "published" };
    mockSend.mockResolvedValue({ Item: item });

    const app = await getApp();
    const res = await app.request("/api/ogp/set4");

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<meta property="og:title" content="" />');
    expect(html).toContain('<meta property="og:description" content="0曲" />');
  });

  it("escapes HTML special characters in meta content", async () => {
    const item = {
      id: "set3",
      name: 'Set "with" <special> & chars',
      artistName: "DJ <script>",
      tracks: [],
      status: "published",
    };
    mockSend.mockResolvedValue({ Item: item });

    const app = await getApp();
    const res = await app.request("/api/ogp/set3");

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;special&gt;");
    expect(html).toContain("&amp;");
  });
});
