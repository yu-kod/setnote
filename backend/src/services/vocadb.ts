// VocaDB の公開 API から楽曲メタデータを検索する。
// 画像（ジャケット/サムネイル）はライセンス対象外なので取得しない。
// そのため fields に ThumbUrl を含めず、返すのも文字列メタデータと PV リンクだけ。

const API_BASE = "https://vocadb.net/api";

// VocaDB はボランティア運営のコミュニティDB。素性の分かる名前と連絡先を名乗っておく
// （匿名の大量アクセスとして弾かれるのを避けるための、この手のAPIでの作法）。
const USER_AGENT = "setnote (+https://setnote.yu-web.site)";
const SONG_FIELDS = "PVs";

// 作者名は部分一致で引かれるため、1件に決め打ちせず候補を出して選び直せるようにする。
const ARTIST_CANDIDATES = 5;

export type VocadbArtist = {
  id: number;
  name: string;
  artistType: string;
};

export type VocadbSong = {
  id: number;
  title: string;
  artist: string;
  songLink: string;
  vocadbUrl: string;
  // Original / Remix / Cover / Instrumental 等。同名エントリの見分けに使う。
  songType: string;
};

export type VocadbSearchResult = {
  songs: VocadbSong[];
  // 実際に採用した作者。曲名だけで検索したときは null。
  artist: VocadbArtist | null;
  artistCandidates: VocadbArtist[];
};

export type VocadbSearchParams = {
  title: string;
  artist: string;
  artistId: number | null;
  limit: number;
};

type Pv = { service?: string; pvType?: string; url?: string; disabled?: boolean };
type SongEntry = {
  id: number;
  name: string;
  artistString?: string;
  songType?: string;
  pvs?: Pv[];
};
type ArtistEntry = { id: number; name: string; artistType?: string };

// アプリが埋め込み再生できるサービス（media.ts 参照）のうち、採用する優先順。
const PV_SERVICE_PREFERENCE = ["Youtube", "NicoNicoDouga"] as const;

function pickSongLink(pvs: Pv[]): string {
  const usable = pvs.filter((pv): pv is Pv & { url: string } => !pv.disabled && Boolean(pv.url));

  for (const service of PV_SERVICE_PREFERENCE) {
    const ofService = usable.filter((pv) => pv.service === service);
    // 転載版より公式アップロードを優先する。
    const chosen = ofService.find((pv) => pv.pvType === "Original") ?? ofService[0];
    if (chosen) return chosen.url;
  }
  return "";
}

function toVocadbSong(entry: SongEntry): VocadbSong {
  return {
    id: entry.id,
    title: entry.name,
    artist: entry.artistString ?? "",
    songLink: pickSongLink(entry.pvs ?? []),
    vocadbUrl: `https://vocadb.net/S/${entry.id}`,
    songType: entry.songType ?? "",
  };
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
  } catch {
    throw new Error("Failed to reach VocaDB");
  }

  if (!res.ok) {
    throw new Error("VocaDB returned an error");
  }
  return (await res.json()) as T;
}

// VocaDB の作者検索は関連度順とは限らないため、入力との一致度で並べ替える。
// これをしないと「kz」で名前に kz を含む別人が先頭に来て、そのまま採用されてしまう。
function rankArtists(artists: VocadbArtist[], query: string): VocadbArtist[] {
  const q = query.trim().toLowerCase();
  const score = (artist: VocadbArtist) => {
    const name = artist.name.toLowerCase();
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    return 2;
  };
  // sort は安定なので、同じ順位の中では VocaDB の並びを保つ。
  return [...artists].sort((a, b) => score(a) - score(b));
}

async function findArtists(query: string): Promise<VocadbArtist[]> {
  const body = await getJson<{ items?: ArtistEntry[] }>(
    `${API_BASE}/artists?query=${encodeURIComponent(query)}` +
      `&maxResults=${ARTIST_CANDIDATES}&nameMatchMode=Auto&lang=Default`
  );

  const artists = (body.items ?? []).map((entry) => ({
    id: entry.id,
    name: entry.name,
    artistType: entry.artistType ?? "",
  }));
  return rankArtists(artists, query);
}

function songsUrl(title: string, artistId: number | null, limit: number): string {
  const params = new URLSearchParams({
    maxResults: String(limit),
    fields: SONG_FIELDS,
    lang: "Default",
  });

  if (title) {
    params.set("query", title);
    params.set("nameMatchMode", "Auto");
    params.set("preferAccurateMatches", "true");
  } else {
    // 曲名の指定が無いときは、その作者の代表曲から見られるよう人気順にする。
    params.set("sort", "RatingScore");
  }

  if (artistId !== null) {
    // VocaDB はこの項目を配列で受けるので、角カッコ付きの名前でないと束縛されない。
    // しかも認識できないパラメータは黙って無視される（エラーにならない）ため、
    // `artistId=89` と書くと絞り込み無しの「全体の人気曲」がそのまま返ってくる。
    params.set("artistId[]", String(artistId));
  }
  return `${API_BASE}/songs?${params.toString()}`;
}

export async function searchVocadbSongs(params: VocadbSearchParams): Promise<VocadbSearchResult> {
  const candidates = params.artist ? await findArtists(params.artist) : [];
  const chosen = candidates.find((a) => a.id === params.artistId) ?? candidates[0] ?? null;
  const artistId = params.artistId ?? chosen?.id ?? null;

  // 作者名を入れたのに誰も見つからなかったときは、曲名だけで検索し直さない。
  // 別人の曲が並ぶより「見つからない」と分かるほうがよい。
  if (params.artist && artistId === null) {
    return { songs: [], artist: null, artistCandidates: [] };
  }

  const body = await getJson<{ items?: SongEntry[] }>(
    songsUrl(params.title, artistId, params.limit)
  );
  return {
    songs: (body.items ?? []).map(toVocadbSong),
    artist: chosen,
    artistCandidates: candidates,
  };
}
