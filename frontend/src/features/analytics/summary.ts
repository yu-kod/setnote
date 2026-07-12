import type { TrackUsage } from "./api";

export type UsageSummary = {
  uniqueSongs: number;
  totalPlays: number;
  topSongs: TrackUsage[];
};

// 概要KPI: ユニーク曲数・総使用回数・使用回数Top3を算出する。
export function summarizeUsage(usage: TrackUsage[]): UsageSummary {
  const totalPlays = usage.reduce((sum, u) => sum + u.count, 0);
  const topSongs = [...usage].sort((a, b) => b.count - a.count).slice(0, 3);
  return { uniqueSongs: usage.length, totalPlays, topSongs };
}

