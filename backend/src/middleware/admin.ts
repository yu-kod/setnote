import { createMiddleware } from "hono/factory";

/** 管理者を表す Cognito ユーザープールのグループ名。 */
export const ADMIN_GROUP = "admin";

type AdminEnv = {
  Variables: {
    groups: string[];
  };
};

/**
 * 管理者だけを通すミドルウェア。authMiddleware の後段で使う。
 * 判定はアクセストークンの cognito:groups に admin が含まれるかどうか。
 * 管理者の identity をコードや tfstate に持たせないため、グループで表現している。
 */
export const adminMiddleware = createMiddleware<AdminEnv>(async (c, next) => {
  if (!c.get("groups").includes(ADMIN_GROUP)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Admin only" } }, 403);
  }
  await next();
});
