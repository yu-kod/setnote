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
  songType: "Original",
};

const ARTIST = { id: 77, name: "kz", artistType: "Producer" };

const EMPTY_RESULT = { songs: [], artist: null, artistCandidates: [] };

describe("GET /api/vocadb/songs", () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerify.mockReset();
    mockSearchVocadbSongs.mockReset();
    mockVerify.mockResolvedValue({ sub: "user1", email: "test@example.com" });
  });

  it("認証が無ければ 401 を返し、VocaDB を呼ばない", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?title=%E3%83%86%E3%82%AA");

    expect(res.status).toBe(401);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("曲名で検索した結果をそのまま返す", async () => {
    mockSearchVocadbSongs.mockResolvedValue({ ...EMPTY_RESULT, songs: [SONG] });

    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?title=Tell%20Your%20World", {
      headers: authHeaders,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ...EMPTY_RESULT, songs: [SONG] });
    expect(mockSearchVocadbSongs).toHaveBeenCalledWith({
      title: "Tell Your World",
      artist: "",
      artistId: null,
      limit: 20,
    });
  });

  it("作者名だけでも検索できる", async () => {
    mockSearchVocadbSongs.mockResolvedValue({ ...EMPTY_RESULT, artist: ARTIST });

    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?artist=kz", { headers: authHeaders });

    expect(res.status).toBe(200);
    expect(mockSearchVocadbSongs).toHaveBeenCalledWith({
      title: "",
      artist: "kz",
      artistId: null,
      limit: 20,
    });
  });

  it("曲名と作者名を同時に指定できる", async () => {
    mockSearchVocadbSongs.mockResolvedValue(EMPTY_RESULT);

    const { app } = await import("../app");
    await app.request("/api/vocadb/songs?title=Tell&artist=kz", { headers: authHeaders });

    expect(mockSearchVocadbSongs).toHaveBeenCalledWith({
      title: "Tell",
      artist: "kz",
      artistId: null,
      limit: 20,
    });
  });

  it("artistId で作者を指定し直せる", async () => {
    mockSearchVocadbSongs.mockResolvedValue(EMPTY_RESULT);

    const { app } = await import("../app");
    await app.request("/api/vocadb/songs?artist=kz&artistId=78", { headers: authHeaders });

    expect(mockSearchVocadbSongs).toHaveBeenCalledWith({
      title: "",
      artist: "kz",
      artistId: 78,
      limit: 20,
    });
  });

  it("前後の空白を落として渡す", async () => {
    mockSearchVocadbSongs.mockResolvedValue(EMPTY_RESULT);

    const { app } = await import("../app");
    await app.request("/api/vocadb/songs?title=%20Tell%20&artist=%20kz%20", {
      headers: authHeaders,
    });

    expect(mockSearchVocadbSongs).toHaveBeenCalledWith({
      title: "Tell",
      artist: "kz",
      artistId: null,
      limit: 20,
    });
  });

  it("曲名も作者名も無ければ 400 を返す", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs", { headers: authHeaders });

    expect(res.status).toBe(400);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("空白だけの指定なら 400 を返す", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?title=%20%20&artist=%20", {
      headers: authHeaders,
    });

    expect(res.status).toBe(400);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("artistId が数値でなければ 400 を返す", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?artist=kz&artistId=abc", {
      headers: authHeaders,
    });

    expect(res.status).toBe(400);
    expect(mockSearchVocadbSongs).not.toHaveBeenCalled();
  });

  it("VocaDB との通信に失敗したら 502 を返す", async () => {
    mockSearchVocadbSongs.mockRejectedValue(new Error("Failed to reach VocaDB"));

    const { app } = await import("../app");
    const res = await app.request("/api/vocadb/songs?artist=kz", { headers: authHeaders });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: { code: "UPSTREAM_ERROR", message: "Failed to search VocaDB" },
    });
  });
});
