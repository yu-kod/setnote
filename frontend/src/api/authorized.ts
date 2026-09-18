import { TOKEN_KEY, clearSession, redirectToLogin } from "../features/auth/session";

/** HTTP ステータスを保持するエラー。呼び出し側が 403 などで分岐できるようにする。 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * アクセストークンを付けて GET する共通処理。
 * 401 のときはセッションを破棄してログイン画面へ誘導する。
 */
export async function authorizedGet<T>(path: string, errorMessage: string): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ""}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      redirectToLogin();
    }
    throw new ApiError(res.status, errorMessage);
  }

  return res.json() as Promise<T>;
}
