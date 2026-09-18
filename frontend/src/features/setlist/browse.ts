// ダッシュボードの一覧を並べ替え・絞り込みするための純粋ロジック。
import type { Setlist } from "./types";

export type SortOrder = "updated" | "eventDate";

// 更新の新しい順。updatedAt は ISO8601 なので辞書順の比較で時系列順になる。
function byUpdatedDesc(a: Setlist, b: Setlist): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function sortSetlists(setlists: Setlist[], order: SortOrder): Setlist[] {
  if (order === "updated") {
    return [...setlists].sort(byUpdatedDesc);
  }

  // 開催日の新しい順。日付が同じ・どちらも未設定なら更新の新しい順にフォールバックし、
  // 未設定のものは日付のあるものより後ろに置く。
  return [...setlists].sort((a, b) => {
    if (a.eventDate === b.eventDate) return byUpdatedDesc(a, b);
    if (a.eventDate === null) return 1;
    if (b.eventDate === null) return -1;
    return b.eventDate.localeCompare(a.eventDate);
  });
}

// 検索用の正規化。全角・半角と大文字・小文字の差を吸収する。
function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

// セットリスト名とイベント名を対象に部分一致で絞り込む。空クエリは絞り込まない。
export function filterSetlists(setlists: Setlist[], query: string): Setlist[] {
  const needle = normalize(query.trim());
  if (!needle) return setlists;

  return setlists.filter((s) =>
    [s.name, s.eventName ?? ""].some((field) => normalize(field).includes(needle))
  );
}
