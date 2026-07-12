import { clearSession, redirectToLogin } from "../auth/session";

export type TrackUsage = {
  title: string;
  artist: string;
  count: number;
};

function getToken(): string {
  return localStorage.getItem("setnote_access_token") ?? "";
}

// 自分のセットリスト横断の曲使用回数ランキングを取得する。
export async function fetchTrackUsage(): Promise<TrackUsage[]> {
  const res = await fetch("/api/analytics/track-usage", {
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

  return res.json() as Promise<TrackUsage[]>;
}
