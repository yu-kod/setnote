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

const mockSearchVocadbSongs = vi.fn();
vi.mock("../services/vocadb", () => ({
  searchVocadbSongs: mockSearchVocadbSongs,
}));

const authHeaders = { Authorization: "Bearer valid-token" };

const SONG = {
  id: 3939,
  title: "Tell Your World",
  artist: "kz feat. 初音ミク",
  songLink: "https://youtu.be/original000",
  vocadbUrl: "https://vocadb.net/S/3939",
};

describe("GET /api/vocadb/songs", () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerify.mockReset();
    mockSearchVocadbSongs.mockReset();
    mockVerify.mockResolvedValue({ sub: "user1", email: "test@example.com" });
  });

  it("認証が無ければ 401 を返し、VocaDB を呼ばない", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?q=テオ");

    expect(res.status).toBe(401);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("検索語で曲名検索した結果を返す", async () => {
    mockSearchVocadbSongs.mockResolvedValue([SONG]);

    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?q=Tell%20Your%20World", {
      headers: authHeaders,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ songs: [SONG] });
    expect(mockSearchVocadbSongs).toHaveBeenCalledWith("Tell Your World", "title", 20);
  });

  it("by=artist を指定すると作者名検索になる", async () => {
    mockSearchVocadbSongs.mockResolvedValue([]);

    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?q=kz&by=artist", { headers: authHeaders });

    expect(res.status).toBe(200);
    expect(mockSearchVocadbSongs).toHaveBeenCalledWith("kz", "artist", 20);
  });

  it("検索語が無ければ 400 を返す", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs", { headers: authHeaders });

    expect(res.status).toBe(400);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("検索語が空白だけなら 400 を返す", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?q=%20%20", { headers: authHeaders });

    expect(res.status).toBe(400);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("未知の by を指定したら 400 を返す", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?q=kz&by=album", { headers: authHeaders });

    expect(res.status).toBe(400);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("VocaDB との通信に失敗したら 502 を返す", async () => {
    mockSearchVocadbSongs.mockRejectedValue(new Error("Failed to reach VocaDB"));

    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?q=kz", { headers: authHeaders });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: { code: "UPSTREAM_ERROR", message: "Failed to search VocaDB" },
    });
  });
});
