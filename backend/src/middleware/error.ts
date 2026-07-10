import type { ErrorHandler } from "hono";

/**
 * 未捕捉エラーを構造化ログに出力し、統一フォーマットで 500 を返す。
 * app.onError() に登録して使う。
 */
export const errorHandler: ErrorHandler = (err, c) => {
  console.error(
    JSON.stringify({
      level: "error",
      method: c.req.method,
      path: c.req.path,
      message: err.message,
      stack: err.stack,
    })
  );

  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
};
