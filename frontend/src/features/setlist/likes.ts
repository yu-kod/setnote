// 未ログイン閲覧者のいいねを「セットリストごと・曲ごとに1回まで」に緩く制限する。
// サーバ側では厳密に重複防止しない方針で、localStorage による端末ローカルの記録のみ。

const storageKey = (setlistId: string) => `setnote_liked_${setlistId}`;

export function getLikedTrackIds(setlistId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(setlistId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markLiked(setlistId: string, trackId: string): void {
  const liked = getLikedTrackIds(setlistId);
  liked.add(trackId);
  try {
    localStorage.setItem(storageKey(setlistId), JSON.stringify([...liked]));
  } catch {
    // ストレージが使えなくても致命的ではないので無視する。
  }
}
