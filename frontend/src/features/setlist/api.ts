import type { Setlist, Track } from "./types";
import { collectTrackSuggestions } from "./suggestions";
import { clearSession, redirectToLogin } from "../auth/session";

function getToken(): string {
  return localStorage.getItem("setnote_access_token") ?? "";
}

async function setlistRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`/api/setlists${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    if (res.status === 401) {
      // トークン失効。セッションを破棄してログイン画面へ誘導する。
      clearSession();
      redirectToLogin();
    }
    const data = await res.json().catch(() => ({}));
    const message =
      (data as Record<string, unknown>).error instanceof Object
        ? ((data as Record<string, Record<string, string>>).error.message ?? "エラーが発生しました")
        : typeof (data as Record<string, unknown>).error === "string"
          ? (data as Record<string, string>).error
          : "エラーが発生しました";
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type UpdateSetlistInput = {
  name: string;
  artistName: string | null;
  eventName: string | null;
  eventLink: string | null;
  eventDate: string | null;
  tracks: unknown[];
};

export function fetchMySetlists(): Promise<Setlist[]> {
  return setlistRequest<Setlist[]>("/mine");
}

export function createSetlist(name: string): Promise<Setlist> {
  return setlistRequest<Setlist>("", { method: "POST", body: { name } });
}

// 既存のセットリストを下書きとして複製する。複製されたセットリストを返す。
export function duplicateSetlist(id: string): Promise<Setlist> {
  return setlistRequest<Setlist>(`/${id}/duplicate`, { method: "POST" });
}

// 編集用の取得は所有者専用の GET が無いため、認証付きの一覧から id で絞る。
export async function fetchSetlist(id: string): Promise<Setlist | null> {
  const setlists = await fetchMySetlists();
  return setlists.find((s) => s.id === id) ?? null;
}

export function updateSetlist(id: string, input: UpdateSetlistInput): Promise<Setlist> {
  return setlistRequest<Setlist>(`/${id}`, { method: "PUT", body: input });
}

export function publishSetlist(id: string): Promise<Setlist> {
  return setlistRequest<Setlist>(`/${id}/publish`, { method: "POST" });
}

export function unpublishSetlist(id: string): Promise<Setlist> {
  return setlistRequest<Setlist>(`/${id}/publish`, { method: "DELETE" });
}

export function deleteSetlist(id: string): Promise<void> {
  return setlistRequest<void>(`/${id}`, { method: "DELETE" });
}

// オートコンプリート用。過去入力の曲を集約する。
// 専用エンドポイントは将来課題で、当面は /mine の全 tracks から集約する。
export async function fetchTrackSuggestions(): Promise<Track[]> {
  const setlists = await fetchMySetlists();
  return collectTrackSuggestions(setlists);
}

// 公開ページからの曲いいね。認証不要。新しいいいね数を返す。
export async function likeTrack(setlistId: string, trackId: string): Promise<number> {
  const res = await fetch(`/api/setlists/${setlistId}/tracks/${trackId}/like`, { method: "POST" });
  if (!res.ok) {
    throw new Error("いいねに失敗しました");
  }
  const data = (await res.json()) as { likeCount: number };
  return data.likeCount;
}

// 公開ページからの曲いいね取り消し。認証不要。取り消し後のいいね数を返す。
export async function unlikeTrack(setlistId: string, trackId: string): Promise<number> {
  const res = await fetch(`/api/setlists/${setlistId}/tracks/${trackId}/like`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("いいねの取り消しに失敗しました");
  }
  const data = (await res.json()) as { likeCount: number };
  return data.likeCount;
}

// 公開ページ表示のPVビーコン。認証不要・fire-and-forget（失敗しても無視する）。
export async function recordSetlistView(id: string): Promise<void> {
  try {
    await fetch(`/api/setlists/${id}/view`, { method: "POST" });
  } catch {
    // 計測失敗はページ表示に影響させない。
  }
}

export type ParsedTrack = {
  title: string;
  artist: string;
};

export async function parseImageTracks(
  imageBase64: string,
  mediaType: string
): Promise<ParsedTrack[]> {
  const res = await fetch("/api/image-parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ image: imageBase64, mediaType }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      redirectToLogin();
    }
    throw new Error("画像の解析に失敗しました");
  }

  const data = (await res.json()) as { tracks: ParsedTrack[] };
  return data.tracks;
}

// 公開ページ用。認証不要で、公開中のセットリストのスナップショットを取得する。
export async function fetchPublicSetlist(id: string): Promise<Setlist> {
  const res = await fetch(`/api/setlists/${id}`);
  if (!res.ok) {
    throw new Error("Not found");
  }
  return res.json() as Promise<Setlist>;
}

export type VocadbSong = {
  id: number;
  title: string;
  artist: string;
  songLink: string;
  vocadbUrl: string;
  songType: string;
};

export type VocadbArtist = {
  id: number;
  name: string;
  artistType: string;
};

export type VocadbSearchResult = {
  songs: VocadbSong[];
  // 実際に採用された作者。曲名だけで検索したときは null。
  artist: VocadbArtist | null;
  artistCandidates: VocadbArtist[];
};

// VocaDB 検索。ブラウザから直接ではなくバックエンド経由で叩く。
// artistId を渡すと、候補のうちその作者に固定して検索する。
export async function searchVocadbSongs(params: {
  title: string;
  artist: string;
  artistId?: number;
}): Promise<VocadbSearchResult> {
  const query = new URLSearchParams();
  if (params.title) query.set("title", params.title);
  if (params.artist) query.set("artist", params.artist);
  if (params.artistId !== undefined) query.set("artistId", String(params.artistId));

  const res = await fetch(`/api/vocadb/songs?${query.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      redirectToLogin();
    }
    throw new Error("VocaDBの検索に失敗しました");
  }

  return (await res.json()) as VocadbSearchResult;
}
