import { authorizedGet } from "../../api/authorized";

const ERROR_MESSAGE = "分析データの取得に失敗しました";

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

// 自分のセットリスト横断の曲使用回数ランキングを取得する。
export function fetchTrackUsage(): Promise<TrackUsage[]> {
  return authorizedGet<TrackUsage[]>("/api/analytics/track-usage", ERROR_MESSAGE);
}

// 自分のセットリストごとの表示回数(PV)一覧を取得する。
export function fetchViews(): Promise<ViewRow[]> {
  return authorizedGet<ViewRow[]>("/api/analytics/views", ERROR_MESSAGE);
}

export type TrackLike = {
  title: string;
  artist: string;
  likes: number;
};

// 自分のセットリスト横断で、曲ごとのいいね数ランキングを取得する。
export function fetchLikes(): Promise<TrackLike[]> {
  return authorizedGet<TrackLike[]>("/api/analytics/likes", ERROR_MESSAGE);
}
