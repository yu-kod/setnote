import type { TrackUsage } from "./api";

export type UsageSummary = {
  uniqueSongs: number;
  totalPlays: number;
  topSong: TrackUsage | null;
};

// 概要KPI: ユニーク曲数・総使用回数・最多使用曲を算出する。
export function summarizeUsage(usage: TrackUsage[]): UsageSummary {
  const totalPlays = usage.reduce((sum, u) => sum + u.count, 0);
  const topSong = usage.reduce<TrackUsage | null>(
    (best, u) => (!best || u.count > best.count ? u : best),
    null
  );
  return { uniqueSongs: usage.length, totalPlays, topSong };
}

export type UsageBar = TrackUsage & {
  // 最多使用曲を 1 とした相対比（棒の長さ）。
  ratio: number;
};

// Top曲の横棒グラフ用データ。使用回数の降順で上位を取り、最大値で正規化する。
export function topBars(usage: TrackUsage[], limit = 8): UsageBar[] {
  const top = [...usage].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = top.reduce((m, u) => Math.max(m, u.count), 0);
  return top.map((u) => ({ ...u, ratio: max > 0 ? u.count / max : 0 }));
}

import type { TrackLike } from "./api";

export type LikeBar = TrackLike & { ratio: number };

// Top いいね曲の横棒グラフ用データ。いいね数の降順で上位を取り、最大値で正規化する。
export function topLikeBars(likes: TrackLike[], limit = 8): LikeBar[] {
  const top = [...likes].sort((a, b) => b.likes - a.likes).slice(0, limit);
  const max = top.reduce((m, l) => Math.max(m, l.likes), 0);
  return top.map((l) => ({ ...l, ratio: max > 0 ? l.likes / max : 0 }));
}
