import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchVocadbSongs } from "./vocadb";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function songsResponse(items: unknown[]) {
  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("searchVocadbSongs（曲名検索）", () => {
  it("曲名で検索し、タイトル・作者名・楽曲リンクに正規化して返す", async () => {
    mockFetch.mockResolvedValueOnce(
      songsResponse([
        {
          id: 3939,
          name: "Tell Your World",
          artistString: "kz feat. 初音ミク",
          pvs: [
            {
              service: "Youtube",
              pvType: "Original",
              url: "https://www.youtube.com/watch?v=PqJNc9KVIZE",
            },
          ],
        },
      ])
    );

    const songs = await searchVocadbSongs("Tell Your World", "title", 20);

    expect(songs).toEqual([
      {
        id: 3939,
        title: "Tell Your World",
        artist: "kz feat. 初音ミク",
        songLink: "https://www.youtube.com/watch?v=PqJNc9KVIZE",
        vocadbUrl: "https://vocadb.net/S/3939",
      },
    ]);
  });

  it("検索語をエスケープして VocaDB の楽曲検索を1回だけ呼ぶ", async () => {
    mockFetch.mockResolvedValueOnce(songsResponse([]));

    await searchVocadbSongs("テオ", "title", 5);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain("https://vocadb.net/api/songs?query=%E3%83%86%E3%82%AA");
    expect(url).toContain("maxResults=5");
    // 画像はライセンス対象外なので ThumbUrl は要求しない。
    expect(url).not.toContain("ThumbUrl");
  });
});

describe("楽曲リンクの選択", () => {
  async function linkFor(pvs: unknown[]) {
    mockFetch.mockResolvedValueOnce(
      songsResponse([{ id: 1, name: "song", artistString: "a", pvs }])
    );
    const [song] = await searchVocadbSongs("song", "title", 20);
    return song!.songLink;
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

  it("PV フィールド自体が無くても楽曲リンクは空になる", async () => {
    mockFetch.mockResolvedValueOnce(songsResponse([{ id: 2, name: "song", artistString: "a" }]));

    const [song] = await searchVocadbSongs("song", "title", 20);

    expect(song).toEqual({
      id: 2,
      title: "song",
      artist: "a",
      songLink: "",
      vocadbUrl: "https://vocadb.net/S/2",
    });
  });

  it("作者名が欠けていても空文字で返す", async () => {
    mockFetch.mockResolvedValueOnce(songsResponse([{ id: 3, name: "song", pvs: [] }]));

    const [song] = await searchVocadbSongs("song", "title", 20);

    expect(song!.artist).toBe("");
  });
});

describe("searchVocadbSongs（作者名検索）", () => {
  it("作者を引いてから、その作者の楽曲を人気順に取得する", async () => {
    mockFetch.mockResolvedValueOnce(songsResponse([{ id: 77, name: "kz" }])).mockResolvedValueOnce(
      songsResponse([
        {
          id: 3939,
          name: "Tell Your World",
          artistString: "kz feat. 初音ミク",
          pvs: [{ service: "Youtube", pvType: "Original", url: "https://youtu.be/original000" }],
        },
      ])
    );

    const songs = await searchVocadbSongs("kz", "artist", 20);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0]![0]).toContain("https://vocadb.net/api/artists?query=kz");
    const songsUrl = mockFetch.mock.calls[1]![0] as string;
    expect(songsUrl).toContain("artistId=77");
    expect(songsUrl).toContain("sort=RatingScore");
    expect(songsUrl).not.toContain("ThumbUrl");
    expect(songs).toHaveLength(1);
    expect(songs[0]!.title).toBe("Tell Your World");
  });

  it("該当する作者がいなければ空配列を返し、楽曲検索は呼ばない", async () => {
    mockFetch.mockResolvedValueOnce(songsResponse([]));

    const songs = await searchVocadbSongs("該当なし", "artist", 20);

    expect(songs).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("作者は見つかっても楽曲レスポンスに items が無ければ空配列を返す", async () => {
    mockFetch
      .mockResolvedValueOnce(songsResponse([{ id: 77, name: "kz" }]))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    expect(await searchVocadbSongs("kz", "artist", 20)).toEqual([]);
  });

  it("items が欠けたレスポンスでも空配列を返す", async () => {
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    expect(await searchVocadbSongs("何か", "artist", 20)).toEqual([]);
  });
});

describe("VocaDB への通信が失敗したとき", () => {
  it("fetch が例外を投げたら失敗として投げ直す", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    await expect(searchVocadbSongs("テオ", "title", 20)).rejects.toThrow("Failed to reach VocaDB");
  });

  it("VocaDB がエラーステータスを返したら失敗として投げる", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(searchVocadbSongs("テオ", "title", 20)).rejects.toThrow(
      "VocaDB returned an error"
    );
  });
});
