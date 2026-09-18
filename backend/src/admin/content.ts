/** setlists テーブルの項目のうち、集計に使うものだけを受け取る。 */
export type SetlistInput = {
  id?: string;
  userId?: string;
  status?: string;
  viewCount?: number;
  likeCounts?: Record<string, number>;
  tracks?: unknown[];
};

export type ContentStats = {
  setlists: number;
  published: number;
  draft: number;
  totalViews: number;
  totalLikes: number;
  totalTracks: number;
  /** セットリストを1つ以上持つユーザー数。 */
  activeUsers: number;
};

/** セットリスト全件から、管理画面に出すコンテンツ統計を組み立てる。 */
export function aggregateContent(items: SetlistInput[]): ContentStats {
  const owners = new Set<string>();
  let published = 0;
  let totalViews = 0;
  let totalLikes = 0;
  let totalTracks = 0;

  for (const item of items) {
    if (item.status === "published") published += 1;
    totalViews += item.viewCount ?? 0;
    totalTracks += item.tracks?.length ?? 0;
    for (const likes of Object.values(item.likeCounts ?? {})) {
      totalLikes += likes;
    }
    if (item.userId) owners.add(item.userId);
  }

  return {
    setlists: items.length,
    published,
    draft: items.length - published,
    totalViews,
    totalLikes,
    totalTracks,
    activeUsers: owners.size,
  };
}
