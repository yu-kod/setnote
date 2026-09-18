// VocaDB の公開 API から楽曲メタデータを検索する。
// 画像（ジャケット/サムネイル）はライセンス対象外なので取得しない。
// そのため fields に ThumbUrl を含めず、返すのも文字列メタデータと PV リンクだけ。

const API_BASE = "https://vocadb.net/api";
const SONG_FIELDS = "PVs";

export type SearchBy = "title" | "artist";

export type VocadbSong = {
  id: number;
  title: string;
  artist: string;
  songLink: string;
  vocadbUrl: string;
};

type Pv = { service?: string; pvType?: string; url?: string; disabled?: boolean };
type SongEntry = { id: number; name: string; artistString?: string; pvs?: Pv[] };

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
  };
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Failed to reach VocaDB");
  }

  if (!res.ok) {
    throw new Error("VocaDB returned an error");
  }
  return (await res.json()) as T;
}

function songsByTitleUrl(query: string, limit: number): string {
  return (
    `${API_BASE}/songs?query=${encodeURIComponent(query)}` +
    `&maxResults=${limit}&nameMatchMode=Auto&preferAccurateMatches=true` +
    `&fields=${SONG_FIELDS}&lang=Default`
  );
}

// VocaDB の楽曲検索は曲名しか見ないため、作者名検索は
// 「作者を1件に絞る → その作者の楽曲を引く」の2段構えにする。
async function songsByArtistUrl(query: string, limit: number): Promise<string | null> {
  const artists = await getJson<{ items?: { id: number }[] }>(
    `${API_BASE}/artists?query=${encodeURIComponent(query)}&maxResults=1&nameMatchMode=Auto&lang=Default`
  );

  const artist = artists.items?.[0];
  if (!artist) return null;

  return (
    `${API_BASE}/songs?artistId=${artist.id}` +
    `&maxResults=${limit}&sort=RatingScore&fields=${SONG_FIELDS}&lang=Default`
  );
}

export async function searchVocadbSongs(
  query: string,
  by: SearchBy,
  limit: number
): Promise<VocadbSong[]> {
  const url =
    by === "artist" ? await songsByArtistUrl(query, limit) : songsByTitleUrl(query, limit);
  if (!url) return [];

  const body = await getJson<{ items?: SongEntry[] }>(url);
  return (body.items ?? []).map(toVocadbSong);
}
