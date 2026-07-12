// 分析用: セットリスト横断で曲ごとの使用回数を集計する純粋ロジック。
// 「使用回数」= その曲を含むセットリストの数（1セットリスト内で同名が複数あっても1回）。
// title は trim して集計キーにし、空 title は除外する。表示用に代表 artist を保持する。

export type TrackUsageInput = {
  tracks?: { title?: string; artist?: string }[];
};

export type TrackUsage = {
  title: string;
  artist: string;
  count: number;
};

export function aggregateTrackUsage(setlists: TrackUsageInput[]): TrackUsage[] {
  const byTitle = new Map<string, TrackUsage>();

  for (const setlist of setlists) {
    const seenInThisSetlist = new Set<string>();
    for (const track of setlist.tracks ?? []) {
      const title = (track.title ?? "").trim();
      if (!title || seenInThisSetlist.has(title)) continue;
      seenInThisSetlist.add(title);

      const existing = byTitle.get(title);
      if (existing) {
        existing.count += 1;
        if (!existing.artist && track.artist) existing.artist = track.artist;
      } else {
        byTitle.set(title, { title, artist: track.artist ?? "", count: 1 });
      }
    }
  }

  // 使用回数の降順、同数は title の昇順で安定ソート。
  return [...byTitle.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}
