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
    await next();
  } catch {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
  }
});
