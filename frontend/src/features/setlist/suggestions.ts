import type { Setlist, Track } from "./types";

// ユーザーの過去入力トラックを集約する。
// 同一 title は updatedAt が新しいセットリストの入力を代表として残し、
// リンク等の全項目ごとコピー用に保持する。空の title は除外する。
export function collectTrackSuggestions(setlists: Setlist[]): Track[] {
  const byTitle = new Map<string, Track>();
  const sorted = [...setlists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const setlist of sorted) {
    for (const track of setlist.tracks) {
      const key = track.title.trim();
      if (!key || byTitle.has(key)) continue;
      byTitle.set(key, track);
    }
  }
  return [...byTitle.values()];
}
