// 分析用: セットリストごとの表示回数(PV)を一覧化する純粋ロジック。
// viewCount 未設定は 0 とみなし、表示回数の降順（同数は name 昇順）で並べる。

export type ViewRowInput = {
  id?: string;
  name?: string;
  viewCount?: number;
};

export type ViewRow = {
  id: string;
  name: string;
  viewCount: number;
};

export function toViewRows(setlists: ViewRowInput[]): ViewRow[] {
  return setlists
    .map((s) => ({
      id: s.id ?? "",
      name: s.name ?? "",
      viewCount: s.viewCount ?? 0,
    }))
    .sort((a, b) => b.viewCount - a.viewCount || a.name.localeCompare(b.name));
}
