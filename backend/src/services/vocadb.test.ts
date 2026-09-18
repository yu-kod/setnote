import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchVocadbSongs } from "./vocadb";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(items: unknown[]) {
  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function search(params: { title?: string; artist?: string; artistId?: number | null } = {}) {
  return searchVocadbSongs({
    title: "",
    artist: "",
    artistId: null,
    limit: 20,
    ...params,
  });
}

const TELL_YOUR_WORLD = {
  id: 3939,
  name: "Tell Your World",
  artistString: "kz feat. 初音ミク",
  songType: "Original",
  pvs: [{ service: "Youtube", pvType: "Original", url: "https://youtu.be/original000" }],
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("曲名だけで検索したとき", () => {
  it("曲名・作者名・楽曲リンク・種別に正規化して返す", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([TELL_YOUR_WORLD]));

    const result = await search({ title: "Tell Your World" });

    expect(result.songs).toEqual([
      {
        id: 3939,
        title: "Tell Your World",
        artist: "kz feat. 初音ミク",
        songLink: "https://youtu.be/original000",
        vocadbUrl: "https://vocadb.net/S/3939",
        songType: "Original",
      },
    ]);
    expect(result.artist).toBeNull();
    expect(result.artistCandidates).toEqual([]);
  });

  it("作者の問い合わせはせず、楽曲検索だけを1回呼ぶ", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await search({ title: "テオ" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("https://vocadb.net/api/songs?");
    expect(url).toContain("query=%E3%83%86%E3%82%AA");
    expect(url).toContain("maxResults=20");
    expect(url).not.toContain("artistId");
    // 画像はライセンス対象外なので ThumbUrl は要求しない。
    expect(url).not.toContain("ThumbUrl");
  });
});

describe("作者名だけで検索したとき", () => {
  it("作者を引いてから、その作者の曲を人気順に取得する", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 77, name: "kz", artistType: "Producer" }]))
      .mockResolvedValueOnce(jsonResponse([TELL_YOUR_WORLD]));

    const result = await search({ artist: "kz" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0]![0]).toContain("https://vocadb.net/api/artists?query=kz");
    const songsUrl = mockFetch.mock.calls[1]![0] as string;
    // 角カッコ付きの配列形式でないと VocaDB に無視される（後述の回帰テスト参照）。
    expect(songsUrl).toContain("artistId%5B%5D=77");
    expect(songsUrl).toContain("sort=RatingScore");
    expect(songsUrl).not.toContain("query=");
    expect(result.songs).toHaveLength(1);
  });

  it("採用した作者と候補一覧を返す", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 77, name: "kz", artistType: "Producer" },
          { id: 78, name: "kzlabo", artistType: "Circle" },
        ])
      )
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await search({ artist: "kz" });

    expect(result.artist).toEqual({ id: 77, name: "kz", artistType: "Producer" });
    expect(result.artistCandidates).toEqual([
      { id: 77, name: "kz", artistType: "Producer" },
      { id: 78, name: "kzlabo", artistType: "Circle" },
    ]);
  });

  it("作者が見つからなければ楽曲検索をせず空で返す", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    const result = await search({ artist: "該当なし" });

    expect(result).toEqual({ songs: [], artist: null, artistCandidates: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("artistType が欠けていても空文字で返す", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 77, name: "kz" }]))
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await search({ artist: "kz" });

    expect(result.artist).toEqual({ id: 77, name: "kz", artistType: "" });
  });

  it("作者一覧のレスポンスに items が無くても空で返す", async () => {
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    expect(await search({ artist: "kz" })).toEqual({
      songs: [],
      artist: null,
      artistCandidates: [],
    });
  });
});

describe("曲名と作者名を同時に指定したとき", () => {
  it("その作者の中から曲名で絞り込む", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 77, name: "kz", artistType: "Producer" }]))
      .mockResolvedValueOnce(jsonResponse([TELL_YOUR_WORLD]));

    await search({ title: "Tell Your World", artist: "kz" });

    const songsUrl = mockFetch.mock.calls[1]![0] as string;
    expect(songsUrl).toContain("artistId%5B%5D=77");
    expect(songsUrl).toContain("query=Tell");
    expect(songsUrl).not.toContain("sort=RatingScore");
  });
});

