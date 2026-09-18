import { Hono } from "hono";
import { z } from "zod/v4";
import { authMiddleware } from "../middleware/auth";
import { searchVocadbSongs } from "../services/vocadb";

// 1回の検索で返す最大件数。モーダルで一覧できる程度に抑える。
const MAX_RESULTS = 20;

const querySchema = z
  .object({
    title: z.string().trim().default(""),
    artist: z.string().trim().default(""),
    // 作者候補から選び直したときに、その作者へ固定するためのID。
    artistId: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .transform(Number)
      .optional(),
  })
  .refine((v) => v.title !== "" || v.artist !== "");

export const vocadbRoute = new Hono();

// VocaDB は誰でも叩ける公開 API だが、Lambda を無認証の踏み台にしないよう
// 編集画面と同じ認証を要求する。
vocadbRoute.get("/songs", authMiddleware, async (c) => {
  const parsed = querySchema.safeParse({
    title: c.req.query("title"),
    artist: c.req.query("artist"),
    artistId: c.req.query("artistId"),
  });

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "title or artist is required" } },
      400
    );
  }

  try {
    const result = await searchVocadbSongs({
      title: parsed.data.title,
      artist: parsed.data.artist,
      artistId: parsed.data.artistId ?? null,
      limit: MAX_RESULTS,
    });
    return c.json(result);
  } catch {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to search VocaDB" } }, 502);
  }
});
