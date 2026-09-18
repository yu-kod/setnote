import { Hono } from "hono";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

// YouTube Data API が返すサムネイルのキーを、解像度の高い順に並べたもの。
// 動画によって用意される解像度が異なるため、上から順に使えるものを選ぶ。
const THUMBNAIL_PREFERENCE = ["maxres", "standard", "high", "medium", "default"] as const;

type Thumbnail = { url: string };
type VideosResponse = {
  items?: { snippet?: { thumbnails?: Record<string, Thumbnail | undefined> } }[];
};

function pickThumbnailUrl(body: VideosResponse): string | null {
  const thumbnails = body.items?.[0]?.snippet?.thumbnails;
  if (!thumbnails) return null;

  for (const key of THUMBNAIL_PREFERENCE) {
    const thumbnail = thumbnails[key];
    if (thumbnail) return thumbnail.url;
  }
  return null;
}

export const proxyRoute = new Hono();

// サムネイルは img.youtube.com の直リンクではなく Data API 経由で解決する。
// YouTube API Services Developer Policies が、ドキュメント化された手段以外での
// 取得（スクレイピング）を禁じているため。
proxyRoute.get("/thumbnail", async (c) => {
  const videoId = c.req.query("videoId");
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid videoId" } }, 400);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return c.json(
      { error: { code: "CONFIGURATION_ERROR", message: "YOUTUBE_API_KEY is not configured" } },
      500
    );
  }

  let metadata: Response;
  try {
    metadata = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );
  } catch {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to reach YouTube" } }, 502);
  }

  if (!metadata.ok) {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "YouTube returned an error" } }, 502);
  }

  const thumbnailUrl = pickThumbnailUrl((await metadata.json()) as VideosResponse);
  if (!thumbnailUrl) {
    return c.json({ error: { code: "NOT_FOUND", message: "Thumbnail not available" } }, 404);
  }

  let upstream: Response;
  try {
    upstream = await fetch(thumbnailUrl);
  } catch {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to fetch thumbnail" } }, 502);
  }

  if (!upstream.ok) {
    return c.json(
      { error: { code: "UPSTREAM_ERROR", message: "Upstream returned an error" } },
      502
    );
  }

  const body = await upstream.arrayBuffer();
  return c.body(body, 200, {
    "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  });
});
