import { test as base, expect, type Page } from "@playwright/test";

/**
 * 画面表示の確認用フィクスチャ。
 *
 * バックエンドを立てずに済むよう API はすべてこの層で差し替える。
 * 外部への通信（Web フォント等）も遮断し、どの環境でも同じ描画になるようにする。
 */

export const TOKEN_KEY = "setnote_access_token";
export const USER_KEY = "setnote_user";

export type Track = {
  id: string;
  title: string;
  artist: string;
  songLink: string;
  source: string;
  customFields: { id: string; label: string; value: string }[];
  groupId: string | null;
};

export function buildTracks(count: number): Track[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i + 1}`,
    title: `テスト楽曲 ${i + 1} — とても長いタイトルでも折り返されること`,
    artist: `アーティスト ${i + 1}`,
    songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    source: "",
    customFields: [],
    groupId: null,
  }));
}

export function buildSetlist(trackCount: number) {
  const tracks = buildTracks(trackCount);
  return {
    id: "demo",
    userId: "u1",
    name: "真夏のオールナイトロングセット 2026",
    artistName: "DJ テストアカウント",
    eventName: "とても長いイベント名のパーティー vol.12",
    eventLink: "https://example.com/event",
    eventDate: "2026-08-15",
    tracks,
    status: "published",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    likeCounts: Object.fromEntries(tracks.map((t, i) => [t.id, i * 3])),
  };
}

// 1x1 の透明 PNG。サムネイルの実体は表示確認に不要なので最小のものを返す。
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

/** cognito:groups だけを持つ、署名を検証しない画面出し分け用のダミートークン。 */
function fakeAccessToken(groups: string[]): string {
  const payload = Buffer.from(JSON.stringify({ "cognito:groups": groups })).toString("base64url");
  return `header.${payload}.signature`;
}

export async function mockApi(page: Page, { trackCount = 12 }: { trackCount?: number } = {}) {
  const setlist = buildSetlist(trackCount);

  // glob だと dev サーバーが配信する src/api/ 配下のモジュールまで巻き込むため、
  // パス名で /api/ 配下だけを厳密に拾う。
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    (route, request) => {
      const { pathname } = new URL(request.url());
      if (pathname === "/api/proxy/thumbnail") {
        return route.fulfill({ contentType: "image/png", body: PIXEL_PNG });
      }
      if (pathname === "/api/setlists/demo") return route.fulfill({ json: setlist });
      if (pathname === "/api/setlists/mine") {
        return route.fulfill({ json: [{ ...setlist, tracks: [] }] });
      }
      if (pathname === "/api/setlists/suggestions/tracks") return route.fulfill({ json: [] });
      if (/^\/api\/setlists\/[^/]+\/tracks\/[^/]+\/like$/.test(pathname)) {
        return route.fulfill({ json: { likeCount: 1 } });
      }
      // 画面表示に関係ない計測系などは空で返す。
      return route.fulfill({ json: {} });
    }
  );
}

/** ログイン済みの状態にする。admin にするとヘッダーのメニューが最も多い状態になる。 */
export async function signIn(page: Page, { admin = false }: { admin?: boolean } = {}) {
  const token = fakeAccessToken(admin ? ["admin"] : []);
  await page.addInitScript(
    ([tokenKey, userKey, value]) => {
      localStorage.setItem(tokenKey, value);
      localStorage.setItem(userKey, JSON.stringify({ email: "dj@example.com" }));
    },
    [TOKEN_KEY, USER_KEY, token] as const
  );
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // 外部リソースはネットワーク環境に左右されるため遮断する。
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await page.route(/(youtube|ytimg)\.com/, (route) => route.abort());
    await mockApi(page);
    await use(page);
  },
});

export { expect };
