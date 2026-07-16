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

const mockParseTracksFromImage = vi.fn();
vi.mock("../services/image-parser", () => ({
  parseTracksFromImage: mockParseTracksFromImage,
}));

function authHeaders(token = "valid-token") {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

describe("POST /api/image-parse", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    mockVerify.mockReset();
    mockParseTracksFromImage.mockReset();
    mockVerify.mockResolvedValue({ sub: "user1", email: "test@example.com" });
  });

  it("returns 401 without auth token", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/image-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64", mediaType: "image/png" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when image is missing", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/image-parse", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ mediaType: "image/png" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when mediaType is invalid", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/image-parse", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ image: "base64data", mediaType: "text/plain" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when image exceeds size limit", async () => {
    const largeImage = "x".repeat(5 * 1024 * 1024 + 1);

    const { app } = await import("../app");
    const res = await app.request("/api/image-parse", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ image: largeImage, mediaType: "image/png" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.message).toContain("5MB");
  });

  it("returns parsed tracks on success", async () => {
    const tracks = [
      { title: "Who?", artist: "Azari" },
      { title: "ブレインロット", artist: "東京真中" },
    ];
    mockParseTracksFromImage.mockResolvedValue(tracks);

    const { app } = await import("../app");
    const res = await app.request("/api/image-parse", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ image: "base64data", mediaType: "image/png" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracks });
    expect(mockParseTracksFromImage).toHaveBeenCalledWith("base64data", "image/png");
  });

  it("returns 500 when service throws", async () => {
    mockParseTracksFromImage.mockRejectedValue(new Error("API error"));

    const { app } = await import("../app");
    const res = await app.request("/api/image-parse", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ image: "base64data", mediaType: "image/jpeg" }),
    });

    expect(res.status).toBe(500);
  });
});
