// 一覧表示かどうかは URL に持たせている（ブラウザの戻りで解除できるようにするため）。
// 公開ページの外側（サイトのヘッダーやフッター）もこの判定で出し分ける。

const PUBLIC_SETLIST_PATH = /^\/s\/[^/]+$/;

export function isListViewRoute(pathname: string, search: string): boolean {
  if (!PUBLIC_SETLIST_PATH.test(pathname)) return false;
  return new URLSearchParams(search).get("view") === "list";
}
