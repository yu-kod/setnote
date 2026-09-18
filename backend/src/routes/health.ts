import { Hono } from "hono";

export const healthRoute = new Hono();

// デプロイ直後のスモークテストが叩くエンドポイント。
// 認証も外部依存も持たせない（依存先が落ちていても「配信できているか」だけは判定したい）。
healthRoute.get("/", (c) => c.json({ status: "ok" }));