describe("作者を指定し直したとき", () => {
  it("artistId で指定された作者を採用する", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 77, name: "kz", artistType: "Producer" },
          { id: 78, name: "kzlabo", artistType: "Circle" },
        ])
      )
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await search({ artist: "kz", artistId: 78 });

    expect(mockFetch.mock.calls[1]![0]).toContain("artistId%5B%5D=78");
    expect(result.artist).toEqual({ id: 78, name: "kzlabo", artistType: "Circle" });
    // 選び直せるよう候補は返し続ける。
    expect(result.artistCandidates).toHaveLength(2);
  });

  it("候補に無い artistId でもその作者で検索する", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([TELL_YOUR_WORLD]));

    const result = await search({ artistId: 999 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]![0]).toContain("artistId%5B%5D=999");
    expect(result.artist).toBeNull();
  });
});

describe("楽曲リンクの選択", () => {
  async function linkFor(pvs: unknown[]) {
    mockFetch.mockResolvedValueOnce(
      jsonResponse([{ id: 1, name: "song", artistString: "a", pvs }])
    );
    const { songs } = await search({ title: "song" });
    return songs[0]!.songLink;
  }

  it("同じサービス内では Original を Reprint より優先する", async () => {
    const link = await linkFor([
      { service: "Youtube", pvType: "Reprint", url: "https://youtu.be/reprint0000" },
      { service: "Youtube", pvType: "Original", url: "https://youtu.be/original000" },
    ]);

    expect(link).toBe("https://youtu.be/original000");
  });

  it("Original が無ければ同じサービスの他の PV を使う", async () => {
    const link = await linkFor([
      { service: "Youtube", pvType: "Reprint", url: "https://youtu.be/reprint0000" },
    ]);

    expect(link).toBe("https://youtu.be/reprint0000");
  });

  it("YouTube が無ければニコニコ動画にフォールバックする", async () => {
    const link = await linkFor([
      { service: "SoundCloud", pvType: "Original", url: "https://soundcloud.com/a/b" },
      { service: "NicoNicoDouga", pvType: "Original", url: "https://www.nicovideo.jp/watch/sm1" },
    ]);

    expect(link).toBe("https://www.nicovideo.jp/watch/sm1");
  });

  it("YouTube があればニコニコ動画より優先する", async () => {
    const link = await linkFor([
      { service: "NicoNicoDouga", pvType: "Original", url: "https://www.nicovideo.jp/watch/sm1" },
      { service: "Youtube", pvType: "Original", url: "https://youtu.be/original000" },
    ]);

    expect(link).toBe("https://youtu.be/original000");
  });

  it("削除済み(disabled)の PV は使わない", async () => {
    const link = await linkFor([
      {
        service: "Youtube",
        pvType: "Original",
        url: "https://youtu.be/disabled000",
        disabled: true,
      },
      { service: "Youtube", pvType: "Original", url: "https://youtu.be/playable000" },
    ]);

    expect(link).toBe("https://youtu.be/playable000");
  });

  it("URL を持たない PV は使わない", async () => {
    const link = await linkFor([
      { service: "Youtube", pvType: "Original" },
      { service: "Youtube", pvType: "Original", url: "https://youtu.be/playable000" },
    ]);

    expect(link).toBe("https://youtu.be/playable000");
  });

  it("対応サービスの PV が無ければ楽曲リンクは空になる", async () => {
    expect(
      await linkFor([{ service: "Bilibili", pvType: "Original", url: "https://b23.tv/x" }])
    ).toBe("");
  });
});

describe("欠けたフィールドの扱い", () => {
  it("PV フィールドも作者名も種別も無ければ空文字で埋める", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([{ id: 2, name: "song" }]));

    const { songs } = await search({ title: "song" });

    expect(songs[0]).toEqual({
      id: 2,
      title: "song",
      artist: "",
      songLink: "",
      vocadbUrl: "https://vocadb.net/S/2",
      songType: "",
    });
  });

  it("曲の種別（Remix / Cover 等）をそのまま返す", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse([{ id: 4, name: "song", artistString: "a", songType: "Remix" }])
    );

    const { songs } = await search({ title: "song" });

    expect(songs[0]!.songType).toBe("Remix");
  });

  it("楽曲レスポンスに items が無くても空配列を返す", async () => {
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    expect((await search({ title: "song" })).songs).toEqual([]);
  });
});

