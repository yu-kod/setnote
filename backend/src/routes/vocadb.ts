import { Hono } from "hono";
import { z } from "zod/v4";
import { authMiddleware } from "../middleware/auth";
import { searchVocadbSongs } from "../services/vocadb";

// 1回の検索で返す最大件数。モーダルで一覧できる程度に抑える。
const MAX_RESULTS = 20;

const querySchema = z.object({
  q: z.string().trim().min(1),
  by: z.enum(["title", "artist"]).default("title"),
});

export const vocadbRoute = new Hono();

// VocaDB は誰でも叩ける公開 API だが、Lambda を無認証の踏み台にしないよう
// 編集画面と同じ認証を要求する。
vocadbRoute.get("/songs", authMiddleware, async (c) => {
  const parsed = querySchema.safeParse({ q: c.req.query("q"), by: c.req.query("by") });
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "q is required" } }, 400);
  }

  try {
    const songs = await searchVocadbSongs(parsed.data.q, parsed.data.by, MAX_RESULTS);
    return c.json({ songs });
  } catch {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to search VocaDB" } }, 502);
  }
});
