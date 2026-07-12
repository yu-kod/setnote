import { clearSession, redirectToLogin } from "../auth/session";

export type TrackUsage = {
  title: string;
  artist: string;
  count: number;
};

export type ViewRow = {
  id: string;
  name: string;
  viewCount: number;
};

function getToken(): string {
  return localStorage.getItem("setnote_access_token") ?? "";
}

async function authorizedGet<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // トークン失効。セッションを破棄してログイン画面へ誘導する。
      clearSession();
      redirectToLogin();
    }
    throw new Error("分析データの取得に失敗しました");
  }

  return res.json() as Promise<T>;
}

// 自分のセットリスト横断の曲使用回数ランキングを取得する。
export function fetchTrackUsage(): Promise<TrackUsage[]> {
  return authorizedGet<TrackUsage[]>("/api/analytics/track-usage");
}

// 自分のセットリストごとの表示回数(PV)一覧を取得する。
export function fetchViews(): Promise<ViewRow[]> {
  return authorizedGet<ViewRow[]>("/api/analytics/views");
}

export type TrackLike = {
  title: string;
  artist: string;
  likes: number;
};

// 自分のセットリスト横断で、曲ごとのいいね数ランキングを取得する。
export function fetchLikes(): Promise<TrackLike[]> {
  return authorizedGet<TrackLike[]>("/api/analytics/likes");
}
