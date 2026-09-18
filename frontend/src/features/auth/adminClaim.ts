/** 管理者を表す Cognito ユーザープールのグループ名（バックエンドの ADMIN_GROUP と対応）。 */
export const ADMIN_GROUP = "admin";

type AccessTokenPayload = {
  "cognito:groups"?: unknown;
};

function decodePayload(token: string): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as AccessTokenPayload;
  } catch {
    return null;
  }
}

/**
 * アクセストークンが管理者グループを含むかを判定する。
 * 画面の出し分け用で、実際のアクセス制御はサーバー側（adminMiddleware）が行う。
 */
export function hasAdminGroup(token: string | null | undefined): boolean {
  if (!token) return false;
  const groups = decodePayload(token)?.["cognito:groups"];
  return Array.isArray(groups) && groups.includes(ADMIN_GROUP);
}
