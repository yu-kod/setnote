import type { TrackUsage } from "./api";

export type UsageSummary = {
  uniqueSongs: number;
  totalPlays: number;
  topSong: TrackUsage | null;
};

// 概要KPI: ユニーク曲数・総演奏回数・最多演奏曲を算出する。
export function summarizeUsage(usage: TrackUsage[]): UsageSummary {
  const totalPlays = usage.reduce((sum, u) => sum + u.count, 0);
  const topSong = usage.reduce<TrackUsage | null>(
    (best, u) => (!best || u.count > best.count ? u : best),
    null
  );
  return { uniqueSongs: usage.length, totalPlays, topSong };
}

export type UsageBar = TrackUsage & {
  // 最多演奏曲を 1 とした相対比（棒の長さ）。
  ratio: number;
};

// Top曲の横棒グラフ用データ。演奏回数の降順で上位を取り、最大値で正規化する。
export function topBars(usage: TrackUsage[], limit = 8): UsageBar[] {
  const top = [...usage].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = top.reduce((m, u) => Math.max(m, u.count), 0);
  return top.map((u) => ({ ...u, ratio: max > 0 ? u.count / max : 0 }));
}
