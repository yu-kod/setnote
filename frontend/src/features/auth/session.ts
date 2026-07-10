// 認証セッションの localStorage キーと後始末を集約する単一情報源。
// AuthContext と API レイヤの両方から参照し、キー名の重複を防ぐ。

export const TOKEN_KEY = "setnote_access_token";
export const REFRESH_KEY = "setnote_refresh_token";
export const USER_KEY = "setnote_user";

/** 保存済みの認証情報をすべて破棄する（ログアウト相当）。 */
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/** ログイン画面へ遷移させる（トークン失効時などに使用）。 */
export function redirectToLogin(): void {
  window.location.assign("/login");
}
