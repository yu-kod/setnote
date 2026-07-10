import { createMiddleware } from "hono/factory";

/**
 * すべてのリクエストを構造化ログ（JSON）として出力するミドルウェア。
 * 404 を含む全レスポンスが CloudWatch に残るようにし、
 * Logs Insights でクエリしやすい形式にする。
 */
export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;

  console.info(
    JSON.stringify({
      level: "info",
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    })
  );
});
