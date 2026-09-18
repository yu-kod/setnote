import { createMiddleware } from "hono/factory";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || "",
  clientId: process.env.COGNITO_CLIENT_ID || "",
  tokenUse: "access",
});

type AuthEnv = {
  Variables: {
    userId: string;
    email: string;
    groups: string[];
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Authorization required" } }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifier.verify(token);
    c.set("userId", payload.sub);
    c.set("email", (payload as Record<string, string>).email ?? "");
    // cognito:groups はアクセストークンに含まれる。管理者判定（adminMiddleware）が参照する。
    const groups = (payload as Record<string, unknown>)["cognito:groups"];
    c.set("groups", Array.isArray(groups) ? (groups as string[]) : []);
    await next();
  } catch {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
  }
});