describe("VocaDB への通信が失敗したとき", () => {
  it("fetch が例外を投げたら失敗として投げ直す", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    await expect(search({ title: "テオ" })).rejects.toThrow("Failed to reach VocaDB");
  });

  it("VocaDB がエラーステータスを返したら失敗として投げる", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(search({ title: "テオ" })).rejects.toThrow("VocaDB returned an error");
  });
});

describe("作者候補の並べ替え", () => {
  async function candidatesFor(query: string, items: unknown[]) {
    mockFetch.mockResolvedValueOnce(jsonResponse(items)).mockResolvedValueOnce(jsonResponse([]));
    const { artistCandidates } = await search({ artist: query });
    return artistCandidates.map((a) => a.name);
  }

  it("完全一致の作者を先頭にする", async () => {
    const names = await candidatesFor("kz", [
      { id: 1, name: "kzlabo", artistType: "Circle" },
      { id: 2, name: "kz", artistType: "Producer" },
    ]);

    expect(names).toEqual(["kz", "kzlabo"]);
  });

  it("大文字小文字の違いは完全一致として扱う", async () => {
    const names = await candidatesFor("kz", [
      { id: 1, name: "kzabc", artistType: "Circle" },
      { id: 2, name: "KZ", artistType: "Producer" },
    ]);

    expect(names).toEqual(["KZ", "kzabc"]);
  });

  it("完全一致が無ければ前方一致を優先する", async () => {
    const names = await candidatesFor("kz", [
      { id: 1, name: "The kz band", artistType: "Circle" },
      { id: 2, name: "kzlabo", artistType: "Producer" },
    ]);

    expect(names).toEqual(["kzlabo", "The kz band"]);
  });

  it("同じ順位のものは VocaDB の並びを保つ", async () => {
    const names = await candidatesFor("kz", [
      { id: 1, name: "a kz b", artistType: "Circle" },
      { id: 2, name: "c kz d", artistType: "Circle" },
    ]);

    expect(names).toEqual(["a kz b", "c kz d"]);
  });

  it("並べ替えた先頭を採用する", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 1, name: "kzlabo", artistType: "Circle" },
          { id: 2, name: "kz", artistType: "Producer" },
        ])
      )
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await search({ artist: "kz" });

    expect(result.artist).toEqual({ id: 2, name: "kz", artistType: "Producer" });
    expect(mockFetch.mock.calls[1]![0]).toContain("artistId%5B%5D=2");
  });
});

describe("作者の絞り込みパラメータ（回帰）", () => {
  // VocaDB は認識できないクエリパラメータを黙って無視する。`artistId=89` と書くと
  // 絞り込みが効かず「全体の人気曲トップN」が返ってきて、しかもエラーにならない。
  // 実際に 2026-09-18 にこれで別人の曲が並ぶ不具合を出したので、形式を固定する。
  it("角カッコ付きの配列形式で作者を指定する", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 89, name: "kz", artistType: "Producer" }]))
      .mockResolvedValueOnce(jsonResponse([]));

    await search({ artist: "kz" });

    const songsUrl = mockFetch.mock.calls[1]![0] as string;
    expect(songsUrl).toContain("artistId%5B%5D=89");
    expect(songsUrl).not.toMatch(/[?&]artistId=/);
  });
});

describe("VocaDB へのリクエストヘッダ", () => {
  // VocaDB はボランティア運営のコミュニティDBなので、素性の分かる
  // User-Agent を名乗っておく（匿名の大量アクセスとして弾かれにくくする）。
  it("setnote と連絡先を名乗る User-Agent を付ける", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 89, name: "kz" }]))
      .mockResolvedValueOnce(jsonResponse([]));

    await search({ artist: "kz" });

    for (const [, init] of mockFetch.mock.calls) {
      const headers = (init as { headers: Record<string, string> }).headers;
      expect(headers["User-Agent"]).toBe("setnote (+https://setnote.yu-web.site)");
      expect(headers.Accept).toBe("application/json");
    }
  });
});
